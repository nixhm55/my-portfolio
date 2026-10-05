'use client';

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { isMobile } from "react-device-detect";
import * as THREE from "three";

/* -------------------------------------------------------------------------- */
/*                                   Tunables                                 */
/* -------------------------------------------------------------------------- */

const STAR_COUNT_DESKTOP = 2400;
const STAR_COUNT_MOBILE = 900;

const INNER_RADIUS = 14;
const OUTER_RADIUS = 40;

const MIN_SIZE = 0.03;
const MAX_SIZE = 0.12;

const SHOW_CONSTELLATION_LINES = true;
const LINE_COLOR = "#3f5f86";
const LINE_OPACITY = 0.18;
const LINE_MAX_LINK = 4;
// Constellation lines are confined to a background band so a line near the
// camera can never stretch across the whole viewport.
const ANCHOR_INNER_RADIUS = 22;
const ANCHOR_OUTER_RADIUS = 34;

const DRIFT_SPEED = 0.012;
const BOB_AMPLITUDE = 0.4;
const TILT_AMPLITUDE = 0.035;

/* Saturated indigo/blue tones chosen to stay legible against the light
 * PROJECTS backdrop (#bdd1e3). Whites/light pastels are intentionally
 * avoided — they vanish on a light background, especially with additive
 * blending, which is why this field uses normal blending instead. */
const STAR_PALETTE: Array<[string, number]> = [
  ["#16276b", 1], // deep indigo anchor
  ["#1e3a8a", 2], // navy
  ["#1d4ed8", 3], // cobalt
  ["#2563eb", 3], // blue
  ["#3b82f6", 2], // bright blue
  ["#0ea5e9", 2], // sky
  ["#38bdf8", 1], // light sky
];

/* -------------------------------------------------------------------------- */
/*                                   Shaders                                  */
/* -------------------------------------------------------------------------- */

