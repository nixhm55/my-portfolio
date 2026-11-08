'use client';

import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { CustomCursor } from '../components/common/CustomCursor';

interface PortfolioItem {
  id: number;
  label: string;
  url: string;
  coverImage?: string;
}

export const PORTFOLIO_ITEMS: PortfolioItem[] = [
  { id: 1, label: 'PORT 1', url: 'https://port1-blond-five.vercel.app' },
  { id: 2, label: 'PORT 2', url: 'https://port2-amber-three.vercel.app' },
  { id: 3, label: 'PORT 3', url: 'https://port3-mauve.vercel.app' },
  { id: 4, label: 'PORT 4', url: 'https://port4-sigma-ten.vercel.app' },
  { id: 5, label: 'PORT 5', url: 'https://port5-brown.vercel.app' },
  {
    id: 6,
    label: 'PORT 6',
    url: 'https://port6-b5028jdsw-nixhm.vercel.app',
    coverImage: '/portfolios/port6.svg',
  },
  { id: 7, label: 'PORT 7', url: 'https://port7-mu.vercel.app' },
  {
    id: 8,
    label: 'PORT 8',
    url: 'https://port8-topaz.vercel.app',
    coverImage: '/portfolios/port8.png',
  },
  { id: 9, label: 'PORT 9', url: 'https://port9-phi.vercel.app' },
  { id: 10, label: 'PORT 10', url: 'https://port10-chi.vercel.app' },
  {
    id: 11,
    label: 'PORT 11',
    url: 'https://port11-six.vercel.app',
    coverImage: '/portfolios/port11.png',
  },
  { id: 12, label: 'PORT 12', url: 'https://port12-lyart.vercel.app' },
];

const STARRY_NIGHT_URLS = [
  'https://upload.wikimedia.org/wikipedia/commons/6/66/VanGogh-starry_night_ballance1.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1280px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/960px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
];

const IFRAME_BASE_WIDTH = 1440;
const IFRAME_BASE_HEIGHT = 900;

interface PortfolioCardProps {
  item: PortfolioItem;
  scale: number;
}

const PortfolioCard = memo(({ item, scale }: PortfolioCardProps) => {
  const [imgError, setImgError] = useState(false);
  const hasStaticCover = Boolean(item.coverImage && !imgError);

  return (
    <div
      className="relative"
      style={{
        width: 'var(--card-w)',
        height: 'var(--card-h)',
      }}
    >
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={item.label}
        className="group absolute inset-0 z-10 transform-gpu overflow-hidden rounded-[14px] border border-white/25 bg-[#090a0f] shadow-[0_10px_32px_rgba(0,0,0,0.75)] transition-[inset,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[inset] hover:z-30 hover:inset-[calc(-1*var(--card-gap))] hover:border-white/75 hover:shadow-[0_16px_48px_rgba(0,0,0,0.92)]"
      >
        <div className="relative h-full w-full overflow-hidden bg-[#0a0b10]">
          {hasStaticCover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.coverImage}
              alt={item.label}
              decoding="async"
              onError={() => setImgError(true)}
              className="h-full w-full transform-gpu object-cover object-top opacity-35 brightness-75 transition-[transform,opacity,filter] duration-300 ease-out group-hover:scale-[1.03] group-hover:opacity-100 group-hover:brightness-100"
            />
          ) : (
            <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-35 brightness-75 transition-[transform,opacity,filter] duration-300 ease-out group-hover:scale-[1.03] group-hover:opacity-100 group-hover:brightness-100">
              <iframe
                src={item.url}
                title={item.label}
                tabIndex={-1}
                loading="eager"
                scrolling="no"
                className="pointer-events-none absolute top-0 left-0 border-0 bg-[#0a0b10]"
                style={{
                  width: `${IFRAME_BASE_WIDTH}px`,
                  height: `${IFRAME_BASE_HEIGHT}px`,
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left',
                }}
              />
            </div>
          )}

          {/* Dark overlay that lifts smoothly on hover */}
          <div className="pointer-events-none absolute inset-0 z-20 bg-black/55 transition-opacity duration-300 ease-out group-hover:opacity-0" />

          {/* Corner label in Soria font that vanishes on hover */}
          <span
            style={{ fontFamily: 'var(--font-soria), Georgia, serif' }}
            className="pointer-events-none absolute bottom-2.5 left-3.5 z-30 text-[1.5rem] leading-none tracking-wide text-white/95 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] transition-opacity duration-200 ease-out group-hover:opacity-0 sm:text-[1.75rem]"
          >
            {item.label}
          </span>
        </div>
      </a>
    </div>
  );
});

PortfolioCard.displayName = 'PortfolioCard';

