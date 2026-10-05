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
const PROGRESS_SMOOTHING = 16; // scrolling down: the rope top moves down, the pile grows
const UNCOIL_SMOOTHING = 7; // scrolling up: slower, so the pile visibly unwinds
const VELOCITY_SMOOTHING = 10;

/**
 * The drawing canvas is wider than the gutter so the pile can bulge a few px
 * to the left of it. The rope axis stays exactly at the gutter center.
 */
const CANVAS_WIDTH = 48;

/** Gap between the track bottom and the "floor" the rope lies on. */
const FLOOR_MARGIN = 3;

/** Maximum height of the fade-out zone at the free top end of the rope. */
const TOP_FADE_MAX = 90;

/** Distance from the rope tip to the center of the knot. */
const KNOT_OFFSET = 11.5;

/** Spacing of the braid chevrons along the rope. */
const CHEV_SPACING = 3;

/** Pile shape (px / radians). The pile is a mound: wide loops at the bottom, narrow on top. */
const COIL_RADIUS_BASE = 8; // horizontal radius of the lowest loops
const COIL_RADIUS_TOP = 3.5; // horizontal radius the loops shrink towards
const COIL_TAPER_TURNS = 16; // how quickly the mound narrows (in turns)
const COIL_PERSPECTIVE = 0.42; // loop height / loop width (view from slightly above)
const COIL_RISE = 2; // how much each loop sits above the previous one
const HELIX_STEP = 0.2; // angular sampling step in radians

/** Cubic connector that lets the hanging rope drape into the top of the pile. */
const CONNECT_LENGTH = 18;
const CONNECT_PULL = 7;
const CONNECT_STEPS = 12;

/** Rope colors (sandalwood). */
const ROPE_EDGE = "#5E3C1C";
const ROPE_BODY = "#9E7345";
const ROPE_LIGHT = "#C9AE82";
const CHEV_DARK = "rgba(74, 46, 18, 0.55)";
const CHEV_LIGHT = "rgba(232, 211, 168, 0.5)";

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

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const round2 = (value: number) => Math.round(value * 100) / 100;

const smooth01 = (t: number) => {
  const k = clamp(t, 0, 1);
  return k * k * (3 - 2 * k);
};

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
/* Rope geometry                                                              */
/* -------------------------------------------------------------------------- */

/**
 * A piece of the rope that is painted in one go. Pieces are painted from the
 * rope tip (bottom of the pile) towards the top end, so newer loops always lie
 * on top of older ones, like a real pile of rope.
 */
interface RopeGroup {
  /** Flat polyline: x0, y0, x1, y1, ... */
  path: number[];
  /** Dark braid chevrons: x, y, tangentX, tangentY (tangent points towards the rope's top end). */
  dark: number[];
  /** Light braid chevrons, offset by half a spacing. */
  light: number[];
}

interface Knot {
  x: number;
  y: number;
  /** Direction of travel along the rope, pointing from the tip towards the top end. */
  tx: number;
  ty: number;
}

interface RopeShape {
  groups: RopeGroup[];
  knot: Knot;
  /** Y of the free top end of the rope. */
  topY: number;
  /** Y where the straight, hanging part of the rope starts (equals topY when there is none). */
  straightStartY: number;
}

/**
 * Builds the rope, which has a constant length `total`.
 *
 *  - `coil` is the length of rope that already lies in the pile.
 *  - The rest (`total - coil`) hangs straight up from the pile to the free top end.
 *
 * At scroll 0, coil = 0: the rope is a straight line from the top of the screen
 * down to the floor. While scrolling, rope is fed into the pile at the bottom,
 * so the free top end travels down. At max scroll the whole rope is in the pile.
 *
 * The path is built from the TIP (on the floor) upwards. Loops are anchored to
 * the tip, so existing loops never move while new rope is added on top, and
 * uncoiling peels the top loop first. Braid chevrons sit at fixed arc-length
 * positions measured from the tip, which makes the braid flow downwards while
 * the rope is fed into the pile.
 */
