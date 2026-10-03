'use client';

import { useScroll } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";

export function WarpTunnelController() {
  const data = useScroll();

  useFrame(() => {
    const overlay = document.getElementById("warp-field-overlay");
    if (!overlay) return;

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
