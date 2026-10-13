#!/usr/bin/env node
/*
 * Proves the email configuration works, before a customer's enquiry is the
 * thing that discovers it does not.
 *
 *   npm run check:email                  # verify the connection and credentials
 *   npm run check:email -- you@example.com   # also send one real message
 *
 * The two steps are separate deliberately. `verify()` opens the connection and
 * authenticates without sending anything, which is the check you want in a
 * deploy script. Actually sending is the only way to know the message is
 * accepted and arrives, so it takes an explicit address — a script that mails
 * somebody as a side effect of being run is a script nobody runs twice.
 */
import { env } from '../src/config/env.js';
import { sendEmail, verifyEmailTransport } from '../src/services/mailer.js';

const recipient = process.argv[2];

/* Never printed: the App Password, the API key, or anything else that would
 * end up in a terminal scrollback or a CI log. Only whether they are set. */
function describeConfig() {
  console.log(`provider : ${env.EMAIL_PROVIDER}`);
  console.log(`from     : ${env.EMAIL_FROM}`);
  console.log(`reply-to : ${env.EMAIL_REPLY_TO}`);

  if (env.EMAIL_PROVIDER === 'smtp') {
    console.log(`host     : ${env.SMTP_HOST}:${env.SMTP_PORT} (${env.SMTP_SECURE ? 'implicit TLS' : 'STARTTLS'})`);
    console.log(`user     : ${env.SMTP_USER || '(not set)'}`);
    console.log(`password : ${env.SMTP_PASSWORD ? 'set' : '(not set)'}`);
  } else if (env.EMAIL_PROVIDER !== 'console') {
    console.log(`api key  : ${env.EMAIL_API_KEY ? 'set' : '(not set)'}`);
  }

  const alerts = env.LEAD_ALERT_EMAILS ?? [];
  console.log(`alerts to: ${alerts.length > 0 ? alerts.join(', ') : '(nobody — lead alerts will be skipped)'}`);
  console.log('');
}

async function main() {
  describeConfig();

  const result = await verifyEmailTransport();
  if (result.verifiable) {
    console.log(`connection and credentials OK (${result.host}:${result.port})`);
  } else {
    console.log(`provider "${result.provider}" has no connection to verify.`);
    if (result.provider === 'console') {
      console.log('Nothing will actually be delivered — set EMAIL_PROVIDER before going live.');
    } else {
      console.log('Its credentials are only checked when a message is sent, so pass an address.');
    }
  }

  if (!recipient) {
    console.log('\nPass an address to send one real test message:');
    console.log('  npm run check:email -- you@example.com');
    return;
  }

  console.log(`\nsending to ${recipient}…`);
  const sent = await sendEmail({
    to: recipient,
    subject: 'Taifer: email configuration test',
    html:
      '<p>This is a test from the Taifer API.</p>' +
      `<p>Provider: <strong>${env.EMAIL_PROVIDER}</strong>. ` +
      'If you are reading this, lead alerts and newsletter confirmations will reach people.</p>',
  });

  if (sent.skipped) {
    console.log('skipped: no recipients resolved.');
  } else {
    console.log(`sent. message id: ${sent.messageId}`);
    /* Said explicitly, because "sent" and "arrived" are different claims and
     * the spam folder is where the difference usually lives. */
    console.log('Check the inbox — and the spam folder, which is where mail sent');
    console.log('without SPF and DKIM for your domain tends to land.');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`\nFAILED: ${error.message}`);
    if (error.name === 'EmailError' && error.retryable === false) {
      console.error('This is a configuration problem, not a transient one — retrying will not help.');
    }
    if (/invalid login|username and password not accepted|BadCredentials/i.test(error.message)) {
      console.error('');
      console.error('With Gmail this is almost always the account password being used instead of');
      console.error('an App Password. Google refuses plain password auth for SMTP: turn on 2-step');
      console.error('verification, create an App Password, and use that as SMTP_PASSWORD.');
    }
    process.exit(1);
  });
