'use client';

import { ScrollControls } from '@react-three/drei';
import { usePortalStore, useScrollStore } from '@stores';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Memory } from '../../models/Memory';
import Timeline from './Timeline';

const Work = () => {
  const isActive = usePortalStore((state) => state.activePortalId === 'work');
  const { scrollProgress, setScrollProgress } = useScrollStore();
  const progressRef = useRef(0);

  useEffect(() => {
    if (!isActive) {
      progressRef.current = 0;
      setScrollProgress(0);
      return;
    }

    progressRef.current = 0;
    setScrollProgress(0);

    // Direct wheel and trackpad listener for Education timeline scroll
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Smooth step increment (tune 0.00075 for faster or slower scroll)
      const delta = e.deltaY * 0.00075;
      progressRef.current = Math.min(Math.max(progressRef.current + delta, 0), 1);
      setScrollProgress(progressRef.current);
    };

    // Touch support for mobile devices
    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touchY = e.touches[0].clientY;
      const delta = (touchStartY - touchY) * 0.002;
      touchStartY = touchY;
      progressRef.current = Math.min(Math.max(progressRef.current + delta, 0), 1);
      setScrollProgress(progressRef.current);
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isActive, setScrollProgress]);

  return (
    <group>
      <mesh receiveShadow>
        <planeGeometry args={[4, 4, 1]} />
        <shadowMaterial opacity={0.1} />
      </mesh>
      <ScrollControls style={{ zIndex: -1 }} pages={2} maxSpeed={0.4}>
        <Memory scale={new THREE.Vector3(5, 5, 5)} position={new THREE.Vector3(0, -6, 1)} />
        <Timeline progress={isActive ? scrollProgress : 0} />
      </ScrollControls>
    </group>
  );
};

export default Work;
