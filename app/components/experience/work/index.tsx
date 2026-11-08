'use client';

import { ScrollControls } from '@react-three/drei';
import { usePortalStore, useScrollStore } from '@stores';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Memory } from '../../models/Memory';
import Timeline from './Timeline';

const Work = () => {
  const isActive = usePortalStore((state) => state.activePortalId === 'work');
  const scrollProgress = useScrollStore((state) => state.scrollProgress);
  const setScrollProgress = useScrollStore((state) => state.setScrollProgress);
  const progressRef = useRef(0);

  useEffect(() => {
    if (!isActive) {
      progressRef.current = 0;
      setScrollProgress(0);
      return;
    }

    progressRef.current = 0;
    setScrollProgress(0);

    let raf = 0;
    const flushProgress = () => {
      raf = 0;
      setScrollProgress(progressRef.current);
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const delta = e.deltaY * 0.00075;
      progressRef.current = Math.min(Math.max(progressRef.current + delta, 0), 1);
      if (!raf) raf = requestAnimationFrame(flushProgress);
    };

    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touchY = e.touches[0].clientY;
      const delta = (touchStartY - touchY) * 0.002;
      touchStartY = touchY;
      progressRef.current = Math.min(Math.max(progressRef.current + delta, 0), 1);
      if (!raf) raf = requestAnimationFrame(flushProgress);
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isActive, setScrollProgress]);

  const memoryScale = useMemo(() => new THREE.Vector3(5, 5, 5), []);
  const memoryPosition = useMemo(() => new THREE.Vector3(0, -6, 1), []);

  return (
    <group>
      <mesh receiveShadow>
        <planeGeometry args={[4, 4, 1]} />
        <shadowMaterial opacity={0.1} />
      </mesh>
      <ScrollControls style={{ zIndex: -1 }} pages={2} maxSpeed={0.4}>
        <Memory scale={memoryScale} position={memoryPosition} />
        <Timeline progress={isActive ? scrollProgress : 0} />
      </ScrollControls>
    </group>
  );
};

export default Work;
