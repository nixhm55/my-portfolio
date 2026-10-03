"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/* -------------------------------------------------------------------------- */
/* Tunable constants                                                          */
/* -------------------------------------------------------------------------- */

/** Width of the right gutter (between the frame border and the screen edge). */
const DEFAULT_GUTTER_WIDTH = 14;

/** Rope thickness in px. */
const ROPE_WIDTH = 4;

/** Time without scroll movement before scrolling state resets. */
const STOP_DELAY_MS = 140;

/** Smoothing rates (higher = snappier). Used with exponential damping. */
const PROGRESS_SMOOTHING = 16;
const VELOCITY_SMOOTHING = 10;

/* -------------------------------------------------------------------------- */
/* Static assets                                                              */
/* -------------------------------------------------------------------------- */

/** Native scrollbars are hidden in every engine. */
const HIDE_SCROLLBAR_CSS = `
html, body, * {
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}
html::-webkit-scrollbar,
body::-webkit-scrollbar,
*::-webkit-scrollbar {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
  background: transparent !important;
}
`;

/** Tileable 4x6 chevron pattern that reads as a braided / plaited cord. */
const BRAID_SVG = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="6" viewBox="0 0 4 6">',
  '<g fill="none" stroke-linecap="butt">',
  '<g stroke="#4A2E12" stroke-opacity="0.55" stroke-width="0.9">',
  '<path d="M0 0L2 3L4 0"/>',
  '<path d="M0 3L2 6L4 3"/>',
  "</g>",
  '<g stroke="#E8D3A8" stroke-opacity="0.5" stroke-width="0.6">',
  '<path d="M0 -1.5L2 1.5L4 -1.5"/>',
  '<path d="M0 1.5L2 4.5L4 1.5"/>',
  '<path d="M0 4.5L2 7.5L4 4.5"/>',
  "</g>",
  "</g>",
  "</svg>",
].join("");

const ROPE_BACKGROUND = [
  `url("data:image/svg+xml,${encodeURIComponent(BRAID_SVG)}")`,
  "linear-gradient(90deg, #7B5630 0%, #C5A880 28%, #B59469 52%, #9E7345 78%, #6A4825 100%)",
].join(", ");

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const round2 = (value: number) => Math.round(value * 100) / 100;

function getRootScroller(): HTMLElement {
  return (
    (document.scrollingElement as HTMLElement | null) ?? document.documentElement
  );
}

function readProgress(element: HTMLElement): number {
  const range = element.scrollHeight - element.clientHeight;
  if (range <= 1) return 0;
  return clamp(element.scrollTop / range, 0, 1);
}