export default function PortfoliosPage() {
  const gridRef = useRef<HTMLDivElement>(null);
  const bgLayerRef = useRef<HTMLDivElement>(null);
  const [verifiedBgUrl, setVerifiedBgUrl] = useState<string>(STARRY_NIGHT_URLS[0]);
  const [cardScale, setCardScale] = useState(0.185);

  const count = PORTFOLIO_ITEMS.length;

  const { columns, cardW, cardH } = useMemo(() => {
    if (count <= 12) {
      return {
        columns: 4,
        cardW: 'clamp(175px, 14vw, 245px)',
        cardH: 'clamp(86px, 6.8vw, 120px)',
      };
    }
    if (count <= 20) {
      return {
        columns: 5,
        cardW: 'clamp(155px, 12.5vw, 215px)',
        cardH: 'clamp(76px, 6vw, 105px)',
      };
    }
    if (count <= 30) {
      return {
        columns: 6,
        cardW: 'clamp(140px, 11vw, 190px)',
        cardH: 'clamp(68px, 5.3vw, 92px)',
      };
    }
    return {
      columns: 8,
      cardW: 'clamp(120px, 9.5vw, 165px)',
      cardH: 'clamp(58px, 4.6vw, 80px)',
    };
  }, [count]);

  useEffect(() => {
    let cancelled = false;

    const tryLoadUrl = (idx: number) => {
      if (cancelled || idx >= STARRY_NIGHT_URLS.length) return;
      const img = new window.Image();
      img.referrerPolicy = 'no-referrer';
      img.onload = () => {
        if (!cancelled && img.naturalWidth > 0) {
          setVerifiedBgUrl(STARRY_NIGHT_URLS[idx]);
        }
      };
      img.onerror = () => {
        if (!cancelled) {
          tryLoadUrl(idx + 1);
        }
      };
      img.src = STARRY_NIGHT_URLS[idx];
    };

    tryLoadUrl(0);

    return () => {
      cancelled = true;
    };
  }, []);

  // Smooth cursor parallax for The Starry Night background
  useEffect(() => {
    const bgEl = bgLayerRef.current;
    if (!bgEl) return;

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let rafId: number | null = null;
    let lastTime = performance.now();

    const maxShiftX = 28;
    const maxShiftY = 18;

    const animate = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const factor = 1 - Math.exp(-8 * dt);
      currentX += (targetX - currentX) * factor;
      currentY += (targetY - currentY) * factor;

      bgEl.style.transform = `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0) scale(1.14)`;

      if (
        Math.abs(targetX - currentX) > 0.05 ||
        Math.abs(targetY - currentY) > 0.05
      ) {
        rafId = requestAnimationFrame(animate);
      } else {
        rafId = null;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const normX = (e.clientX / window.innerWidth - 0.5) * 2;
      const normY = (e.clientY / window.innerHeight - 0.5) * 2;
      targetX = normX * maxShiftX;
      targetY = normY * maxShiftY;

      if (!rafId) {
        lastTime = performance.now();
        rafId = requestAnimationFrame(animate);
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  // Compute iframe scale from the EXPANDED hover dimensions (width + 24px, height + 24px)
  // so that when any card expands on hover by 10px on each side, the real homepage
  // fills 100% of the hovered box edge-to-edge with zero black gap on the right.
  useEffect(() => {
    const gridEl = gridRef.current;
    if (!gridEl) return;

    const updateScale = () => {
      const firstCell = gridEl.firstElementChild as HTMLElement | null;
      if (!firstCell) return;
      const rect = firstCell.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const expandedWidth = rect.width + 24;
        const expandedHeight = rect.height + 24;
        const scaleX = expandedWidth / IFRAME_BASE_WIDTH;
        const scaleY = expandedHeight / IFRAME_BASE_HEIGHT;
        setCardScale(Math.max(scaleX, scaleY));
      }
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(gridEl);
    return () => observer.disconnect();
  }, [columns]);

  return (
    <main
      style={
        {
          '--card-gap': '10px',
          '--card-w': cardW,
          '--card-h': cardH,
        } as React.CSSProperties
      }
      className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-[#060b19] p-4 select-none"
    >
      <CustomCursor />

      {/* Expanded, cursor-reactive, subtly dimmed Vincent van Gogh - The Starry Night background */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div
          ref={bgLayerRef}
          className="relative h-full w-full transform-gpu will-change-transform"
          style={{
            transform: 'translate3d(0px, 0px, 0) scale(1.14)',
            background:
              'radial-gradient(circle at 86% 20%, rgba(247,214,90,0.45) 0%, transparent 18%), radial-gradient(circle at 45% 40%, rgba(110,156,219,0.35) 0%, transparent 32%), linear-gradient(180deg, #0b1536 0%, #162d66 45%, #1f4587 75%, #0e1b38 100%)',
          }}
        >
          <div
            className="absolute inset-0 bg-cover bg-center brightness-[0.62] contrast-[1.08] saturate-[1.06]"
            style={{
              backgroundImage: `url("${verifiedBgUrl}")`,
            }}
          />
        </div>
        {/* Subtle dim layer so the 12 portfolio boxes stand out clearly in the foreground */}
        <div className="absolute inset-0 bg-black/42" />
      </div>

      {/* Portfolio Boxes Grid */}
      <div
        ref={gridRef}
        className="relative z-10"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, var(--card-w))`,
          gap: 'var(--card-gap)',
        }}
      >
        {PORTFOLIO_ITEMS.map((item) => (
          <PortfolioCard
            key={item.id}
            item={item}
            scale={cardScale}
          />
        ))}
      </div>
    </main>
  );
}
