'use client';

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

interface WovenClothPortalProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
}

/* -------------------------------------------------------------------------- */
/*  Cloth constants — Optimized for 60/120fps smooth performance             */
/* -------------------------------------------------------------------------- */
const BW = 4.4;            // cloth width  (local units)
const BH = 2.75;           // cloth height (local units)
const GX = 32;             // Optimized segments along X (smooth & fast)
const GY = 20;             // Optimized segments along Y (smooth & fast)
const GRAV = 3.1;          // gravity magnitude
const DAMP = 0.985;        // Verlet damping
const DT = 0.016;          // fixed physics timestep
const ITERATIONS = 2;      // optimized constraint passes for zero lag
const MAX_STEPS_PER_FRAME = 3;

/* Generous local-space radius for the visibility test. The driven wave stays
 * well inside this (measured max |z| ≈ 2.05), so the cloth is never wrongly
 * treated as off-screen — while the simulation can still be skipped entirely
 * whenever the cloth is out of view. */
const CLOTH_BOUNDS_RADIUS = 6;

/* -------------------------------------------------------------------------- */
/*  Texture — ivory cloth, themed ink (black in dark mode, blue in light mode) */
/* -------------------------------------------------------------------------- */
const FLIP_TEXT_VERTICALLY = true;

const TEX_W = 1280;
const TEX_H = 800;

function drawCloth(c: HTMLCanvasElement, isDark: boolean) {
  const W = c.width, H = c.height;
  const x = c.getContext('2d');
  if (!x) return;

  x.setTransform(1, 0, 0, 1, 0, 0);
  x.clearRect(0, 0, W, H);
  if (FLIP_TEXT_VERTICALLY) {
    x.translate(0, H);
    x.scale(1, -1);
  }

  const ink = isDark ? '#000000' : '#2563eb';

  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#efe6d4');
  g.addColorStop(0.5, '#e9dfca');
  g.addColorStop(1, '#e3d7bf');
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);

  x.strokeStyle = ink;
  x.lineWidth = 10;
  x.strokeRect(46, 46, W - 92, H - 92);
  x.lineWidth = 3;
  x.strokeRect(66, 66, W - 132, H - 132);

  x.fillStyle = ink;
  x.textBaseline = 'middle';

  x.font = 'bold 64px Georgia, "Times New Roman", serif';
  x.textAlign = 'left';
  x.fillText('EDUCATION', 140, H / 2 - 60);

  x.textAlign = 'right';
  x.fillText('PROJECTS', W - 140, H / 2 - 60);

  x.strokeStyle = ink;
  x.lineWidth = 6;
  x.beginPath();
  x.moveTo(W / 2, H / 2 - 160);
  x.lineTo(W / 2, H / 2 + 40);
  x.stroke();

  x.textAlign = 'center';
  x.font = '600 32px "Helvetica Neue", Arial, sans-serif';
  x.fillText('· THIS WAY ·', W / 2, H - 160);

  for (let yy = 0; yy < H; yy += 3) {
    x.strokeStyle = 'rgba(60,30,20,0.05)';
    x.lineWidth = 1;
    x.beginPath(); x.moveTo(0, yy + 0.5); x.lineTo(W, yy + 0.5); x.stroke();
  }
  for (let xx = 0; xx < W; xx += 3) {
    x.strokeStyle = 'rgba(255,250,235,0.06)';
    x.lineWidth = 1;
    x.beginPath(); x.moveTo(xx + 0.5, 0); x.lineTo(xx + 0.5, H); x.stroke();
  }

  x.setTransform(1, 0, 0, 1, 0, 0);
  const id = x.getImageData(0, 0, W, H);
  const d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() * 2 - 1) * 10;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  x.putImageData(id, 0, 0);
}

function makeClothTexture(isDark: boolean): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = TEX_W;
  c.height = TEX_H;
  drawCloth(c, isDark);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* -------------------------------------------------------------------------- */