function isViewportSizedScroller(element: HTMLElement): boolean {
  if (element.scrollHeight - element.clientHeight <= 1) return false;
  const rect = element.getBoundingClientRect();
  return (
    rect.height >= window.innerHeight * 0.9 &&
    rect.width >= window.innerWidth * 0.9
  );
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

interface RopeAngelScrollProps {
  /** Width in px of the gutter the rope is centered in. Defaults to 14. */
  gutterWidth?: number;
  /** Optional CSS selector of a scroll container. Leave empty to auto-detect. */
  scrollerSelector?: string;
}

export function RopeAngelScroll({
  gutterWidth = DEFAULT_GUTTER_WIDTH,
  scrollerSelector,
}: RopeAngelScrollProps = {}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const ropeRef = useRef<HTMLDivElement>(null);
  const tasselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    const rope = ropeRef.current;
    const tassel = tasselRef.current;
    if (!track || !rope || !tassel) return;

    const getExplicitScroller = (): HTMLElement | null =>
      scrollerSelector
        ? document.querySelector<HTMLElement>(scrollerSelector)
        : null;

    /* ------------------------------ state ------------------------------ */

    let scroller: HTMLElement = getExplicitScroller() ?? getRootScroller();
    let trackHeight = track.clientHeight || window.innerHeight;

    let targetProgress = readProgress(scroller);
    let progress = targetProgress;

    let lastTop = scroller.scrollTop;
    let deltaAccum = 0;
    let velocity = 0;
    let scrolling = false;

    let stopTimer = 0;
    let lastSyncTime = 0;
    let lastSignature = "";
    let revealed = false;

    /* ----------------------------- rendering ---------------------------- */

    const render = () => {
      const travel = trackHeight;
      const minLength = 22;
      // Scales seamlessly from top: 0 all the way to bottom: 0 with absolute zero gap
      const ropeLength = Math.max(minLength, minLength + progress * (travel - minLength));
      const feed = progress * travel;

      const signature = [
        round2(ropeLength),
        round2(feed),
      ].join("|");
      if (signature === lastSignature) return;
      lastSignature = signature;

      rope.style.transform = "translate3d(0, 0, 0)";
      rope.style.height = `${round2(ropeLength)}px`;
      rope.style.backgroundPositionY = `calc(100% + ${round2(feed)}px), 0px`;
      rope.style.visibility = "visible";
      tassel.style.opacity = "1";
    };

    /* ------------------------------- ticker ----------------------------- */

    const tick = (time: number, deltaMs: number) => {
      const dt = clamp(deltaMs, 1, 50) / 1000;

      if (time - lastSyncTime > 0.5) {
        lastSyncTime = time;
        const explicit = getExplicitScroller();
        if (explicit && explicit !== scroller) scroller = explicit;
        targetProgress = readProgress(scroller);
      }

      progress +=
        (targetProgress - progress) * (1 - Math.exp(-dt * PROGRESS_SMOOTHING));
      if (Math.abs(targetProgress - progress) < 0.0002) {
        progress = targetProgress;
      }

      const instantVelocity = Math.abs(deltaAccum) / dt;
      deltaAccum = 0;
      velocity +=
        (instantVelocity - velocity) * (1 - Math.exp(-dt * VELOCITY_SMOOTHING));

      render();

      if (!revealed) {
        revealed = true;
        track.style.opacity = "1";
      }
    };

    /* ------------------------------ scrolling --------------------------- */

    const onStop = () => {
      scrolling = false;
      velocity = 0;
      deltaAccum = 0;
    };

    const onScroll = (event: Event) => {
      const explicit = getExplicitScroller();
      let next: HTMLElement | null = null;

      if (explicit) {
        if (event.target === explicit) next = explicit;
      } else if (event.target === document) {
        next = getRootScroller();
      } else if (event.target instanceof HTMLElement) {
        if (event.target === scroller || isViewportSizedScroller(event.target)) {
          next = event.target;
        }
      }
      if (!next) return;

      if (next !== scroller) {
        scroller = next;
        lastTop = next.scrollTop;
      }

      const top = scroller.scrollTop;
      const range = scroller.scrollHeight - scroller.clientHeight;
      const delta = top - lastTop;
      lastTop = top;

      targetProgress = readProgress(scroller);

      const overscroll = top < -1 || top > range + 1;
      if (delta === 0 || overscroll) return;

      deltaAccum += delta;
      scrolling = true;

      window.clearTimeout(stopTimer);
      stopTimer = window.setTimeout(onStop, STOP_DELAY_MS);
    };

    const syncProgress = () => {
      targetProgress = readProgress(scroller);
    };

    /* ------------------------------ wiring ------------------------------ */

    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", syncProgress);
    window.addEventListener("load", syncProgress);
    ScrollTrigger.addEventListener("refresh", syncProgress);

    const resizeObserver = new ResizeObserver(() => {
      trackHeight = track.clientHeight || window.innerHeight;
      syncProgress();
    });
    resizeObserver.observe(track);
    resizeObserver.observe(document.documentElement);

    gsap.ticker.add(tick);

    return () => {
      gsap.ticker.remove(tick);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", syncProgress);
      window.removeEventListener("load", syncProgress);
      ScrollTrigger.removeEventListener("refresh", syncProgress);
      resizeObserver.disconnect();
      window.clearTimeout(stopTimer);
    };
  }, [scrollerSelector]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: HIDE_SCROLLBAR_CSS }} />

      {/* Track: lives in the gutter between the frame border and the screen edge */}
      <div
        ref={trackRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-y-0 right-0 z-[9999] select-none opacity-0 transition-opacity duration-500"
        style={{ width: gutterWidth }}
      >
        {/* Braided sandalwood rope flush at top: 0 with zero gap */}
        <div
          ref={ropeRef}
          className="absolute top-0 will-change-transform"
          style={{
            left: `calc(50% - ${ROPE_WIDTH / 2}px)`,
            width: ROPE_WIDTH,
            height: 0,
            visibility: "hidden",
            zIndex: 1,
            borderRadius: "0 0 2px 2px",
            backgroundImage: ROPE_BACKGROUND,
            backgroundSize: "100% 6px, 100% 100%",
            backgroundRepeat: "repeat-y, no-repeat",
            backgroundPositionY: "0px, 0px",
            boxShadow: "0 0 1.5px rgba(40, 24, 8, 0.35)",
          }}
        >
          {/* Frayed knot / tassel mounted at the moving bottom tip of the rope */}
          <div
            ref={tasselRef}
            className="absolute"
            style={{
              left: "50%",
              bottom: 0,
              width: 14,
              height: 18,
              marginLeft: -7,
              transform: "rotate(180deg)",
              transformOrigin: "center center",
            }}
          >
            <svg
              width="14"
              height="18"
              viewBox="0 0 14 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient
                  id="rope-angel-knot-gradient"
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="1"
                >
                  <stop offset="0" stopColor="#D9BC8F" />
                  <stop offset="0.55" stopColor="#B59469" />
                  <stop offset="1" stopColor="#8A6238" />
                </linearGradient>
              </defs>
              <g stroke="#B59469" strokeWidth="0.7" strokeLinecap="round">
                <path d="M7 9.5C6.4 6.5 3.4 4 2 0.8" />
                <path d="M7 9.5C6.8 6.5 5.1 4 4.6 0.4" />
                <path d="M7 9.5C7 6.5 7.2 3.5 7 0" />
                <path d="M7 9.5C7.2 6.5 8.9 4 9.5 0.5" />
                <path d="M7 9.5C7.6 6.5 10.7 4 12 1" />
              </g>
              <g stroke="#9E7345" strokeWidth="0.45" strokeLinecap="round">
                <path d="M6.6 9.5C5.8 7 4 5.5 3.2 2.5" />
                <path d="M7.4 9.5C8.2 7 10 5.5 10.8 2.6" />
              </g>
              <ellipse
                cx="7"
                cy="11.5"
                rx="3.4"
                ry="3"
                fill="url(#rope-angel-knot-gradient)"
                stroke="#6E4C28"
                strokeWidth="0.6"
              />
              <path
                d="M3.9 10.5Q7 12.1 10.1 10.5"
                stroke="#6E4C28"
                strokeWidth="0.5"
                strokeLinecap="round"
              />
              <path
                d="M3.9 12.6Q7 14.2 10.1 12.6"
                stroke="#6E4C28"
                strokeWidth="0.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </>
  );
}

export default RopeAngelScroll;
