import * as THREE from "three";

export const WARP_FIELD_VARIANTS = ["streaks", "letters", "keycaps", "hyperspace"] as const;
export type WarpFieldVariant = (typeof WARP_FIELD_VARIANTS)[number];

export type WarpFieldOptions = {
  variant: WarpFieldVariant;
  speed: number;
  streakOpacity: number;
  tileOpacity: number;
  fov: number;
  brightness: number;
  hue: number;
  saturation: number;
  transparentBackground?: boolean;
};

export const WARP_FIELD_DEFAULTS: WarpFieldOptions = {
  variant: "hyperspace",
  speed: 12,
  streakOpacity: 0.5,
  tileOpacity: 0.6,
  fov: 75,
  brightness: 1,
  hue: 0,
  saturation: 1,
  transparentBackground: true,
};

const RECYCLE_Z = 200;
const RESET_Z = -1800;
const SPEED_SCALE: Record<WarpFieldVariant, number> = { streaks: 1, letters: 0.5, keycaps: 0.7, hyperspace: 2 };
const BACKGROUND: Record<WarpFieldVariant, number> = { streaks: 0x02040a, letters: 0x02040a, keycaps: 0x03070c, hyperspace: 0x01020a };

type Layer = {
  update?: (step: number, time: number) => void;
  setOpacity?: (streakOpacity: number, tileOpacity: number) => void;
  dispose: () => void;
};

type StreakSettings = {
  count: number;
  radiusMin: number;
  radiusSpread: number;
  lengthMin: number;
  lengthSpread: number;
  palette: number[];
  opacityScale: number;
};

