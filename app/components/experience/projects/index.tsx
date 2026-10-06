'use client';

import { useScroll } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import gsap from "gsap";
import { memo, useEffect, useMemo, useRef } from "react";
import { isMobile } from "react-device-detect";
import * as THREE from "three";
import { usePortalStore } from "@stores";
import { Wanderer } from "../../models/Wanderer";
import ProjectsCarousel from "./ProjectsCarousel";
import ProjectsStarfield from "./ProjectsStarfield";
import { TouchPanControls } from "./TouchPanControls";

const wandererRotation = new THREE.Euler(0, Math.PI / 6, 0);
const wandererScale = new THREE.Vector3(1.5, 1.5, 1.5);
const wandererPosition = new THREE.Vector3(0, -1, -1);

const CAMERA_Z = 11.5;

const Projects = () => {
  const { camera } = useThree();
  const isActive = usePortalStore((state) => state.activePortalId === "projects");
  const data = useScroll();
  const cameraTweenRef = useRef<gsap.core.Tween | null>(null);
  const scrollElementRef = useRef<HTMLElement | null>(null);

  // Sync the imperative scroll container into a ref so effects mutate a ref
  // value rather than the value returned by `useScroll()`.
  useEffect(() => {
    scrollElementRef.current = data?.el ?? null;
  }, [data]);

  useEffect(() => {
    const el = scrollElementRef.current;
    if (el) {
      el.style.overflow = isActive ? "hidden" : "auto";
    }

    if (isActive) {
      cameraTweenRef.current?.kill();
      cameraTweenRef.current = isMobile
        ? gsap.to(camera.position, { z: CAMERA_Z, y: -39, x: 1, duration: 1 })
        : gsap.to(camera.position, { y: -39, x: 2, duration: 1 });
    }

    return () => {
      // Only kill the tween we started — `gsap.killTweensOf(camera.position)`
      // would also cancel the portal's own exit transition.
      cameraTweenRef.current?.kill();
      cameraTweenRef.current = null;
      if (el) el.style.overflow = "auto";
    };
  }, [isActive, camera, data]);

  useFrame((state, delta) => {
    if (!isActive || isMobile) return;
    const cam = state.camera;
    cam.rotation.y = THREE.MathUtils.lerp(cam.rotation.y, -(state.pointer.x * Math.PI) / 4, 0.03);
    cam.position.z = THREE.MathUtils.damp(cam.position.z, CAMERA_Z - state.pointer.y, 7, delta);
  });

  const wanderer = useMemo(() => (
    <Wanderer rotation={wandererRotation} scale={wandererScale} position={wandererPosition} />
  ), []);

  return (
    <group>
      <ProjectsStarfield active={isActive} />
      {wanderer}
      <ProjectsCarousel />
      {isActive && isMobile && <TouchPanControls />}
    </group>
  );
};

export default memo(Projects);
