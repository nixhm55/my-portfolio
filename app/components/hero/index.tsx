'use client';

import { Text, useProgress } from "@react-three/drei";
import gsap from "gsap";
import { memo, useEffect, useRef } from "react";
import * as THREE from "three";
import CloudContainer from "../models/Cloud";
import StarsContainer from "../models/Stars";
import WindowModel from "../models/WindowModel";
import TextWindow from "./TextWindow";

const fontProps = {
  font: "./soria-font.ttf",
  fontSize: 1.2,
};

const Hero = () => {
  const titleRef = useRef<THREE.Mesh>(null);
  const progress = useProgress((state) => state.progress) ?? 0;
  const animatedRef = useRef(false);

  useEffect(() => {
    if (progress !== 100 || !titleRef.current || animatedRef.current) return;
    animatedRef.current = true;
    gsap.fromTo(titleRef.current.position, {
      y: -10,
      duration: 1,
    }, {
      y: 0,
      duration: 3
    });
  }, [progress]);

  return (
    <>
      <Text position={[0, 2, -10]} {...fontProps} ref={titleRef}>Hi, I am Mohammed Nisam.</Text>
      <StarsContainer />
      <CloudContainer/>
      <group position={[0, -25, 5.69]}>
        <pointLight castShadow position={[1, 1, -2.5]} intensity={60} distance={10}/>
        <WindowModel receiveShadow/>
        <TextWindow/>
      </group>
    </>
  );
};

export default memo(Hero);
