"use client";

/**
 * RopeAngelScroll
 * ---------------------------------------------------------------------------
 * A custom scroll progress indicator that replaces the native scrollbar.
 *
 * - A slender braided sandalwood rope hangs from the top of the viewport and
 *   ends in the hands of a small angel anchored at the bottom of the track.
 * - While the page scrolls down, the top of the rope retracts downwards into the
 *   angel's grip. At progress = 1 the rope length is exactly 0px.
 * - The braid texture streams downwards while the rope is pulled.
 * - The angel heaves down and leans while scrolling, then recoils back to its
 *   upright resting pose with an elastic bounce once scrolling stops.
 *
 * Mount it once (for example inside CanvasLoader or the root layout):
 *   <RopeAngelScroll />
 *
 * Notes:
 * - Works with window scrolling and with container scrolling. Scroll events
 *   are captured on `window`, so a full-screen scroll container is detected
 *   automatically. Pass `scrollerSelector` to force a specific container.
 * - No `wheel` listeners are used. Scroll events only record state; every DOM
 *   write happens in a single GSAP ticker callback with time-based smoothing,
 *   so nothing shakes on macOS trackpads.
 * - Uses a plain <img>, which is correct for `output: 'export'`.
 */

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

/** Angel size in px (w-11 h-11). */
const ANGEL_SIZE = 44;

/** Distance between the angel and the bottom edge of the viewport. */
const ANGEL_BOTTOM = 4;

/**
 * Vertical position of the angel's hands inside angel.png,
 * as a fraction of the image height (0 = top edge, 1 = bottom edge).
 * Adjust this single value if the rope does not meet the hands exactly.
 */
const GRIP_Y_RATIO = 0.45;

/** How far the rope bottom tucks under the angel so no gap is ever visible. */
const ROPE_OVERLAP = 3;

/** Pull pose limits. */
const PULL_MIN = 8;
const PULL_MAX = 14;
const LEAN_MIN = -12;
const LEAN_MAX = -18;
const STRETCH_LIGHT = 1.04;
const STRETCH_MAX = 1.08;

/** Small, gentle pose used while scrolling back up (the rope is being released). */
const RELEASE_Y = -2;
const RELEASE_LEAN = 5;
const RELEASE_STRETCH = 0.985;

/** Scroll speed (px/s) at which the pull reaches its maximum. */
const VELOCITY_FOR_MAX_PULL = 1600;

/** Time without scroll movement before the angel recoils. */
const STOP_DELAY_MS = 140;

/** Smoothing rates (higher = snappier). Used with exponential damping. */
const PROGRESS_SMOOTHING = 16;
const VELOCITY_SMOOTHING = 10;
const POSE_FOLLOW = 10;

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