function createStreakLayer(group: THREE.Group, settings: StreakSettings, opacity: number): Layer {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(settings.count * 6);
  const colors = new Float32Array(settings.count * 6);
  const palette = settings.palette.map((hex) => new THREE.Color(hex));

  for (let index = 0; index < settings.count; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * settings.radiusSpread + settings.radiusMin;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const z = (Math.random() - 0.5) * 2000;
    const length = Math.random() * settings.lengthSpread + settings.lengthMin;

    positions[index * 6] = x;
    positions[index * 6 + 1] = y;
    positions[index * 6 + 2] = z;
    positions[index * 6 + 3] = x;
    positions[index * 6 + 4] = y;
    positions[index * 6 + 5] = z + length;

    const color = palette[Math.floor(Math.random() * palette.length)];
    colors[index * 6] = color.r;
    colors[index * 6 + 1] = color.g;
    colors[index * 6 + 2] = color.b;
    colors[index * 6 + 3] = color.r;
    colors[index * 6 + 4] = color.g;
    colors[index * 6 + 5] = color.b;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: opacity * settings.opacityScale,
    blending: THREE.AdditiveBlending,
  });

  const streaks = new THREE.LineSegments(geometry, material);
  group.add(streaks);

  const attribute = geometry.attributes.position as unknown as { array: Float32Array; needsUpdate: boolean };

  return {
    update(step) {
      for (let index = 0; index < settings.count; index += 1) {
        positions[index * 6 + 2] += step;
        positions[index * 6 + 5] += step;
        if (positions[index * 6 + 2] > RECYCLE_Z) {
          const length = positions[index * 6 + 5] - positions[index * 6 + 2];
          positions[index * 6 + 2] = RESET_Z;
          positions[index * 6 + 5] = RESET_Z + length;
        }
      }
      attribute.needsUpdate = true;
    },
    setOpacity(streakOpacity) {
      const scaled = streakOpacity * settings.opacityScale;
      if (material.opacity !== scaled) material.opacity = scaled;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}

function createTunnelTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (context) {
    context.fillStyle = "#000000";
    context.fillRect(0, 0, size, size);
    for (let index = 0; index < 120; index += 1) {
      const x = Math.random() * size;
      const width = Math.random() * 2 + 0.4;
      const height = Math.random() * 200 + 60;
      const top = Math.random() * size;
      const alpha = (Math.random() * 0.3 + 0.05).toFixed(3);

      for (const offset of [-size, 0, size]) {
        const gradient = context.createLinearGradient(0, top + offset, 0, top + offset + height);
        gradient.addColorStop(0, "rgba(191,219,254,0)");
        gradient.addColorStop(0.5, `rgba(224,238,255,${alpha})`);
        gradient.addColorStop(1, "rgba(147,197,253,0)");
        context.fillStyle = gradient;
        context.fillRect(x, top + offset, width, height);
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 2);
  return texture;
}

function createGlowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (context) {
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.18, "rgba(219,234,254,0.45)");
    gradient.addColorStop(0.45, "rgba(96,165,250,0.1)");
    gradient.addColorStop(1, "rgba(2,6,23,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  }
  return new THREE.CanvasTexture(canvas);
}

function createHyperspaceLayer(group: THREE.Group, opacity: number): Layer {
  const tunnelTexture = createTunnelTexture();
  const tunnelGeometry = new THREE.CylinderGeometry(900, 240, 3000, 64, 1, true);
  tunnelGeometry.rotateX(Math.PI / 2);
  const tunnelMaterial = new THREE.MeshBasicMaterial({
    map: tunnelTexture,
    side: THREE.BackSide,
    transparent: true,
    opacity: opacity * 0.4,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const tunnel = new THREE.Mesh(tunnelGeometry, tunnelMaterial);
  tunnel.position.z = -1400;
  group.add(tunnel);

  const glowTexture = createGlowTexture();
  const glowMaterial = new THREE.SpriteMaterial({
    map: glowTexture,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const glow = new THREE.Sprite(glowMaterial);
  glow.position.z = -900;
  glow.scale.set(760, 760, 1);
  group.add(glow);

  let lastOpacity = opacity;
  return {
    update(step) {
      tunnelTexture.offset.y -= step * 0.0012;
      tunnel.rotation.z += 0.0012;
    },
    setOpacity(_streakOpacity, tileOpacity) {
      if (lastOpacity === tileOpacity) return;
      tunnelMaterial.opacity = tileOpacity * 0.4;
      glowMaterial.opacity = tileOpacity;
      lastOpacity = tileOpacity;
    },
    dispose() {
      tunnelGeometry.dispose();
      tunnelMaterial.dispose();
      tunnelTexture.dispose();
      glowMaterial.dispose();
      glowTexture.dispose();
    },
  };
}

const STREAK_SETTINGS: Record<WarpFieldVariant, StreakSettings> = {
  streaks: { count: 100, radiusMin: 30, radiusSpread: 800, lengthMin: 50, lengthSpread: 150, palette: [0x10b981, 0x059669, 0x34d399, 0xffffff], opacityScale: 0.6 },
  letters: { count: 80, radiusMin: 30, radiusSpread: 800, lengthMin: 40, lengthSpread: 120, palette: [0x10b981, 0x059669, 0x34d399, 0xffffff], opacityScale: 0.6 },
  keycaps: { count: 60, radiusMin: 30, radiusSpread: 800, lengthMin: 40, lengthSpread: 140, palette: [0x10b981, 0x34d399, 0xa7f3d0, 0xffffff], opacityScale: 0.6 },
  hyperspace: { count: 140, radiusMin: 20, radiusSpread: 760, lengthMin: 120, lengthSpread: 300, palette: [0xffffff, 0xdbeafe, 0x93c5fd, 0x60a5fa], opacityScale: 0.7 },
};

export function createWarpFieldRenderer(canvas: HTMLCanvasElement, getOptions: () => WarpFieldOptions) {
  const startOptions = getOptions();
  const variant: WarpFieldVariant = WARP_FIELD_VARIANTS.includes(startOptions.variant) ? startOptions.variant : WARP_FIELD_DEFAULTS.variant;

  const scene = new THREE.Scene();
  if (!startOptions.transparentBackground) {
    scene.background = new THREE.Color(BACKGROUND[variant]);
    scene.fog = new THREE.FogExp2(BACKGROUND[variant], 0.001);
  }

  const camera = new THREE.PerspectiveCamera(startOptions.fov || 75, 1, 0.1, 2000);
  camera.position.z = 0;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const group = new THREE.Group();
  scene.add(group);

  const layers: Layer[] = [createStreakLayer(group, STREAK_SETTINGS[variant], startOptions.streakOpacity)];
  if (variant === "hyperspace") layers.push(createHyperspaceLayer(group, startOptions.tileOpacity));

  let elapsed = 0;
  return {
    resize(width: number, height: number) {
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    },
    render() {
      const options = getOptions();
      if (camera.fov !== options.fov) {
        camera.fov = options.fov;
        camera.updateProjectionMatrix();
      }
      elapsed += 1 / 60;
      const step = options.speed * SPEED_SCALE[variant];
      layers.forEach((layer) => {
        layer.setOpacity?.(options.streakOpacity, options.tileOpacity);
        layer.update?.(step, elapsed);
      });
      renderer.render(scene, camera);
    },
    dispose() {
      layers.forEach((layer) => layer.dispose());
      renderer.dispose();
    },
  };
}
