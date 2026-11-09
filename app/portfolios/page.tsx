'use client';

import React, { memo, useEffect, useRef, useState } from 'react';
import { CustomCursor } from '../components/common/CustomCursor';

export interface PortfolioItem {
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
const IFRAME_LOAD_STAGGER_MS = 100;

type ArtPlacementVariant =
  | 'tree-hang'
  | 'tree-rest'
  | 'sky-float'
  | 'ground-laid';

interface ArtPlacement {
  id: number;
  variant: ArtPlacementVariant;
  left: string;
  top: string;
  ropeLength?: number;
  ropeAngle?: number;
  baseTransform: string;
}

const ART_PLACEMENTS: Record<number, ArtPlacement> = {
  // 1. Hanging on a rope pinned directly onto the upper Cypress tree trunk
  1: {
    id: 1,
    variant: 'tree-hang',
    left: '17.6%',
    top: '33%',
    ropeLength: 76,
    ropeAngle: 0,
    baseTransform: 'rotate(-4deg)',
  },
  // 2. Hanging on a rope pinned directly onto the middle Cypress tree trunk
  2: {
    id: 2,
    variant: 'tree-hang',
    left: '20.2%',
    top: '50%',
    ropeLength: 74,
    ropeAngle: -3,
    baseTransform: 'rotate(4deg)',
  },
  // 3. Lowered and resting on the left-lower Cypress tree bough
  3: {
    id: 3,
    variant: 'tree-rest',
    left: '15%',
    top: '67%',
    baseTransform: 'rotate(-7deg) skewX(-5deg)',
  },
  // 4. Lowered and resting at the lower-right base of the Cypress tree
  4: {
    id: 4,
    variant: 'tree-rest',
    left: '23.8%',
    top: '82%',
    baseTransform: 'rotate(6deg) skewX(4deg)',
  },
  // 5. Left-center sky swirl, tilted/skewed rectangle like PORT 12
  5: {
    id: 5,
    variant: 'sky-float',
    left: '36.5%',
    top: '41%',
    baseTransform: 'rotate(-6deg) skewX(-5deg)',
  },
  // 6. Upper-right sky swirl, tilted/skewed rectangle like PORT 12
  6: {
    id: 6,
    variant: 'sky-float',
    left: '78.5%',
    top: '29%',
    baseTransform: 'rotate(6deg) skewX(5deg)',
  },
  // 7. Center-left lower swirl, tilted/skewed rectangle staggered lower
  7: {
    id: 7,
    variant: 'sky-float',
    left: '43.5%',
    top: '65%',
    baseTransform: 'rotate(5deg) skewX(4deg)',
  },
  // 8. Center-right swirl, shifted higher up so cards are organically staggered
  8: {
    id: 8,
    variant: 'sky-float',
    left: '63.5%',
    top: '52.5%',
    baseTransform: 'rotate(-6deg) skewX(-5deg)',
  },
  // 9. Outer-right hills/sky, tilted/skewed rectangle staggered to the right
  9: {
    id: 9,
    variant: 'sky-float',
    left: '84%',
    top: '63%',
    baseTransform: 'rotate(7deg) skewX(5deg)',
  },
  // 10. Whole card laid tilted on the lower-left ground
  10: {
    id: 10,
    variant: 'ground-laid',
    left: '45%',
    top: '85.5%',
    baseTransform: 'perspective(580px) rotateX(38deg) rotateZ(-12deg)',
  },
  // 11. Whole card laid tilted on the lower-right ground
  11: {
    id: 11,
    variant: 'ground-laid',
    left: '68%',
    top: '85.5%',
    baseTransform: 'perspective(580px) rotateX(40deg) rotateZ(-14deg)',
  },
  // 12. Placed high up in the swirling central sky
  12: {
    id: 12,
    variant: 'sky-float',
    left: '56%',
    top: '22%',
    baseTransform: 'rotate(-7deg) skewX(-5deg)',
  },
};

interface PortfolioCardProps {
  item: PortfolioItem;
  placement: ArtPlacement;
  scale: number;
}

const PortfolioCard = memo(({ item, placement, scale }: PortfolioCardProps) => {
  const [imgError, setImgError] = useState(false);
  const [iframeReady, setIframeReady] = useState(false);
  const hasStaticCover = Boolean(item.coverImage && !imgError);

  useEffect(() => {
    if (hasStaticCover) return;

    const timeoutId = window.setTimeout(
      () => setIframeReady(true),
      (item.id - 1) * IFRAME_LOAD_STAGGER_MS,
    );
    return () => window.clearTimeout(timeoutId);
  }, [hasStaticCover, item.id]);

  const isHanging = placement.variant === 'tree-hang';
  const isGroundLaid = placement.variant === 'ground-laid';

  return (
    <div
      style={
        {
          left: placement.left,
          top: placement.top,
          width: 'var(--card-w)',
          height: 'var(--card-h)',
          '--base-transform': placement.baseTransform,
          '--base-radius': '14px',
        } as React.CSSProperties
      }
      className="art-card-slot group absolute z-10 -translate-x-1/2 -translate-y-1/2 hover:z-50"
    >
      {/* Hanging Rope pinned directly onto the front of the Cypress Tree */}
      {isHanging && placement.ropeLength && (
        <div
          className="pointer-events-none absolute left-1/2 -z-10 origin-bottom -translate-x-1/2 transition-opacity duration-300 group-hover:opacity-40"
          style={{
            bottom: '94%',
            height: `${placement.ropeLength}px`,
            width: '56px',
            transform: `rotate(${placement.ropeAngle || 0}deg)`,
          }}
        >
          <svg
            viewBox="0 0 56 100"
            preserveAspectRatio="none"
            className="h-full w-full overflow-visible"
          >
            {/* Pin fixed directly into the Cypress tree trunk */}
            <circle
              cx="28"
              cy="4"
              r="4.5"
              fill="#2b1b0e"
              stroke="#d8ab70"
              strokeWidth="1.6"
            />
            {/* Main braided hemp rope */}
            <path
              d="M28 6 L28 74"
              fill="none"
              stroke="#c4975c"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeDasharray="4 2"
            />
            {/* Harness strings holding the portfolio card */}
            <path
              d="M28 74 L10 99 M28 74 L46 99"
              fill="none"
              stroke="#a87c44"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <circle cx="28" cy="74" r="3" fill="#d8ab70" />
          </svg>
        </div>
      )}

      {/* Subtle ground shadow for cards laid on the terrain */}
      {isGroundLaid && (
        <div className="pointer-events-none absolute -bottom-2.5 left-1/2 -z-10 h-5 w-[104%] -translate-x-1/2 rounded-full bg-black/70 blur-md transition-opacity duration-300 group-hover:opacity-0" />
      )}

      {/* Main interactive portfolio card */}
      <div className="art-card-inner relative h-full w-full transform-gpu transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={item.label}
          className="art-card-link absolute inset-0 z-10 block transform-gpu overflow-hidden border border-white/35 bg-[#090a0f] shadow-[0_14px_34px_rgba(0,0,0,0.82)] transition-[border-radius,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:border-white/90 group-hover:shadow-[0_20px_54px_rgba(0,0,0,0.95)]"
        >
          <div className="relative h-full w-full overflow-hidden bg-[#0a0b10]">
            {hasStaticCover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.coverImage}
                alt={item.label}
                decoding="async"
                loading="lazy"
                onError={() => setImgError(true)}
                className="h-full w-full transform-gpu object-cover object-top opacity-78 brightness-95 transition-[transform,opacity,filter] duration-300 ease-out group-hover:scale-[1.03] group-hover:opacity-100 group-hover:brightness-100"
              />
            ) : (
              <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-78 brightness-95 transition-[transform,opacity,filter] duration-300 ease-out group-hover:scale-[1.03] group-hover:opacity-100 group-hover:brightness-100">
                <iframe
                  src={iframeReady ? item.url : undefined}
                  title={item.label}
                  tabIndex={-1}
                  loading="lazy"
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

            {/* Subtle lighting glaze */}
            <div
              className="pointer-events-none absolute inset-0 z-20 transition-opacity duration-300 ease-out group-hover:opacity-0"
              style={{
                background:
                  'linear-gradient(180deg, rgba(10, 16, 36, 0.24) 0%, rgba(5, 8, 20, 0.44) 100%)',
              }}
            />

            {/* Corner label in Soria font that vanishes on hover */}
            <span
              style={{ fontFamily: 'var(--font-soria), Georgia, serif' }}
              className="pointer-events-none absolute bottom-2 left-3 z-30 text-[1.25rem] leading-none tracking-wide text-white/95 drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] [text-shadow:0_2px_10px_rgba(0,0,0,0.95),0_1px_3px_rgba(0,0,0,1)] transition-opacity duration-200 ease-out group-hover:opacity-0 sm:text-[1.45rem]"
            >
              {item.label}
            </span>
          </div>
        </a>
      </div>
    </div>
  );
});

PortfolioCard.displayName = 'PortfolioCard';

export default function PortfoliosPage() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const [verifiedBgUrl, setVerifiedBgUrl] = useState<string>(
    STARRY_NIGHT_URLS[0]
  );
  const [cardScale, setCardScale] = useState(0.16);

