'use client';

import { useScroll } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { memo, useRef } from "react";
import { isMobile } from "react-device-detect";
import * as THREE from "three";

import { usePortalStore, useScrollStore } from "@stores";

const safeRange = (
  data: ReturnType<typeof useScroll> | null | undefined,
  from: number,
  distance: number
) => {
  if (!data?.range) return 0;
  return data.range(from, distance);
};

const clampDelta = (rawDelta: number) =>
  Math.min(Math.max(rawDelta, 0.001), 1 / 30);

const ScrollWrapper = ({
  children,
}: {
  children: React.ReactNode | React.ReactNode[];
}) => {
  const data = useScroll();
  const isActive = usePortalStore((state) => !!state.activePortalId);
  const setScrollProgress = useScrollStore((state) => state.setScrollProgress);
  const lastReportedOffset = useRef(-1);

  useFrame((state, delta) => {
    if (!data?.range) return;

    const dt = clampDelta(delta);
    const a = safeRange(data, 0, 0.3);
    const b = safeRange(data, 0.3, 0.5);
    const d = safeRange(data, 0.85, 0.18);

    const cam = state.camera;

    if (!isActive) {
      cam.position.x = THREE.MathUtils.damp(cam.position.x, 0, 10, dt);
      cam.rotation.x = THREE.MathUtils.damp(cam.rotation.x, -0.5 * Math.PI * a, 8, dt);
      cam.position.y = THREE.MathUtils.damp(cam.position.y, -37 * b, 10, dt);
      cam.position.z = THREE.MathUtils.damp(cam.position.z, 5 + 10 * d, 10, dt);

      const offset =
        typeof data.offset === "number" ? data.offset : safeRange(data, 0, 1);
      if (Math.abs(offset - lastReportedOffset.current) > 0.0005) {
        lastReportedOffset.current = offset;
        setScrollProgress(offset);
      }
    }

    if (!isMobile) {
      const targetRotationY = !isActive ? -(state.pointer.x * Math.PI) / 90 : 0;
      cam.rotation.y = THREE.MathUtils.damp(cam.rotation.y, targetRotationY, 6.5, dt);
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
