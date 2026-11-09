"use client";

import { useEffect } from "react";

export function MotionSheryEffects() {
  useEffect(() => {
    const button = document.querySelector<HTMLElement>("[data-shery-magnet]");
    const icon = button?.querySelector<HTMLElement>("[data-motion-icon]");
    if (!button) return;

    let disposed = false;
    let stopHover: () => void = () => {};
    let stopMagnet: () => void = () => {};

    const setup = async () => {
      const motion = await import("motion");
      if (disposed) return;

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (icon && !reduceMotion) {
        stopHover = motion.hover(button, () => {
          const animation = motion.animate(
            icon,
            { rotate: [0, 22], scale: [1, 1.08] },
            { type: "spring", stiffness: 320, damping: 20 }
          );
          return () => animation.stop();
        });
      }

      if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches || reduceMotion) return;

      let frameId = 0;
      let targetX = 0;
      let targetY = 0;
      let currentX = 0;
      let currentY = 0;

      const animateMagnet = () => {
        currentX += (targetX - currentX) * 0.2;
        currentY += (targetY - currentY) * 0.2;
        button.style.transform = `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0)`;

        if (Math.abs(targetX - currentX) < 0.08 && Math.abs(targetY - currentY) < 0.08) {
          currentX = targetX;
          currentY = targetY;
          button.style.transform = `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0)`;
          frameId = 0;
          return;
        }

        frameId = window.requestAnimationFrame(animateMagnet);
      };

      const scheduleAnimation = () => {
        if (!frameId) frameId = window.requestAnimationFrame(animateMagnet);
      };

      const onPointerMove = (event: PointerEvent) => {
        const bounds = button.getBoundingClientRect();
        targetX = (event.clientX - bounds.left - bounds.width / 2) * 0.18;
        targetY = (event.clientY - bounds.top - bounds.height / 2) * 0.18;
        scheduleAnimation();
      };

      const onPointerLeave = () => {
        targetX = 0;
        targetY = 0;
        scheduleAnimation();
      };

      button.addEventListener("pointermove", onPointerMove, { passive: true });
      button.addEventListener("pointerleave", onPointerLeave, { passive: true });
      stopMagnet = () => {
        button.removeEventListener("pointermove", onPointerMove);
        button.removeEventListener("pointerleave", onPointerLeave);
        if (frameId) window.cancelAnimationFrame(frameId);
        button.style.removeProperty("transform");
      };
    };

    void setup().catch((error: unknown) => {
      console.info("Optional hover effects could not initialize.", error);
    });

    return () => {
      disposed = true;
      stopHover();
      stopMagnet();
    };
  }, []);

  return null;
}