/**
 * A container only counts as "the page scroller" when it covers (almost) the
 * whole viewport. This keeps small scrollable widgets and modals from hijacking
 * the rope.
 */
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
  const angelRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    const rope = ropeRef.current;
    const tassel = tasselRef.current;
    const angel = angelRef.current;
    if (!track || !rope || !tassel || !angel) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const getExplicitScroller = (): HTMLElement | null =>
      scrollerSelector
        ? document.querySelector<HTMLElement>(scrollerSelector)
        : null;

    /* ------------------------------ state ------------------------------ */

    let scroller: HTMLElement = getExplicitScroller() ?? getRootScroller();
    let trackHeight = track.clientHeight || window.innerHeight;

    let targetProgress = readProgress(scroller); // raw value from scroll position
    let progress = targetProgress; // smoothed value used for rendering

    let lastTop = scroller.scrollTop;
    let deltaAccum = 0; // px scrolled since the previous tick
    let velocity = 0; // smoothed scroll speed in px/s
    let direction = 1; // 1 = scrolling down, -1 = scrolling up
    let scrolling = false;

    let stopTimer = 0;
    let lastSyncTime = 0;
    let lastSignature = "";
    let revealed = false;
    let recoil: gsap.core.Tween | null = null;

    // Pose of the angel. Animated by the ticker while scrolling and by a
    // GSAP elastic tween while recoiling.
    const pose = { y: 0, lean: 0, stretch: 1 };

    /* ----------------------------- rendering ---------------------------- */

    const render = () => {
      // Distance from the top of the track to the hands while the angel rests.
      const gripRest = Math.max(
        0,
        trackHeight - ANGEL_BOTTOM - ANGEL_SIZE * (1 - GRIP_Y_RATIO)
      );

      // Total distance the rope top travels. It includes PULL_MAX so the rope
      // length is exactly 0 at progress = 1, even in the middle of a pull.
      const travel = gripRest + ROPE_OVERLAP + PULL_MAX;

      const ropeTop = progress * travel;
      const ropeBottom = gripRest + ROPE_OVERLAP + pose.y; // follows the hands
      const ropeLength = Math.max(0, ropeBottom - ropeTop);

      // The braid is anchored to the rope bottom and fed downwards in step
      // with the retraction, as if it were sliding through the grip.
      const feed = progress * travel;

      const signature = [
        round2(ropeTop),
        round2(ropeLength),
        round2(feed),
        round2(pose.y),
        round2(pose.lean),
        Math.round(pose.stretch * 1000),
      ].join("|");
      if (signature === lastSignature) return;
      lastSignature = signature;

      rope.style.transform = `translate3d(0, ${round2(ropeTop)}px, 0)`;
      rope.style.height = `${round2(ropeLength)}px`;
      rope.style.backgroundPositionY = `calc(100% + ${round2(feed)}px), 0px`;
      rope.style.visibility = ropeLength > 0.4 ? "visible" : "hidden";
      tassel.style.opacity = String(clamp(ropeLength / 18, 0, 1));

      angel.style.transform =
        `translate3d(0, ${round2(pose.y)}px, 0) ` +
        `rotate(${round2(pose.lean)}deg) ` +
        `scaleY(${pose.stretch.toFixed(4)})`;
    };

    /* ------------------------------- ticker ----------------------------- */

    const tick = (time: number, deltaMs: number) => {
      const dt = clamp(deltaMs, 1, 50) / 1000;

      // Layout can change without any scroll event (lazy content, pin spacers),
      // so re-read the progress a couple of times per second.
      if (time - lastSyncTime > 0.5) {
        lastSyncTime = time;
        const explicit = getExplicitScroller();
        if (explicit && explicit !== scroller) scroller = explicit;
        targetProgress = readProgress(scroller);
      }

      // Time-based exponential smoothing: identical feel at 60 / 120 Hz.
      progress +=
        (targetProgress - progress) * (1 - Math.exp(-dt * PROGRESS_SMOOTHING));
      if (Math.abs(targetProgress - progress) < 0.0002) {
        progress = targetProgress;
      }

      const instantVelocity = Math.abs(deltaAccum) / dt;
      deltaAccum = 0;
      velocity +=
        (instantVelocity - velocity) * (1 - Math.exp(-dt * VELOCITY_SMOOTHING));

      if (scrolling && !reduceMotion) {
        const intensity = clamp(velocity / VELOCITY_FOR_MAX_PULL, 0, 1);
        const pulling = direction > 0;

        const targetY = pulling
          ? PULL_MIN + (PULL_MAX - PULL_MIN) * intensity
          : RELEASE_Y;
        const targetLean = pulling
          ? LEAN_MIN + (LEAN_MAX - LEAN_MIN) * intensity
          : RELEASE_LEAN;
        const targetStretch = pulling
          ? STRETCH_LIGHT + (STRETCH_MAX - STRETCH_LIGHT) * intensity
          : RELEASE_STRETCH;

        const follow = 1 - Math.exp(-dt * POSE_FOLLOW);
        pose.y += (targetY - pose.y) * follow;
        pose.lean += (targetLean - pose.lean) * follow;
        pose.stretch += (targetStretch - pose.stretch) * follow;
      }

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
      if (reduceMotion) return;

      recoil?.kill();
      recoil = gsap.to(pose, {
        y: 0,
        lean: 0,
        stretch: 1,
        duration: 1.3,
        ease: "elastic.out(1, 0.5)",
        overwrite: true,
      });
    };

    const onScroll = (event: Event) => {
      // Capture-phase listener on window: catches window AND container scrolls.
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

      // Ignore no-op events and rubber-band overscroll (macOS / iOS).
      const overscroll = top < -1 || top > range + 1;
      if (delta === 0 || overscroll) return;

      direction = delta > 0 ? 1 : -1;
      deltaAccum += delta;
      scrolling = true;

      if (recoil) {
        recoil.kill();
        recoil = null;
      }

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
      recoil?.kill();
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
        {/* Braided sandalwood rope (height and offset are driven by the ticker) */}
        <div
          ref={ropeRef}
          className="absolute top-0 will-change-transform"
          style={{
            left: `calc(50% - ${ROPE_WIDTH / 2}px)`,
            width: ROPE_WIDTH,
            height: 0,
            visibility: "hidden",
            zIndex: 1,
            borderRadius: ROPE_WIDTH / 2,
            backgroundImage: ROPE_BACKGROUND,
            backgroundSize: "100% 6px, 100% 100%",
            backgroundRepeat: "repeat-y, no-repeat",
            backgroundPositionY: "0px, 0px",
            boxShadow: "0 0 1.5px rgba(40, 24, 8, 0.35)",
          }}
        >
          {/* Frayed knot / tassel marking the top end of the rope */}
          <div
            ref={tasselRef}
            className="absolute"
            style={{
              left: "50%",
              top: -8.5,
              width: 14,
              height: 18,
              marginLeft: -7,
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

        {/* Angel: anchored to the very bottom of the track, above the rope */}
        <div
          className="absolute"
          style={{
            left: "50%",
            bottom: ANGEL_BOTTOM,
            width: ANGEL_SIZE,
            height: ANGEL_SIZE,
            marginLeft: -ANGEL_SIZE / 2,
            zIndex: 2,
          }}
        >
          {/* Plain <img> on purpose: the site uses `output: 'export'` */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={angelRef}
            src="/angel.png"
            alt=""
            draggable={false}
            decoding="async"
            className="pointer-events-none block h-full w-full select-none object-contain will-change-transform"
            style={{ transformOrigin: `50% ${GRIP_Y_RATIO * 100}%` }}
          />
        </div>
      </div>
    </>
  );
}

export default RopeAngelScroll;
