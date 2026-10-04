'use client';

import { useEffect, useRef } from "react";
import { createWarpFieldRenderer, WARP_FIELD_DEFAULTS, type WarpFieldOptions } from "./warpFieldRenderer";

export type WarpFieldBackgroundProps = Partial<WarpFieldOptions> & {
  className?: string;
};

export function WarpFieldBackground({ className = "", ...props }: WarpFieldBackgroundProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const optionsRef = useRef({ ...WARP_FIELD_DEFAULTS, variant: "hyperspace" as const, ...props });
  optionsRef.current = { ...WARP_FIELD_DEFAULTS, variant: "hyperspace" as const, ...props };

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return undefined;

    const renderer = createWarpFieldRenderer(canvas, () => optionsRef.current);
    let frame = 0;
    let visible = true;
    let overlayActive = false;

    const overlay = host.parentElement;

    const isOverlayActive = () => {
      if (!overlay) return true;
      return overlay.style.visibility !== "hidden" && overlay.style.opacity !== "0";
    };

    const resize = () => {
      const bounds = host.getBoundingClientRect();
      renderer.resize(bounds.width, bounds.height);
      if (isOverlayActive()) renderer.render();
    };

    const tick = () => {
      overlayActive = isOverlayActive();
      if (overlayActive) renderer.render();
      frame = visible && !document.hidden && overlayActive ? requestAnimationFrame(tick) : 0;
    };

    const startLoop = () => {
      if (!frame && visible && !document.hidden && isOverlayActive()) {
        frame = requestAnimationFrame(tick);
      }
    };

    const resizeObserver = new ResizeObserver(resize);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      if (visible) startLoop();
      if (!visible && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    });

    const mutation = overlay
      ? new MutationObserver(() => {
          if (isOverlayActive()) startLoop();
        })
      : null;
    mutation?.observe(overlay as Node, { attributes: true, attributeFilter: ["style"] });

    resizeObserver.observe(host);
    intersection.observe(host);
    resize();
    startLoop();

    return () => {
      if (frame) cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersection.disconnect();
      mutation?.disconnect();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={hostRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
      className={`warp-field-canvas-container ${className}`}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          display: "block",
          width: "100%",
          height: "100%",
          filter: `hue-rotate(${optionsRef.current.hue}deg) saturate(${optionsRef.current.saturation}) brightness(${optionsRef.current.brightness})`,
        }}
      />
    </div>
  );
}
