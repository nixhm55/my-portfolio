'use client';

import { useEffect } from 'react';
import { cancelFrame, frame } from 'motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export function LenisProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const lenis = new Lenis({
      autoRaf: false,
      lerp: 0.09,
      smoothWheel: true,
      anchors: true,
      allowNestedScroll: true,
      stopInertiaOnNavigate: true,
      autoResize: true,
    });

    lenis.on('scroll', ScrollTrigger.update);

    const update = ({ timestamp }: { timestamp: number }) => {
      lenis.raf(timestamp);
    };

    frame.setup(update, true);

    return () => {
      cancelFrame(update);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}

export default LenisProvider;
