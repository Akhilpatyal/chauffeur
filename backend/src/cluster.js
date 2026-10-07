import cluster from 'node:cluster';
import os from 'node:os';
import process from 'node:process';

/*
 * Multi-core entry point.
 *
 * A Node process uses one core. On a 12-core box that means a single server
 * leaves roughly 90% of the machine idle while requests queue behind the one
 * busy event loop — which is exactly what the load tests showed: throughput
 * flat around 500 req/s while eleven cores did nothing.
 *
 * Clustering is only safe because the API holds no state in memory:
 *   - rate limiting counts live in Redis, not per process
 *   - the content cache lives in Redis
 *   - sessions are JWTs plus a database-backed refresh token
 *   - jobs go to BullMQ, not an in-process queue
 *
 * The one exception is the feature-flag cache in services/flags.js, which is
 * per process with a five second TTL. Worst case a flag change takes five
 * seconds longer to reach one worker, which is within the tolerance that
 * mechanism was designed for.
 *
 * On a container platform, prefer running more containers and leave this
 * alone — the orchestrator should own restarts and scaling. This exists for
 * single-VM deployments.
 *
 *   node src/cluster.js          all cores
 *   WEB_CONCURRENCY=4 node src/cluster.js
 */
const requested = Number(process.env.WEB_CONCURRENCY);
const workers = Number.isInteger(requested) && requested > 0
  ? requested
  : Math.max(1, os.cpus().length - 1); /* leave one core for the OS and Redis */

if (cluster.isPrimary) {
  console.log(`[cluster] primary ${process.pid} starting ${workers} workers`);

  for (let i = 0; i < workers; i += 1) cluster.fork();

  let shuttingDown = false;

  cluster.on('exit', (worker, code, signal) => {
    if (shuttingDown) return;
    /*
     * A worker that dies while we are still serving is replaced. Without this
     * a slow memory leak or one unhandled rejection quietly reduces capacity
     * until the last worker goes and the site is down.
     */
    console.error(`[cluster] worker ${worker.process.pid} exited (${signal || code}), replacing`);
    cluster.fork();
  });

  /* Forward shutdown to the workers so each finishes its in-flight requests
   * through the graceful shutdown already in server.js. */
  for (const signal of ['SIGTERM', 'SIGINT']) {
    process.on(signal, () => {
      shuttingDown = true;
      console.log(`[cluster] ${signal} received, draining workers`);
      for (const worker of Object.values(cluster.workers ?? {})) worker.kill(signal);
    });
  }
} else {
  await import('./server.js');
}
