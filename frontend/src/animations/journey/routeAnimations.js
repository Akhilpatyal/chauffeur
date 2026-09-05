import { useRef } from 'react';
import { gsap, MotionPathPlugin, useGSAP, prefersReducedMotion } from './motion';

/*
 * Journey route map.
 *
 * The SVG owns one <path> and the pins are placed *from* it (see
 * JourneyRouteMap), so `stopProgress` values are exact by construction - the
 * gold stroke always ends precisely under the active pin, for any number of
 * stops. The vehicle is positioned with MotionPathPlugin.getPositionOnPath,
 * which also yields the tangent angle so it points the way it is travelling.
 *
 * Changing `activeIndex` only tweens a scalar, so scrubbing stays cheap.
 */
export function useRouteAnimation(scope, { stopProgress, activeIndex }) {
  const cache = useRef(null);
  const tween = useRef(null);

  useGSAP(
    () => {
      const root = scope.current;
      if (!root) return;

      const path = root.querySelector('[data-route-path]');
      const progressPath = root.querySelector('[data-route-progress]');
      const vehicle = root.querySelector('[data-route-vehicle]');
      if (!path || !progressPath || !vehicle) return;

      if (!cache.current) {
        const rawPath = MotionPathPlugin.getRawPath(path);
        MotionPathPlugin.cacheRawPathMeasurements(rawPath);
        const length = path.getTotalLength();

        cache.current = { rawPath, length, current: 0 };
        gsap.set(progressPath, { strokeDasharray: length, strokeDashoffset: length });
      }

      const { rawPath, length } = cache.current;
      const target = stopProgress[activeIndex] ?? 0;

      const apply = (progress) => {
        cache.current.current = progress;
        gsap.set(progressPath, { strokeDashoffset: length * (1 - progress) });

        const clamped = gsap.utils.clamp(0.0001, 0.9999, progress);
        const point = MotionPathPlugin.getPositionOnPath(rawPath, clamped, true);
        gsap.set(vehicle, {
          x: point.x,
          y: point.y,
          rotation: point.angle,
          transformOrigin: '50% 50%',
        });
      };

      if (prefersReducedMotion()) {
        apply(target);
        return;
      }

      tween.current?.kill();
      const proxy = { progress: cache.current.current };
      tween.current = gsap.to(proxy, {
        progress: target,
        duration: 1.1,
        ease: 'power2.inOut',
        onUpdate: () => apply(proxy.progress),
      });
    },
    { scope, dependencies: [activeIndex] }
  );
}

export default useRouteAnimation;
