'use client';

import { useScroll } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";

export function WarpTunnelController() {
  const data = useScroll();
  const overlayRef = useRef<HTMLElement | null>(null);

  useFrame(() => {
    if (!overlayRef.current) {
      overlayRef.current = document.getElementById("warp-field-overlay");
    }
    const overlay = overlayRef.current;
    if (!overlay || !data?.curve) return;

    const curve = data.curve(0.35, 0.30);

    if (curve > 0.01) {
      overlay.style.opacity = String(curve * 0.6);
      overlay.style.visibility = "visible";
    } else {
      overlay.style.opacity = "0";
      overlay.style.visibility = "hidden";
    }
  });

  return null;
}