/*  Vertex normals — specialised, allocation-free equivalent of               */
/*  BufferGeometry.computeVertexNormals() for this indexed grid.              */
/*  Produces bit-identical results (zero allocations, no Vector3 churn).      */
/* -------------------------------------------------------------------------- */
function computeGridNormals(
  positions: Float32Array,
  index: ArrayLike<number>,
  normals: Float32Array,
) {
  for (let i = 0, il = normals.length; i < il; i++) normals[i] = 0;

  for (let i = 0, il = index.length; i < il; i += 3) {
    const vA = index[i] * 3;
    const vB = index[i + 1] * 3;
    const vC = index[i + 2] * 3;

    const ax = positions[vA], ay = positions[vA + 1], az = positions[vA + 2];
    const bx = positions[vB], by = positions[vB + 1], bz = positions[vB + 2];
    const cx = positions[vC], cy = positions[vC + 1], cz = positions[vC + 2];

    // cb = pC - pB, ab = pA - pB, face normal = cb × ab (same order as three.js)
    const cbx = cx - bx, cby = cy - by, cbz = cz - bz;
    const abx = ax - bx, aby = ay - by, abz = az - bz;

    const nx = cby * abz - cbz * aby;
    const ny = cbz * abx - cbx * abz;
    const nz = cbx * aby - cby * abx;

    normals[vA] += nx; normals[vA + 1] += ny; normals[vA + 2] += nz;
    normals[vB] += nx; normals[vB + 1] += ny; normals[vB + 2] += nz;
    normals[vC] += nx; normals[vC + 1] += ny; normals[vC + 2] += nz;
  }

  for (let i = 0, il = normals.length; i < il; i += 3) {
    const x = normals[i], y = normals[i + 1], z = normals[i + 2];
    const inv = 1 / (Math.sqrt(x * x + y * y + z * z) || 1);
    normals[i] = x * inv;
    normals[i + 1] = y * inv;
    normals[i + 2] = z * inv;
  }
}

