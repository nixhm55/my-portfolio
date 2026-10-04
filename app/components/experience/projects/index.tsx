import { useScroll } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import gsap from "gsap";
import { memo, useEffect, useMemo } from "react";
import { isMobile } from "react-device-detect";
import * as THREE from "three";
import { usePortalStore } from "@stores";
import { Wanderer } from "../../models/Wanderer";
import ProjectsCarousel from "./ProjectsCarousel";
import { TouchPanControls } from "./TouchPanControls";

const wandererRotation = new THREE.Euler(0, Math.PI / 6, 0);
const wandererScale = new THREE.Vector3(1.5, 1.5, 1.5);
const wandererPosition = new THREE.Vector3(0, -1, -1);

const Projects = () => {
  const { camera } = useThree();
  const isActive = usePortalStore((state) => state.activePortalId === "projects");
  const data = useScroll();

  useEffect(() => {
    const el = data?.el;
    if (el) {
      el.style.overflow = isActive ? "hidden" : "auto";
    }

    if (isActive) {
      if (isMobile) {
        gsap.to(camera.position, { z: 11.5, y: -39, x: 1, duration: 1 });
      } else {
        gsap.to(camera.position, { y: -39, x: 2, duration: 1 });
      }
    }

    return () => {
      gsap.killTweensOf(camera.position);
      if (el) el.style.overflow = "auto";
    };
  }, [isActive, camera, data]);

  useFrame((state, delta) => {
    if (!isActive || isMobile) return;
    camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, -(state.pointer.x * Math.PI) / 4, 0.03);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, 11.5 - state.pointer.y, 7, delta);
  });

  const wanderer = useMemo(() => (
    <Wanderer rotation={wandererRotation} scale={wandererScale} position={wandererPosition} />
  ), []);

  return (
    <group>
      {wanderer}
      <ProjectsCarousel />
      {isActive && isMobile && <TouchPanControls />}
    </group>
  );
};

export default memo(Projects);