// `instanceMatrix`, `normal` and `normalMatrix` are injected by three's default
// vertex prefix whenever this material is used on an InstancedMesh, so we can
// rely on them here without declaring them manually.
const vertexShader = /* glsl */ `
  attribute vec3 aColor;
  attribute float aPhase;

  uniform float uTime;

  varying vec3 vColor;
  varying float vTwinkle;
  varying vec3 vViewNormal;

  void main() {
    vColor = aColor;
    vTwinkle = 0.72 + 0.28 * sin(uTime * 1.6 + aPhase);

    vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    vViewNormal = normalize(normalMatrix * (mat3(instanceMatrix) * normal));
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vTwinkle;
  varying vec3 vViewNormal;

  void main() {
    float facing = clamp(dot(normalize(vViewNormal), vec3(0.0, 0.0, 1.0)), 0.0, 1.0);

    // Soft radial falloff keeps every instance perfectly round and glowing,
    // hiding the low-poly silhouette of the underlying sphere.
    float falloff = smoothstep(0.0, 1.0, facing);
    float alpha = pow(falloff, 1.35) * vTwinkle;

    gl_FragColor = vec4(vColor, alpha);

    // Keep colour management identical to the rest of the scene
    // (R3F defaults to ACESFilmic tone mapping + sRGB output).
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

interface ProjectsStarfieldProps {
  /** Only animates / renders while the PROJECTS portal is open. */
  active: boolean;
}

interface StarfieldParts {
  points: THREE.InstancedMesh;
  lines: THREE.LineSegments | null;
  uniforms: { uTime: { value: number } };
  geometry: THREE.SphereGeometry;
  material: THREE.ShaderMaterial;
  lineGeometry: THREE.BufferGeometry;
  lineMaterial: THREE.LineBasicMaterial;
}

const buildStarfield = (): StarfieldParts => {
  const count = isMobile ? STAR_COUNT_MOBILE : STAR_COUNT_DESKTOP;

  const uniforms = { uTime: { value: 0 } };

  const geometry = new THREE.SphereGeometry(1, 8, 8);
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.NormalBlending,
  });

  const palette = STAR_PALETTE.flatMap(([hex, weight]) =>
    Array.from({ length: weight }, () => new THREE.Color(hex)),
  );

  const points = new THREE.InstancedMesh(geometry, material, count);
  points.frustumCulled = false; // instances live far from the object origin
  points.renderOrder = -1; // draw behind the carousel / wanderer
  points.raycast = () => {}; // never intercept pointer / touch controls

  const colors = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  const sizes = new Float32Array(count);
  const positions: THREE.Vector3[] = new Array(count);

  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const direction = new THREE.Vector3();

  const innerCube = INNER_RADIUS ** 3;
  const outerCube = OUTER_RADIUS ** 3;

  for (let i = 0; i < count; i += 1) {
    // Uniformly distributed point inside a spherical shell.
    const cosTheta = Math.random() * 2 - 1;
    const theta = Math.random() * Math.PI * 2;
    const sinTheta = Math.sqrt(1 - cosTheta * cosTheta);
    direction.set(sinTheta * Math.cos(theta), cosTheta, sinTheta * Math.sin(theta));

    const radius = Math.cbrt(THREE.MathUtils.lerp(innerCube, outerCube, Math.random()));
    const position = direction.clone().multiplyScalar(radius);
    positions[i] = position;

    // Bias towards smaller stars so the field stays subtle.
    const size = THREE.MathUtils.lerp(MIN_SIZE, MAX_SIZE, Math.pow(Math.random(), 1.5));
    sizes[i] = size;

    matrix.compose(position, quaternion.identity(), scale.set(size, size, size));
    points.setMatrixAt(i, matrix);

    const color = palette[(Math.random() * palette.length) | 0];
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;

    phases[i] = Math.random() * Math.PI * 2;
  }

  points.instanceMatrix.needsUpdate = true;
  geometry.setAttribute("aColor", new THREE.InstancedBufferAttribute(colors, 3));
  geometry.setAttribute("aPhase", new THREE.InstancedBufferAttribute(phases, 1));

  let lines: THREE.LineSegments | null = null;
  const lineGeometry = new THREE.BufferGeometry();
  const lineMaterial = new THREE.LineBasicMaterial({
    color: LINE_COLOR,
    transparent: true,
    opacity: LINE_OPACITY,
    depthWrite: false,
  });

  if (SHOW_CONSTELLATION_LINES) {
    // Sparse nearest-neighbour graph between the brighter, closer stars so it
    // reads as a constellation rather than a dense web.
    const anchors: number[] = [];
    for (let i = 0; i < count; i += 1) {
      const radius = positions[i].length();
      if (
        sizes[i] > MAX_SIZE * 0.6 &&
        radius > ANCHOR_INNER_RADIUS &&
        radius < ANCHOR_OUTER_RADIUS
      ) {
        anchors.push(i);
      }
    }

    const seen = new Set<number>();
    const linePositions: number[] = [];

    for (let a = 0; a < anchors.length; a += 1) {
      const from = anchors[a];
      let nearest = -1;
      let nearestDistance = LINE_MAX_LINK;

      for (let b = 0; b < anchors.length; b += 1) {
        if (b === a) continue;
        const to = anchors[b];
        const distance = positions[from].distanceTo(positions[to]);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = to;
        }
      }

      if (nearest === -1) continue;
      const key = from < nearest ? from * count + nearest : nearest * count + from;
      if (seen.has(key)) continue;
      seen.add(key);

      const fromPosition = positions[from];
      const toPosition = positions[nearest];
      linePositions.push(
        fromPosition.x,
        fromPosition.y,
        fromPosition.z,
        toPosition.x,
        toPosition.y,
        toPosition.z,
      );
    }

    lineGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(linePositions, 3),
    );

    lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    lines.frustumCulled = false;
    lines.renderOrder = -1;
    lines.raycast = () => {};
  }

  return { points, lines, uniforms, geometry, material, lineGeometry, lineMaterial };
};

/* -------------------------------------------------------------------------- */
/*                                  Component                                 */
/* -------------------------------------------------------------------------- */

const ProjectsStarfield = ({ active }: ProjectsStarfieldProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const parts = useMemo(() => buildStarfield(), []);
  const { points, lines, uniforms, geometry, material, lineGeometry, lineMaterial } = parts;

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
      lineGeometry.dispose();
      lineMaterial.dispose();
    };
  }, [geometry, material, lineGeometry, lineMaterial]);

  useFrame((_, delta) => {
    if (!active) return;

    const time = (uniforms.uTime.value += Math.min(delta, 0.1));
    const group = groupRef.current;
    if (!group) return;

    // Slow, seamless drift + gentle bob. No per-instance matrix updates →
    // the whole field costs a single draw call per frame.
    group.rotation.y += delta * DRIFT_SPEED;
    group.rotation.x = Math.sin(time * 0.07) * TILT_AMPLITUDE;
    group.position.y = Math.sin(time * 0.11) * BOB_AMPLITUDE;
  });

  return (
    <group ref={groupRef} visible={active}>
      <primitive object={points} />
      {lines && <primitive object={lines} />}
    </group>
  );
};

export default ProjectsStarfield;