  const cardW = 'clamp(145px, 12vw, 210px)';
  const cardH = 'clamp(78px, 6vw, 108px)';

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

  // Unified cursor parallax for both the Starry Night painting and the anchored cards
  // so the hanging rope pins stay 100% locked onto the Cypress tree when moving the cursor.
  useEffect(() => {
    const sceneEl = sceneRef.current;
    if (!sceneEl) return;

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let rafId: number | null = null;
    let lastTime = performance.now();

    const maxShiftX = 20;
    const maxShiftY = 14;

    const animate = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const factor = 1 - Math.exp(-8 * dt);
      currentX += (targetX - currentX) * factor;
      currentY += (targetY - currentY) * factor;

      sceneEl.style.transform = `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0)`;

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

  // Compute iframe scale once on mount and on window resize
  useEffect(() => {
    const updateScale = () => {
      const vw = window.innerWidth;
      const estimatedW = Math.min(Math.max(vw * 0.12, 145), 210) * 1.2;
      const estimatedH = Math.min(Math.max(vw * 0.06, 78), 108) * 1.2;
      const scaleX = estimatedW / IFRAME_BASE_WIDTH;
      const scaleY = estimatedH / IFRAME_BASE_HEIGHT;
      setCardScale(Math.max(scaleX, scaleY));
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  return (
    <main
      style={
        {
          '--card-w': cardW,
          '--card-h': cardH,
        } as React.CSSProperties
      }
      className="relative h-screen w-screen overflow-hidden bg-[#07112b] select-none"
    >
      <CustomCursor />

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .art-card-inner {
              transform: var(--base-transform);
            }
            .art-card-slot:hover .art-card-inner {
              transform: translate3d(0, -6px, 0) scale(1.2) rotate(0deg);
            }
            .art-card-link {
              border-radius: var(--base-radius);
            }
            .art-card-slot:hover .art-card-link {
              border-radius: 14px;
            }
          `,
        }}
      />

      {/* Unified Parallax Scene: Painting + Portfolio Cards move 1:1 together */}
      <div
        ref={sceneRef}
        className="relative h-full w-full transform-gpu will-change-transform"
      >
        {/* Slightly oversized painting buffer so edges never show during cursor parallax */}
        <div
          className="pointer-events-none absolute -inset-8 z-0 bg-cover bg-center brightness-[0.98] contrast-[1.08] saturate-[1.18]"
          style={{
            backgroundImage: `url("${verifiedBgUrl}")`,
          }}
        />

        {/* Static Art Stage locked to the painting coordinate space */}
        <div className="relative z-10 h-full w-full">
          {PORTFOLIO_ITEMS.map((item) => {
            const placement = ART_PLACEMENTS[item.id] || ART_PLACEMENTS[1];
            return (
              <PortfolioCard
                key={item.id}
                item={item}
                placement={placement}
                scale={cardScale}
              />
            );
          })}
        </div>
      </div>
    </main>
  );
}