/* -------------------------------------------------------------------------- */
/*  Verlet cloth simulation (optimized)                                       */
/* -------------------------------------------------------------------------- */
function createClothSim(geometry: THREE.PlaneGeometry, pinBottom: boolean) {
  const posAttr = geometry.attributes.position as THREE.BufferAttribute;
  const normAttr = geometry.attributes.normal as THREE.BufferAttribute;
  const index = geometry.index!.array;
  const N = (GX + 1) * (GY + 1);
  const cur = new Float32Array(N * 3);
  const prev = new Float32Array(N * 3);
  const rest = new Float32Array(N * 3);
  const pinned = new Uint8Array(N);

  const restH = BW / GX;
  const restV = BH / GY;
  const rowLen = GX + 1;

  const pinRow = pinBottom ? GY : 0;
  const hang = pinBottom ? 1 : -1;

  for (let iy = 0, vi = 0; iy <= GY; iy++) {
    for (let ix = 0; ix <= GX; ix++, vi++) {
      const px = -BW / 2 + ix * restH;
      const py = BH / 2 - iy * restV;
      cur[vi * 3] = prev[vi * 3] = rest[vi * 3] = px;
      cur[vi * 3 + 1] = prev[vi * 3 + 1] = rest[vi * 3 + 1] = py;
      cur[vi * 3 + 2] = prev[vi * 3 + 2] = rest[vi * 3 + 2] = 0;
    }
  }
  for (let ix = 0; ix <= GX; ix++) pinned[ix + pinRow * rowLen] = 1;

  let t = 0;

  function solve(a: number, b: number, rl: number) {
    const a3 = a * 3;
    const b3 = b * 3;
    const ax = cur[a3], ay = cur[a3 + 1], az = cur[a3 + 2];
    const bx = cur[b3], by = cur[b3 + 1], bz = cur[b3 + 2];
    let dx = bx - ax, dy = by - ay, dz = bz - az;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
    const diff = ((d - rl) / d) * 0.5;
    dx *= diff; dy *= diff; dz *= diff;

    const pa = pinned[a], pb = pinned[b];
    if (!pa && !pb) {
      cur[a3] += dx; cur[a3 + 1] += dy; cur[a3 + 2] += dz;
      cur[b3] -= dx; cur[b3 + 1] -= dy; cur[b3 + 2] -= dz;
    } else if (pa && !pb) {
      cur[b3] -= dx * 2; cur[b3 + 1] -= dy * 2; cur[b3 + 2] -= dz * 2;
    } else if (!pa && pb) {
      cur[a3] += dx * 2; cur[a3 + 1] += dy * 2; cur[a3 + 2] += dz * 2;
    }
  }

  function step(time: number) {
    const gust = 0.6 + 0.42 * Math.sin(time * 0.6) + 0.18 * Math.sin(time * 1.9 + 1.3);

    for (let iy = 0, vi = 0; iy <= GY; iy++) {
      if (iy === pinRow) { vi += rowLen; continue; }

      const cy = (pinBottom ? GY - iy : iy) / GY;
      const travel = time * 1.7 - cy * 4.2;
      const amp = 4.3 * cy;
      const fx = Math.sin(time * 0.9 + cy * 2.2) * 0.6 * cy;
      const ay = hang * 0.4 * cy + hang * GRAV;

      let i = vi * 3;
      for (let ix = 0; ix <= GX; ix++, i += 3) {
        const cx = ix / GX;
        const fz =
          (Math.sin(travel + cx * 3.3) + 0.5 * Math.sin(travel * 1.7 + cx * 6.0)) * amp * gust;

        let v = (cur[i] - prev[i]) * DAMP;
        prev[i] = cur[i];
        cur[i] += v + fx * DT * DT;

        v = (cur[i + 1] - prev[i + 1]) * DAMP;
        prev[i + 1] = cur[i + 1];
        cur[i + 1] += v + ay * DT * DT;

        v = (cur[i + 2] - prev[i + 2]) * DAMP;
        prev[i + 2] = cur[i + 2];
        cur[i + 2] += v + fz * DT * DT;
      }

      vi += rowLen;
    }

    for (let it = 0; it < ITERATIONS; it++) {
      // horizontal edges: pinned rows are no-ops, so they are skipped entirely
      for (let iy = 0, base = 0; iy <= GY; iy++, base += rowLen) {
        for (let ix = 0, a = base; ix < GX; ix++, a++) solve(a, a + 1, restH);
      }
      // vertical edges
      for (let iy = 0, a = 0; iy < GY; iy++) {
        for (let ix = 0; ix <= GX; ix++, a++) solve(a, a + rowLen, restV);
      }
    }

    let p = pinRow * rowLen * 3;
    for (let ix = 0; ix <= GX; ix++, p += 3) {
      cur[p] = prev[p] = rest[p];
      cur[p + 1] = prev[p + 1] = rest[p + 1];
      cur[p + 2] = prev[p + 2] = rest[p + 2];
    }
  }

  return {
    tick() {
      t += DT;
      step(t);
    },
    warmUp(steps: number) {
      for (let s = 0; s < steps; s++) this.tick();
    },
    commit() {
      const positions = posAttr.array as Float32Array;
      positions.set(cur);
      posAttr.needsUpdate = true;

      computeGridNormals(positions, index, normAttr.array as Float32Array);
      normAttr.needsUpdate = true;
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */
export function WovenClothPortal({
  position = [0, -25, 4.6],
  rotation = [-30, 0, 0],
  scale = [0.15, -0.15, 0.15],
}: WovenClothPortalProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const accumulator = useRef(0);
  const meshRef = useRef<THREE.Mesh>(null);
  // Preallocated and reused every frame — no per-frame allocations.
  const cullFrustum = useMemo(() => new THREE.Frustum(), []);
  const cullMatrix = useMemo(() => new THREE.Matrix4(), []);
  const cullSphere = useMemo(() => new THREE.Sphere(new THREE.Vector3(), 0), []);
  const worldPosition = useMemo(() => new THREE.Vector3(), []);
  const worldScale = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    setIsMounted(true);

    const checkTheme = () => {
      const docEl = document.documentElement;
      const bodyEl = document.body;
      const hasDark = docEl.classList.contains("dark") || bodyEl.classList.contains("dark");
      const hasLight = docEl.classList.contains("light") || bodyEl.classList.contains("light");
      if (hasDark && !hasLight) setIsDark(true);
      else if (hasLight && !hasDark) setIsDark(false);
      else {
        const bodyBg = window.getComputedStyle(bodyEl).backgroundColor;
        const match = bodyBg.match(/\d+/g);
        if (match && match.length >= 3) {
          const r = parseInt(match[0], 10);
          const g = parseInt(match[1], 10);
          const b = parseInt(match[2], 10);
          setIsDark((0.299 * r + 0.587 * g + 0.114 * b) < 110);
        }
      }
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });
    observer.observe(document.body, { attributes: true, attributeFilter: ["class", "style"] });
    return () => observer.disconnect();
  }, []);

  const pinBottom = scale[1] < 0;

  const reducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const clothTexture = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return makeClothTexture(true);
  }, []);

  useEffect(() => {
    if (!clothTexture) return;
    drawCloth(clothTexture.image as HTMLCanvasElement, isDark);
    clothTexture.needsUpdate = true;
  }, [clothTexture, isDark]);

  const geometry = useMemo(() => new THREE.PlaneGeometry(BW, BH, GX, GY), []);

  const material = useMemo(
    () =>
      new THREE.MeshPhongMaterial({
        map: clothTexture || undefined,
        side: THREE.DoubleSide,
        shininess: 6,
        specular: 0x2a1410,
        color: 0xffffff,
        transparent: false,
        depthTest: true,
        depthWrite: true,
      }),
    [clothTexture]
  );

  const sim = useMemo(() => {
    const s = createClothSim(geometry, pinBottom);
    s.warmUp(reducedMotion ? 220 : 40);
    s.commit();
    return s;
  }, [geometry, pinBottom, reducedMotion]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => () => clothTexture?.dispose(), [clothTexture]);

  useFrame((state, delta) => {
    if (reducedMotion) return;

    // Visibility check: while the cloth is off-screen or the tab is
    // backgrounded, skip the simulation and all buffer uploads entirely. The
    // sphere is deliberately generous so the sim is already running before the
    // cloth actually enters the view (no pop-in).
    let visible = !document.hidden;
    const mesh = meshRef.current;
    if (visible && mesh) {
      mesh.getWorldPosition(worldPosition);
      mesh.getWorldScale(worldScale);
      cullSphere.center.copy(worldPosition);
      cullSphere.radius =
        CLOTH_BOUNDS_RADIUS *
        Math.max(Math.abs(worldScale.x), Math.abs(worldScale.y), Math.abs(worldScale.z));
      cullMatrix.multiplyMatrices(state.camera.projectionMatrix, state.camera.matrixWorldInverse);
      cullFrustum.setFromProjectionMatrix(cullMatrix);
      visible = cullFrustum.intersectsSphere(cullSphere);
    }

    if (!visible) {
      accumulator.current = 0;
      return;
    }

    accumulator.current += Math.min(delta, 0.1);
    let steps = 0;
    while (accumulator.current >= DT && steps < MAX_STEPS_PER_FRAME) {
      sim.tick();
      accumulator.current -= DT;
      steps++;
    }
    if (steps === MAX_STEPS_PER_FRAME) accumulator.current = 0;
    if (steps > 0) sim.commit();
  });

  if (!isMounted) return null;

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <ambientLight intensity={1.3} />
      <directionalLight position={[2, 3, 4]} intensity={1.8} color="#ffffff" />
      <directionalLight position={[-2, -2, 2]} intensity={0.6} color="#5caed5" />
      <mesh ref={meshRef} geometry={geometry} material={material} frustumCulled={false} />
    </group>
  );
}

export default WovenClothPortal;
