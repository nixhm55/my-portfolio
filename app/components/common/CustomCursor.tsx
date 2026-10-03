'use client';

import { useEffect, useRef, useState } from "react";

export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;

    let targetX = -100;
    let targetY = -100;
    let currentX = -100;
    let currentY = -100;
    let currentAngle = 0;
    let targetAngle = 0;
    let isVisible = false;
    let isMoving = false;
    let lastTime = performance.now();
    let rafId: number | null = null;

    const setVisibility = (show: boolean) => {
      if (isVisible !== show) {
        isVisible = show;
        if (show) {
          document.documentElement.classList.add("custom-cursor-active");
          cursor.style.opacity = '1';
          if (!rafId) {
            lastTime = performance.now();
            rafId = requestAnimationFrame(renderLoop);
          }
        } else {
          document.documentElement.classList.remove("custom-cursor-active");
          cursor.style.opacity = '0';
        }
      }
    };

    // Ultra-smooth frame-independent physics loop (60Hz & 120Hz ProMotion)
    const renderLoop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const followFactor = 1 - Math.exp(-26 * dt);
      const rotationFactor = 1 - Math.exp(-15 * dt);

      currentX += (targetX - currentX) * followFactor;
      currentY += (targetY - currentY) * followFactor;

      const deltaX = targetX - currentX;
      targetAngle = Math.min(Math.max(deltaX * 0.75, -16), 16);
      currentAngle += (targetAngle - currentAngle) * rotationFactor;

      cursor.style.transform = `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0) translate(-50%, -50%) rotate(${currentAngle.toFixed(2)}deg)`;

      const distanceRemaining = Math.hypot(targetX - currentX, targetY - currentY);

      // Sleep loop when stationary to preserve battery and CPU
      if (!isMoving && distanceRemaining < 0.1 && Math.abs(currentAngle) < 0.1) {
        rafId = null;
        return;
      }

      rafId = requestAnimationFrame(renderLoop);
    };

    let idleTimeout: ReturnType<typeof setTimeout>;

    const onMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;

      // Check if mouse is over interactive external widgets like Awwwards badge or sidebars
      const isOverExcluded = !!(target && (
        target.closest('[data-native-cursor]') ||
        target.closest('a[href*="awwwards"]') ||
        target.closest('[class*="awwward"]') ||
        target.closest('aside') ||
        target.closest('.no-custom-cursor')
      ));

      // Check if pointer is near window frame borders or Safari titlebar / Show Sidebar button
      const isNearEdge =
        e.clientY <= 18 ||
        e.clientX <= 18 ||
        e.clientX >= window.innerWidth - 20 ||
        e.clientY >= window.innerHeight - 18;

      if (isNearEdge || isOverExcluded) {
        setVisibility(false);
        return;
      }

      // Smooth initialization without jump on first movement
      if (currentX === -100) {
        currentX = e.clientX;
        currentY = e.clientY;
      }

      setVisibility(true);
      targetX = e.clientX;
      targetY = e.clientY;
      isMoving = true;

      if (!rafId) {
        lastTime = performance.now();
        rafId = requestAnimationFrame(renderLoop);
      }

      clearTimeout(idleTimeout);
      idleTimeout = setTimeout(() => {
        isMoving = false;
      }, 80);
    };

    const onMouseLeave = () => {
      setVisibility(false);
    };

    const onWindowOut = (e: MouseEvent) => {
      if (!e.relatedTarget && !(e as any).toElement) {
        setVisibility(false);
      }
    };

    const onMouseEnter = (e: MouseEvent) => {
      const isNearEdge =
        e.clientY <= 18 ||
        e.clientX <= 18 ||
        e.clientX >= window.innerWidth - 20 ||
        e.clientY >= window.innerHeight - 18;

      if (!isNearEdge) {
        setVisibility(true);
      }
    };

    // Robust dark/light mode detection
    const checkTheme = () => {
      if (typeof window === "undefined") return;

      const docEl = document.documentElement;
      const bodyEl = document.body;

      const hasDarkClass = docEl.classList.contains("dark") || bodyEl.classList.contains("dark");
      const hasLightClass = docEl.classList.contains("light") || bodyEl.classList.contains("light");

      if (hasDarkClass && !hasLightClass) {
        setIsDark(true);
        return;
      }
      if (hasLightClass && !hasDarkClass) {
        setIsDark(false);
        return;
      }

      const dataTheme = docEl.getAttribute("data-theme") || bodyEl.getAttribute("data-theme");
      if (dataTheme === "dark") {
        setIsDark(true);
        return;
      }
      if (dataTheme === "light") {
        setIsDark(false);
        return;
      }

      const bodyBg = window.getComputedStyle(bodyEl).backgroundColor;
      const docBg = window.getComputedStyle(docEl).backgroundColor;
      const bg = bodyBg && bodyBg !== "rgba(0, 0, 0, 0)" && bodyBg !== "transparent" ? bodyBg : docBg;

      if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
        const match = bg.match(/\d+/g);
        if (match && match.length >= 3) {
          const r = parseInt(match[0], 10);
          const g = parseInt(match[1], 10);
          const b = parseInt(match[2], 10);
          const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
          setIsDark(luminance < 75);
          return;
        }
      }

      setIsDark(hasDarkClass);
    };

    checkTheme();

    const onClick = () => {
      setTimeout(checkTheme, 50);
    };

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme", "style"],
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class", "data-theme", "style"],
    });

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("mouseout", onWindowOut);
    window.addEventListener("click", onClick);
    document.addEventListener("mouseleave", onMouseLeave);
    document.documentElement.addEventListener("mouseleave", onMouseLeave);
    document.addEventListener("mouseenter", onMouseEnter);
    window.addEventListener("blur", onMouseLeave);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      clearTimeout(idleTimeout);
      observer.disconnect();
      document.documentElement.classList.remove("custom-cursor-active");
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseout", onWindowOut);
      window.removeEventListener("click", onClick);
      document.removeEventListener("mouseleave", onMouseLeave);
      document.documentElement.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("mouseenter", onMouseEnter);
      window.removeEventListener("blur", onMouseLeave);
    };
  }, []);

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            /* Hide native cursor ONLY when custom cursor is actively within website canvas */
            html.custom-cursor-active,
            html.custom-cursor-active body,
            html.custom-cursor-active *:not([data-native-cursor]):not(.no-custom-cursor) {
              cursor: none !important;
            }

            /* Explicit fallback for interactive sidebars and badges */
            html.custom-cursor-active [data-native-cursor],
            html.custom-cursor-active a[href*="awwwards"],
            html.custom-cursor-active [class*="awwward"] {
              cursor: pointer !important;
            }
          `,
        }}
      />

      <div
        ref={cursorRef}
        className="fixed top-0 left-0 pointer-events-none z-[99999] opacity-0 hidden md:block"
        style={{
          width: "36px",
          height: "36px",
          willChange: "transform, opacity",
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
          transform: "translate3d(-100px, -100px, 0)",
          transition: "opacity 0.14s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Dark Mode Cursor */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/angel-cursor-dark.png"
          alt="Angel Cursor Dark"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none transition-opacity duration-200"
          style={{
            opacity: isDark ? 1 : 0,
            filter: "drop-shadow(0 0 10px rgba(255,255,255,0.9))",
          }}
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/angel-cursor.png";
          }}
        />

        {/* Light Mode Cursor */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/angel-cursor.png"
          alt="Angel Cursor Light"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none transition-opacity duration-200"
          style={{
            opacity: isDark ? 0 : 1,
            filter: "drop-shadow(0 0 8px rgba(0,0,0,0.4))",
          }}
        />
      </div>
    </>
  );
}

export default CustomCursor;
