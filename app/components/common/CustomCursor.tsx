'use client';

import { useEffect, useState } from "react";

export function CustomCursor() {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [isMounted, setIsMounted] = useState(false);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    setIsMounted(true);
    
    const style = document.createElement('style');
    style.innerHTML = `*, *::before, *::after { cursor: none !important; }`;
    document.head.appendChild(style);

    const updateCursor = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    const checkBackground = () => {
      if (typeof window === 'undefined') return;
      const bg = window.getComputedStyle(document.body).backgroundColor;
      if (bg) {
        const match = bg.match(/\d+/g);
        if (match && match.length >= 3) {
          const r = parseInt(match[0]);
          const g = parseInt(match[1]);
          const b = parseInt(match[2]);
          const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
          setIsDark(luminance < 60);
        }
      }
    };

    checkBackground();
    const interval = setInterval(checkBackground, 300);

    window.addEventListener("mousemove", updateCursor);
    
    return () => {
      style.remove();
      clearInterval(interval);
      window.removeEventListener("mousemove", updateCursor);
    };
  }, []);

  if (!isMounted) return null;

  const cursorImg = isDark ? "/angel-cursor-dark.png" : "/angel-cursor.png";

  return (
    <div
      style={{
        position: "fixed",
        left: `${position.x}px`,
        top: `${position.y}px`,
        pointerEvents: "none",
        zIndex: 99999,
        transform: "translate(-50%, -50%)",
      }}
      className="hidden md:block"
    >
      <img
        src={cursorImg}
        alt="Cursor"
        style={{
          width: "36px",
          height: "36px",
          objectFit: "contain",
          filter: isDark 
            ? "drop-shadow(0 0 10px rgba(255,255,255,0.9))" 
            : "drop-shadow(0 0 8px rgba(0,0,0,0.4))",
        }}
        onError={(e) => {
          (e.target as HTMLImageElement).src = "/angel-cursor.png";
        }}
      />
    </div>
  );
}
