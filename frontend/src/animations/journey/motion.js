import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { useGSAP } from '@gsap/react';

/* Registered once for the whole journey page; repeat calls are no-ops in GSAP */
gsap.registerPlugin(useGSAP, ScrollTrigger, MotionPathPlugin);

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export { gsap, ScrollTrigger, MotionPathPlugin, useGSAP };