function buildRope(
  coil: number,
  total: number,
  ropeX: number,
  cx: number,
  floorY: number
): RopeShape {
  const newGroup = (): RopeGroup => ({ path: [], dark: [], light: [] });

  // Slightly irregular loops so the pile looks organic, not like a perfect spring.
  const radiusAt = (phi: number) => {
    const turns = phi / (Math.PI * 2);
    const mound =
      COIL_RADIUS_TOP +
      (COIL_RADIUS_BASE - COIL_RADIUS_TOP) * Math.exp(-turns / COIL_TAPER_TURNS);
    return mound * (1 + 0.08 * Math.sin(phi * 0.37 + 1.3) + 0.04 * Math.sin(phi * 0.91 + 0.2));
  };
  const helixX = (phi: number) => {
    // The first turn starts exactly on the rope axis, then the pile centre slides left.
    const s = smooth01(phi / Math.PI);
    const centre = ropeX + (cx - ropeX) * s + 1.3 * s * Math.sin(phi * 0.53 + 0.4);
    return centre - radiusAt(phi) * Math.sin(phi);
  };
  const helixY = (phi: number) => {
    const ry = radiusAt(phi) * COIL_PERSPECTIVE * (0.92 + 0.12 * Math.sin(phi * 0.71 + 2.1));
    return floorY - ry - phi * (COIL_RISE / (Math.PI * 2)) + ry * Math.cos(phi);
  };

  const limit = Math.max(total, KNOT_OFFSET + 1);
  const coilLen = clamp(coil, 0, limit);

  const groups: RopeGroup[] = [];
  let g = newGroup();

  let px = helixX(0); // tip: on the rope axis, on the floor
  let py = helixY(0);
  let ltx = 0;
  let lty = -1;
  let m = 0;
  let done = false;
  let nextDark = CHEV_SPACING * 0.5;
  let nextLight = CHEV_SPACING;
  let knot: Knot | null = null;
  g.path.push(px, py);

  const emit = (xIn: number, yIn: number, addPath: boolean) => {
    if (done) return;
    let x = xIn;
    let y = yIn;
    let seg = Math.hypot(x - px, y - py);
    if (seg < 1e-4) return;
    if (m + seg >= limit) {
      // The rope has a fixed length: clip the last step and stop.
      const f = (limit - m) / seg;
      x = px + (x - px) * f;
      y = py + (y - py) * f;
      seg = limit - m;
      done = true;
      if (seg < 1e-4) return;
    }
    const tx = (x - px) / seg;
    const ty = (y - py) / seg;
    m += seg;
    if (!knot && m >= KNOT_OFFSET) knot = { x, y, tx, ty };
    while (nextDark <= m) {
      g.dark.push(x, y, tx, ty);
      nextDark += CHEV_SPACING;
    }
    while (nextLight <= m) {
      g.light.push(x, y, tx, ty);
      nextLight += CHEV_SPACING;
    }
    if (addPath) g.path.push(x, y);
    px = x;
    py = y;
    ltx = tx;
    lty = ty;
  };

  /* 1) The pile: loops from the tip (on the floor) upwards. */
  let phi = 0;
  let turnEdge = Math.PI * 2;
  let guard = 0;
  while (m < coilLen - 1e-3 && !done && guard++ < 6000) {
    phi += HELIX_STEP;
    let x = helixX(phi);
    let y = helixY(phi);
    const seg = Math.hypot(x - px, y - py);
    if (m + seg > coilLen) {
      const f = (coilLen - m) / seg; // clip so the pile holds exactly `coilLen` of rope
      x = px + (x - px) * f;
      y = py + (y - py) * f;
    }
    emit(x, y, true);

    if (phi >= turnEdge && m < coilLen - 1e-3 && !done) {
      groups.push(g);
      const tail = g.path.slice(-6); // overlap to hide the seam between groups
      g = newGroup();
      g.path.push(...tail);
      turnEdge += Math.PI * 2;
    }
  }
  groups.push(g);

  /* 2) The rest of the rope: connector out of the pile, then straight up to the free top end. */
  let straightStartY = py;
  if (!done && m < limit - 1e-3) {
    const tail = g.path.slice(-6);
    g = newGroup();
    g.path.push(...tail);

    // For a tiny pile the connector is a plain straight line (no hook).
    const pull = CONNECT_PULL * smooth01(coilLen / 36);
    const sx = px;
    const sy = py;
    const yE = sy - CONNECT_LENGTH;
    const c1x = sx + ltx * pull;
    const c1y = sy + lty * pull;
    const c2x = ropeX;
    const c2y = yE + pull;
    for (let i = 1; i <= CONNECT_STEPS && !done; i++) {
      const u = i / CONNECT_STEPS;
      const v = 1 - u;
      const x = v * v * v * sx + 3 * v * v * u * c1x + 3 * v * u * u * c2x + u * u * u * ropeX;
      const y = v * v * v * sy + 3 * v * v * u * c1y + 3 * v * u * u * c2y + u * u * u * yE;
      emit(x, y, true);
    }
    if (!done) {
      straightStartY = py;
      for (let y = yE - CHEV_SPACING, n = 0; !done && n < 2000; y -= CHEV_SPACING, n++) {
        emit(ropeX, y, false);
      }
    }
    g.path.push(px, py);
    groups.push(g);
  }

  const finalKnot: Knot =
    (knot as Knot | null) ?? { x: px, y: py, tx: ltx, ty: lty };
  return { groups, knot: finalKnot, topY: py, straightStartY };
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tasselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    const canvas = canvasRef.current;
    const tassel = tasselRef.current;
    if (!track || !canvas || !tassel) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const getExplicitScroller = (): HTMLElement | null =>
      scrollerSelector
        ? document.querySelector<HTMLElement>(scrollerSelector)
        : null;

    /* ------------------------------ state ------------------------------ */

    let scroller: HTMLElement = getExplicitScroller() ?? getRootScroller();
    let trackHeight = track.clientHeight || window.innerHeight;
    let dpr = 1;

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

    // Rope axis (gutter center) in canvas coordinates; the canvas is right-aligned.
    const ropeX = CANVAS_WIDTH - gutterWidth / 2;
    const canvasOffsetX = CANVAS_WIDTH - gutterWidth; // canvas x -> track x

    /* ----------------------------- canvas ------------------------------- */

    const resizeCanvas = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(CANVAS_WIDTH * dpr);
      canvas.height = Math.max(1, Math.round(trackHeight * dpr));
      canvas.style.width = `${CANVAS_WIDTH}px`;
      canvas.style.height = `${trackHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      lastSignature = "";
    };

    const strokeChevrons = (data: number[], color: string, width: number) => {
      if (data.length === 0) return;
      const halfWidth = ROPE_WIDTH * 0.42;
      ctx.beginPath();
      for (let i = 0; i < data.length; i += 4) {
        const x = data[i];
        const y = data[i + 1];
        const tx = data[i + 2];
        const ty = data[i + 3];
        const nx = -ty;
        const ny = tx;
        // "V" whose tip points towards the rope tip, like the original braid.
        ctx.moveTo(x + tx + nx * halfWidth, y + ty + ny * halfWidth);
        ctx.lineTo(x - tx, y - ty);
        ctx.lineTo(x + tx - nx * halfWidth, y + ty - ny * halfWidth);
      }
      ctx.lineCap = "butt";
      ctx.lineJoin = "miter";
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.stroke();
    };

    const drawGroup = (group: RopeGroup) => {
      const p = group.path;
      if (p.length < 4) return;
      ctx.beginPath();
      ctx.moveTo(p[0], p[1]);
      for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Three stacked strokes give the cord a rounded, shaded body.
      ctx.strokeStyle = ROPE_EDGE;
      ctx.lineWidth = ROPE_WIDTH + 0.4;
      ctx.stroke();
      ctx.strokeStyle = ROPE_BODY;
      ctx.lineWidth = ROPE_WIDTH - 0.9;
      ctx.stroke();
      ctx.strokeStyle = ROPE_LIGHT;
      ctx.lineWidth = Math.max(1, ROPE_WIDTH * 0.35);
      ctx.stroke();

      strokeChevrons(group.dark, CHEV_DARK, 0.9);
      strokeChevrons(group.light, CHEV_LIGHT, 0.6);
    };

    const drawContactShadow = (cx: number, floorY: number, amount: number) => {
      const radius = COIL_RADIUS_BASE * 1.5 + 3;
      ctx.save();
      ctx.translate(cx + 1, floorY + 1);
      ctx.scale(1, 0.28);
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
      gradient.addColorStop(0, `rgba(20, 12, 4, ${0.4 * amount})`);
      gradient.addColorStop(1, "rgba(20, 12, 4, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    /* ----------------------------- rendering ---------------------------- */

    const render = () => {
      const floorY = Math.max(40, trackHeight - FLOOR_MARGIN);

      // ഇവിടെയാണ് ഞാൻ ആ കോയിൽ ആനിമേഷൻ കളയാൻ ചെയ്ത ഒരേയൊരു മാറ്റം:
      const currentTipY = Math.max(KNOT_OFFSET + 1, progress * floorY);
      const total = currentTipY; 
      const coil = 0; // ഇത് 0 ആയതുകൊണ്ട് കയർ ഇനി ചുരുണ്ട് കൂടുല്ല!

      const signature = `${round2(coil)}|${round2(total)}|${round2(trackHeight)}`;
      if (signature === lastSignature) return;
      lastSignature = signature;

      // Keep the whole pile inside the screen: shift its center left if needed.
      const cx = Math.min(
        ropeX,
        CANVAS_WIDTH - (COIL_RADIUS_BASE * 1.12 + ROPE_WIDTH / 2 + 2.5)
      );

      const { groups, knot, topY, straightStartY } = buildRope(
        coil,
        total,
        ropeX,
        cx,
        currentTipY // Use currentTipY as the floor for the math
      );

      ctx.clearRect(0, 0, CANVAS_WIDTH, trackHeight);

      if (coil > 0.5) drawContactShadow(cx, floorY, clamp(coil / 40, 0, 1));
      for (const group of groups) drawGroup(group);

      // The free top end dissolves into nothing (only along the straight, hanging part).
      const fadeLength = clamp((straightStartY - topY) * 0.6, 0, TOP_FADE_MAX);
      if (fadeLength > 1) {
        const fade = ctx.createLinearGradient(0, topY, 0, topY + fadeLength);
        fade.addColorStop(0, "rgba(0, 0, 0, 1)");
        fade.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillStyle = fade;
        ctx.fillRect(0, topY - 3, CANVAS_WIDTH, fadeLength + 3);
        ctx.globalCompositeOperation = "source-over";
      }

      // Frayed knot: sits on the rope tip and follows its direction.
      const angle = Math.atan2(-knot.tx, knot.ty);
      tassel.style.transform =
        `translate3d(${round2(knot.x - canvasOffsetX - 7)}px, ${round2(knot.y - 11.5)}px, 0) ` +
        `rotate(${round2(angle)}rad)`;
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

      // Feeding the pile is snappy; pulling the rope back up (uncoiling) is deliberately slower.
      const rate = targetProgress < progress ? UNCOIL_SMOOTHING : PROGRESS_SMOOTHING;
      progress += (targetProgress - progress) * (1 - Math.exp(-dt * rate));
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

    resizeCanvas();
    const resizeObserver = new ResizeObserver(() => {
      const nextHeight = track.clientHeight || window.innerHeight;
      if (nextHeight !== trackHeight || dpr !== Math.min(window.devicePixelRatio || 1, 2)) {
        trackHeight = nextHeight;
        resizeCanvas();
      }
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
  }, [scrollerSelector, gutterWidth]);

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
        {/* Rope + pile are drawn here. Right-aligned, so the rope axis stays at the gutter center. */}
        <canvas
          ref={canvasRef}
          className="absolute top-0"
          style={{ right: 0, width: CANVAS_WIDTH, height: "100%" }}
        />

        {/* Frayed knot / tassel mounted at the tip of the rope (moved and rotated by the ticker) */}
        <div
          ref={tasselRef}
          className="absolute"
          style={{
            left: 0,
            top: 0,
            width: 14,
            height: 18,
            transformOrigin: "7px 11.5px",
            willChange: "transform",
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
    </>
  );
}

export default RopeAngelScroll;
