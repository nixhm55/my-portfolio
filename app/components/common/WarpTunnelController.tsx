'use client';

import { useScroll } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";

export function WarpTunnelController() {
  const data = useScroll();
  const overlayRef = useRef<HTMLElement | null>(null);
  const wasVisibleRef = useRef(false);
  const lastOpacityRef = useRef(-1);

  useFrame(() => {
    if (!overlayRef.current) {
      overlayRef.current = document.getElementById("warp-field-overlay");
    }
    const overlay = overlayRef.current;
    if (!overlay || !data?.curve) return;

    const curve = data.curve(0.35, 0.30);

    if (curve > 0.01) {
      const nextOpacity = Math.round(curve * 0.6 * 1000) / 1000;
      if (nextOpacity !== lastOpacityRef.current) {
        lastOpacityRef.current = nextOpacity;
        overlay.style.opacity = String(nextOpacity);
      }
      if (!wasVisibleRef.current) {
        wasVisibleRef.current = true;
        overlay.style.visibility = "visible";
      }
    } else if (wasVisibleRef.current || lastOpacityRef.current !== 0) {
      wasVisibleRef.current = false;
      lastOpacityRef.current = 0;
      overlay.style.opacity = "0";
      overlay.style.visibility = "hidden";
    }
  });

  return null;
}
