'use client';

import { useScroll } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { memo, useRef } from "react";
import { isMobile } from "react-device-detect";
import * as THREE from "three";

import { usePortalStore, useScrollStore } from "@stores";

const safeRange = (data: ReturnType<typeof useScroll> | null | undefined, from: number, distance: number) => {
  if (!data?.range) return 0;
  return data.range(from, distance);
};

const ScrollWrapper = ({ children }: { children: React.ReactNode | React.ReactNode[] }) => {
  const { camera } = useThree();
  const data = useScroll();
  const isActive = usePortalStore((state) => !!state.activePortalId);
  const setScrollProgress = useScrollStore((state) => state.setScrollProgress);
  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;

  useFrame((state, delta) => {
    if (!data?.range) return;

    const a = safeRange(data, 0, 0.3);
    const b = safeRange(data, 0.3, 0.5);
    const d = safeRange(data, 0.85, 0.18);

    if (!isActiveRef.current) {
      // 🚨 FIX: ബാക്ക് അടിക്കുമ്പോൾ ക്യാമറ കൃത്യമായി X ആക്സിസിന്റെ സെന്ററിലേക്ക് (0) വരാൻ
      camera.position.x = THREE.MathUtils.damp(camera.position.x, 0, 10, delta);
      
      camera.rotation.x = THREE.MathUtils.damp(camera.rotation.x, -0.5 * Math.PI * a, 8, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, -37 * b, 10, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, 5 + 10 * d, 10, delta);

      const offset = typeof data.offset === "number" ? data.offset : safeRange(data, 0, 1);
      setScrollProgress(offset);
    }

    if (!isMobile) {
      // മൗസ് അനുസരിച്ച് വർക്ക് ചെയ്യാനും, പോർട്ടലിൽ കയറുമ്പോൾ നേരെ നിൽക്കാനും
      const targetRotationY = !isActiveRef.current ? -(state.pointer.x * Math.PI) / 90 : 0;
      
      camera.rotation.y = THREE.MathUtils.lerp(
        camera.rotation.y,
        targetRotationY,
        0.05
      );
    }
  });

  const items = Array.isArray(children) ? children : [children];

  return (
    <>
      {items.map((child, index) => (
        <group key={index}>{child}</group>
      ))}
    </>
  );
};

export default memo(ScrollWrapper);
