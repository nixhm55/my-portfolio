'use client';

import { Text, useScroll } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { usePortalStore } from "@stores";
import { memo, useMemo, useRef } from "react";
import { isMobile } from "react-device-detect";
import * as THREE from 'three';
import GridTile from "./GridTile";
import Projects from "./projects";
import Work from "./work";
import WovenClothPortal from "./WovenClothPortal";

const fontProps = {
  font: "./soria-font.ttf",
  fontSize: 0.4,
  color: 'white',
};

const workPosition = new THREE.Vector3(isMobile ? -1 : -2, 0, isMobile ? 0.4 : 0);
const projectsPosition = new THREE.Vector3(isMobile ? 1 : 2, 0, 0);

const Experience = () => {
  const titleRef = useRef<THREE.Group>(null);
  const groupRef = useRef<THREE.Group>(null);
  const data = useScroll();
  const isActive = usePortalStore((state) => !!state.activePortalId);
  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;

  useFrame((_, delta) => {
    if (!data?.range) return;

    const d = data.range(0.8, 0.2);
    const e = data.range(0.7, 0.2);
    const group = groupRef.current;

    if (group && !isActiveRef.current) {
      group.position.y = d > 0 ? -1 : -30;
      group.visible = d > 0;
    }

    const title = titleRef.current;
    if (title) {
      title.children.forEach((text, i) => {
        const y = Math.max(Math.min((1 - d) * (10 - i), 10), 0.5);
        text.position.y = THREE.MathUtils.damp(text.position.y, y, 7, delta);
        /* eslint-disable  @typescript-eslint/no-explicit-any */
        (text as any).fillOpacity = e;
      });
    }
  });

  const titleLetters = useMemo(() => {
    const title = 'EXPERIENCE';
    const diff = isMobile ? 0.4 : 0.8;
    return title.split('').map((char, i) => (
      <Text key={i} {...fontProps} position={[i * diff, 2, 1]}>{char}</Text>
    ));
  }, []);

  return (
    <>
      <WovenClothPortal
        position={[0, -25.1, 4.6]}
        rotation={[-1.7453, 0, 0]}
        scale={[0.2, -0.2, 0.2]}
      />

      <group position={[0, -41.5, 12]} rotation={[-Math.PI / 2, 0, -Math.PI / 2]}>
        <group rotation={[0, 0, Math.PI / 2]}>
          <group ref={titleRef} position={[isMobile ? -1.8 : -3.6, 2, -2]}>
            {titleLetters}
          </group>

          <group position={[0, -1, 0]} ref={groupRef}>
            <GridTile title='EDUCATION'
              id="work"
              color='#b9c6d6'
              textAlign='left'
              position={workPosition}>
              <Work/>
            </GridTile>

            <GridTile title='PROJECTS'
              id="projects"
              color='#bdd1e3'
              textAlign='right'
              position={projectsPosition}>
              <Projects/>
            </GridTile>
          </group>
        </group>
      </group>
    </>
  );
};

export default memo(Experience);
