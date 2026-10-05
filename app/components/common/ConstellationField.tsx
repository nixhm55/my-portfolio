'use client';

import { useEffect, useRef } from 'react';
import { usePortalStore } from "@stores";

export function ConstellationField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isActive = usePortalStore((state) => state.activePortalId === "projects");

  useEffect(() => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;
    const particleCount = 200;
    const speedMultiplier = 1.1;

    let originX = width / 2;
    let originY = height * 0.5;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      originX = width / 2;
      originY = height * 0.5;
    };

    class Particle {
      x: number = 0;
      y: number = 0;
      z: number = 0;
      speed: number = 0;
      color: string = '';
      length: number = 0;

      constructor() {
        this.reset();
        this.z = Math.random() * 1000;
      }

      reset() {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 600;
        this.x = Math.cos(angle) * radius;
        this.y = Math.sin(angle) * radius - 150;
        this.z = 1000;
        this.speed = (Math.random() * 2 + 1) * speedMultiplier;
        const hue = Math.random() > 0.5 ? '200, 220, 255' : '106, 157, 237';
        this.color = `rgb(${hue})`;
        this.length = Math.random() * 2 + 0.5;
      }

      update() {
        this.z -= this.speed;
        if (this.z <= 0) this.reset();
      }

      draw() {
        if (!ctx) return;

        const fov = 300;
        const scale = fov / this.z;
        const px = originX + this.x * scale;
        const py = originY + this.y * scale;

        const prevZ = this.z + this.speed * this.length;
        const prevScale = fov / prevZ;
        const prevPx = originX + this.x * prevScale;
        const prevPy = originY + this.y * prevScale;

        let opacity = 1 - this.z / 1000;
        if (this.z < 100) opacity = this.z / 100;
        if (opacity < 0) opacity = 0;

        ctx.beginPath();
        ctx.moveTo(prevPx, prevPy);
        ctx.lineTo(px, py);
        ctx.strokeStyle = this.color.replace('rgb', 'rgba').replace(')', `, ${opacity * 0.9})`);
        ctx.lineWidth = Math.max(0.25, (1 - this.z / 1000) * 0.4);
        ctx.lineCap = 'butt';
        ctx.stroke();
      }
    }

    let particles: Particle[] = [];

    const animate = () => {
      if (!ctx) return;

      // fade old frame toward transparent (keeps trails, no black layer)
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'source-over';

      particles.forEach((p) => {
        p.update();
        p.draw();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    resize();
    window.addEventListener('resize', resize);
    particles = Array.from({ length: particleCount }, () => new Particle());
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isActive]);

  if (!isActive) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 45,
      }}
    />
  );
}