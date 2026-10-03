'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useCertificateStore } from '../stores/certificate';

// Ultra-lightweight Audio Manager
class SoundManager {
  private popAudio: HTMLAudioElement | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.popAudio = new Audio('/sfx/pop.wav');
      this.popAudio.preload = 'auto';
    }
  }

  playPop() {
    if (!this.popAudio) return;
    try {
      this.popAudio.currentTime = 0;
      this.popAudio.volume = 0.85;
      const playPromise = this.popAudio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
    } catch {}
  }
}

const sounds = new SoundManager();

export default function CertificateModal() {
  const { isOpen, closeCertificate, certificateImage } = useCertificateStore();
  const [isClosing, setIsClosing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      sounds.playPop();
    }
  }, [isOpen]);

  const handleClose = () => {
    if (closeTimerRef.current) return;
    setIsClosing(true);

    const canvas = containerRef.current?.querySelector('canvas');
    if (canvas) {
      canvas.classList.remove('certificate-modal-opening');
      canvas.classList.add('certificate-modal-closing');
    }

    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      setIsClosing(false);
      closeCertificate();
    }, 400);
  };

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const T = THREE;
    const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
    const REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.zIndex = '3';
    canvas.style.pointerEvents = 'none';
    canvas.classList.add('certificate-modal-opening');
    containerRef.current.appendChild(canvas);

    const renderer = new T.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.outputColorSpace = (T as any).SRGBColorSpace || (T as any).sRGBEncoding;
    renderer.toneMapping = T.NoToneMapping;

    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(24, 1, 0.1, 100);
    camera.position.set(0, 0, 8.2);

    function envTexture() {
      const w = 1024, h = 512, c = document.createElement('canvas');
      c.width = w; c.height = h;
      const x = c.getContext('2d')!;
      const g = x.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#3a3d47');
      g.addColorStop(0.46, '#171820');
      g.addColorStop(1, '#08080a');
      x.fillStyle = g;
      x.fillRect(0, 0, w, h);

      const blob = (cx: number, cy: number, rx: number, ry: number, col: string, a: string) => {
        const rg = x.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
        rg.addColorStop(0, col.replace('A', a));
        rg.addColorStop(1, col.replace('A', '0'));
        x.save();
        x.translate(cx, cy);
        x.scale(1, ry / rx);
        x.translate(-cx, -cy);
        x.fillStyle = rg;
        x.beginPath();
        x.arc(cx, cy, rx, 0, 7);
        x.fill();
        x.restore();
      };
      blob(w * 0.3, h * 0.24, 330, 240, 'rgba(255,252,246,A)', '1');
      blob(w * 0.74, h * 0.34, 240, 200, 'rgba(150,175,235,A)', '.42');
      blob(w * 0.52, h * 0.86, 420, 190, 'rgba(255,170,120,A)', '.10');
      const t = new T.CanvasTexture(c);
      t.mapping = T.EquirectangularReflectionMapping;
      t.colorSpace = (T as any).SRGBColorSpace || (T as any).sRGBEncoding;
      return t;
    }

    const pmrem = new T.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const envTex = pmrem.fromEquirectangular(envTexture()).texture;
    scene.environment = envTex;
    pmrem.dispose();

    const key = new T.DirectionalLight(0xfff6ec, 1.42);
    key.position.set(-3.3, 2.1, 2.0);
    const fill = new T.DirectionalLight(0x9fb6ff, 0.13);
    fill.position.set(3.6, -1.8, 1.6);
    const rim = new T.DirectionalLight(0xffffff, 0.1);
    rim.position.set(1.6, 1.2, -2.6);
    scene.add(key, fill, rim, new T.AmbientLight(0xffffff, 0.16));

    const touchLight = new T.PointLight(0xdfe8ff, 0, 7.5, 1.35);
    touchLight.position.set(0, 0, 1.7);
    scene.add(touchLight);

    const SW = 2.30, SH = 3.23;
    // Balanced geometry: visual sharpness intact with minimal GPU heat
    const geo = new T.PlaneGeometry(SW, SH, 52, 70);

    const uni = {
      uTime: { value: 0 },
      uAmp: { value: 1.18 },
      uFreq: { value: 4.7 },
      uTwist: { value: 1.3 },
      uSize: { value: new T.Vector2(SW, SH) },
      uFlutter: { value: 0 },
      uPhase: { value: 0 },
      uRim: { value: 0.62 },
      uRimA: { value: 0.88 },
      uSpecA: { value: 0.14 },
      uRimCol: { value: new T.Color(0xeaf2ff) }
    };

    const WAVE = `
      uniform float uTime, uAmp, uFlutter, uPhase, uFreq, uTwist;
      uniform vec2  uSize;

      float sAmp(float u, float v){ return uAmp*(0.10 + pow(u,1.35))*(0.50 + 0.64*v); }
      float sAmpV(float u){ return uAmp*(0.10 + pow(u,1.35))*0.64; }

      float sTheta(float u, float v){
        float a  = sAmp(u,v);
        float ph = uFreq*u + uTwist*v + uTime*0.40 + uPhase;
        return a*sin(ph) + uFlutter*a*0.60*sin(ph*2.35 + uTime*2.0);
      }
      float sThetaV(float u, float v){
        float a  = sAmp(u,v), da = sAmpV(u);
        float ph = uFreq*u + uTwist*v + uTime*0.40 + uPhase;
        float f  = ph*2.35 + uTime*2.0;
        return da*sin(ph) + a*cos(ph)*uTwist + uFlutter*0.60*(da*sin(f) + a*cos(f)*uTwist*2.35);
      }
      float sYoff(float u, float v){
        float w = 1.0 - 0.55*v;
        return 0.021*uSize.y*sin(2.05*u + uTime*0.47 + uPhase)
             + 0.013*uSize.y*sin(3.35*u - 1.55*v + uTime*0.63 + uPhase)*w;
      }
      float sYdU(float u, float v){
        float w = 1.0 - 0.55*v;
        return 0.0431*uSize.y*cos(2.05*u + uTime*0.47 + uPhase)
             + 0.0436*uSize.y*cos(3.35*u - 1.55*v + uTime*0.63 + uPhase)*w;
      }
      float sYdV(float u, float v){
        float ph = 3.35*u - 1.55*v + uTime*0.63 + uPhase;
        return 0.013*uSize.y*(-1.55*cos(ph)*(1.0-0.55*v) - 0.55*sin(ph));
      }

      void sheetPoint(vec2 q, out vec3 P, out vec3 NN){
        float u = q.x, v = q.y;
        float x=0.0, z=0.0, xe=0.0, ze=0.0, dxv=0.0, dzv=0.0, dxe=0.0, dze=0.0;
        const int NS = 16;
        float h = 1.0/float(NS);
        for(int i=0;i<NS;i++){
          float uu = (float(i)+0.5)*h;
          float w  = clamp((u-(uu-0.5*h))/h, 0.0, 1.0);
          float th = sTheta(uu,v);
          float dt = sThetaV(uu,v);
          float c = cos(th), sn = sin(th);
          xe += c*h;          ze += sn*h;
          dxe += -sn*dt*h;    dze +=  c*dt*h;
          x   += c*h*w;       z   += sn*h*w;
          dxv += -sn*dt*h*w;  dzv +=  c*dt*h*w;
        }
        float W = uSize.x, H = uSize.y;
        float th0 = sTheta(u,v);
        P = vec3((x - xe*0.5)*W, (v-0.5)*H + sYoff(u,v), (z - ze*0.5)*W);
        vec3 Tu = vec3(W*cos(th0), sYdU(u,v), W*sin(th0));
        vec3 Tv = vec3((dxv - dxe*0.5)*W, H + sYdV(u,v), (dzv - dze*0.5)*W);
        NN = normalize(cross(Tu, Tv));
      }
    `;

    const texLoader = new T.TextureLoader();
    const imagePath = certificateImage || '/my-certificate.jpg';
    const certTex = texLoader.load(imagePath, () => {
      certTex.colorSpace = (T as any).SRGBColorSpace || (T as any).sRGBEncoding;
      certTex.anisotropy = 4;
      certTex.needsUpdate = true;
    });

    const mat = new T.MeshPhysicalMaterial({
      map: certTex,
      color: new T.Color(0xffffff),
      side: T.DoubleSide,
      metalness: 0.0,
      roughness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      iridescence: 0.08,
      iridescenceIOR: 1.35,
      iridescenceThicknessRange: [120, 420],
      envMapIntensity: 1.15,
      specularIntensity: 1.0,
      ior: 1.5,
      transparent: true,
      alphaTest: 0.012,
      opacity: 1
    });

    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, uni);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\n' + WAVE)
        .replace('#include <beginnormal_vertex>', `
          vec3 sheetP; vec3 objectNormal;
          sheetPoint(uv, sheetP, objectNormal);
          #ifdef USE_TANGENT
            vec3 objectTangent = vec3( tangent.xyz );
          #endif
        `)
        .replace('#include <begin_vertex>', 'vec3 transformed = sheetP;');

      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uRim, uRimA, uSpecA;\nuniform vec3 uRimCol;')
        .replace('#include <alphatest_fragment>', 'if ( diffuseColor.a / max(opacity,1e-4) < alphaTest ) discard;')
        .replace('#include <output_fragment>', `
          float fres = pow(1.0 - clamp(abs(dot(geometry.normal, geometry.viewDir)),0.0,1.0), 3.2);
          outgoingLight += fres * uRim * uRimCol;
          float baseA = diffuseColor.a / max(opacity, 1e-4);
          float outA  = clamp(baseA + fres*uRimA + uSpecA*dot(outgoingLight, vec3(0.3333)), 0.0, 1.0) * opacity;
          gl_FragColor = vec4( outgoingLight, outA );
        `);
    };

    const mesh = new T.Mesh(geo, mat);
    const group = new T.Group();
    group.add(mesh);
    scene.add(group);

    const haloTex = (() => {
      const s = 256, c = document.createElement('canvas');
      c.width = c.height = s;
      const x = c.getContext('2d')!;
      const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, 'rgba(0,0,0,.55)');
      g.addColorStop(0.45, 'rgba(0,0,0,.28)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g;
      x.fillRect(0, 0, s, s);
      const t = new T.CanvasTexture(c);
      t.colorSpace = (T as any).SRGBColorSpace || (T as any).sRGBEncoding;
      return t;
    })();
    const halo = new T.Mesh(
      new T.PlaneGeometry(3.9, 4.9),
      new T.MeshBasicMaterial({ map: haloTex, transparent: true, depthWrite: false, opacity: 0.3 })
    );
    halo.position.z = -0.62;
    group.add(halo);

    let dragging = false, dragYaw = 0, dragPitch = 0, release = 0;
    let velYaw = 0, velPitch = 0, prevYaw = 0, prevPitch = 0;
    let lastPX = 0, lastPY = 0, overSheet = false, hover = 0, hoverTarget = 0;
    let quad: [number, number][] | null = null, cursorNow = '';
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const _v = new T.Vector3();

    function cornerPoint(qx: number, qy: number) {
      const t = uni.uTime.value, ph = uni.uPhase.value;
      const A = uni.uAmp.value, F = uni.uFreq.value, TWs = uni.uTwist.value;
      const u = qx, v = qy;
      const theta = (uu: number) =>
        A * (0.1 + Math.pow(uu, 1.35)) * (0.5 + 0.64 * v) * Math.sin(F * uu + TWs * v + t * 0.4 + ph);
      let x = 0, z = 0, xe = 0, ze = 0;
      const N = 12, h = 1 / N;
      for (let i = 0; i < N; i++) {
        const uu = (i + 0.5) * h, w = clamp((u - (uu - 0.5 * h)) / h, 0, 1);
        const th = theta(uu), c = Math.cos(th), s = Math.sin(th);
        xe += c * h; ze += s * h; x += c * h * w; z += s * h * w;
      }
      const yo = 0.021 * SH * Math.sin(2.05 * u + t * 0.47 + ph)
               + 0.013 * SH * Math.sin(3.35 * u - 1.55 * v + t * 0.63 + ph) * (1 - 0.55 * v);
      return _v.set((x - xe * 0.5) * SW, (v - 0.5) * SH + yo, (z - ze * 0.5) * SW);
    }

    function buildQuad() {
      const pts: [number, number][] = [];
      for (const [u, v] of [[0, 1], [1, 1], [1, 0], [0, 0]]) {
        cornerPoint(u, v).applyMatrix4(group.matrixWorld).project(camera);
        pts.push([(_v.x * 0.5 + 0.5) * containerRef.current!.clientWidth, (-_v.y * 0.5 + 0.5) * containerRef.current!.clientHeight]);
      }
      const cx = (pts[0][0] + pts[1][0] + pts[2][0] + pts[3][0]) / 4;
      const cy = (pts[0][1] + pts[1][1] + pts[2][1] + pts[3][1]) / 4;
      quad = pts.map(([x, y]) => [cx + (x - cx) * 1.07, cy + (y - cy) * 1.07]);
    }

    function inQuad(px: number, py: number) {
      if (!quad) return false;
      let sign = 0;
      for (let i = 0; i < 4; i++) {
        const [ax, ay] = quad[i], [bx, by] = quad[(i + 1) % 4];
        const c = (bx - ax) * (py - ay) - (by - ay) * (px - ax);
        if (c !== 0) {
          const s = c > 0 ? 1 : -1;
          if (sign === 0) sign = s;
          else if (s !== sign) return false;
        }
      }
      return true;
    }

    const onPointerMove = (e: PointerEvent) => {
      const rect = containerRef.current!.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      mouse.tx = (x / rect.width - 0.5) * 2;
      mouse.ty = (y / rect.height - 0.5) * 2;

      if (dragging) {
        const dx = e.clientX - lastPX, dy = e.clientY - lastPY;
        lastPX = e.clientX; lastPY = e.clientY;
        dragYaw += dx * 0.006;
        dragPitch = clamp(dragPitch - dy * 0.0045, -0.6, 0.6);
        return;
      }

      overSheet = inQuad(x, y);
      hoverTarget = overSheet ? 1 : 0;
    };

    const onPointerDown = (e: PointerEvent) => {
      const rect = containerRef.current!.getBoundingClientRect();
      if (inQuad(e.clientX - rect.left, e.clientY - rect.top)) {
        dragging = true;
        lastPX = e.clientX; lastPY = e.clientY;
        velYaw = velPitch = 0;
        prevYaw = dragYaw; prevPitch = dragPitch;
      }
    };

    const onPointerUp = () => {
      if (dragging) {
        dragging = false;
        release = 0.6;
      }
    };

    const onPointerLeaveContainer = () => {
      overSheet = false;
      hoverTarget = 0;
    };

    const el = containerRef.current;
    el.addEventListener('pointermove', onPointerMove, { passive: true });
    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointerleave', onPointerLeaveContainer);
    window.addEventListener('pointerup', onPointerUp);

    function resize() {
      if (!containerRef.current) return;
      const vw = containerRef.current.clientWidth, vh = containerRef.current.clientHeight;
      // Cap DPR to 1.5 to make Safari blur buttery-smooth
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setSize(vw, vh, false);
      camera.aspect = vw / vh;
      camera.updateProjectionMatrix();
      const visH = 2 * camera.position.z * Math.tan(T.MathUtils.degToRad(camera.fov) / 2);
      const visW = visH * camera.aspect;
      const wCap = Math.min(0.88, 0.6 + Math.max(0, 1.45 - camera.aspect) * 0.45);
      group.scale.setScalar(Math.min(visH * 0.735 / SH, visW * wCap / SW));
    }
    window.addEventListener('resize', resize);
    resize();

    const clock = new T.Clock();
    const lightPos = new T.Vector3();
    let intro = 0;
    let animId: number;

    function frame() {
      animId = requestAnimationFrame(frame);
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;
      uni.uTime.value = REDUCED ? 2.4 : t;

      intro += (1 - intro) * Math.min(1, dt * 2.5);
      mat.opacity = intro;
      halo.material.opacity = intro * 0.3;

      if (dragging) {
        const k = Math.min(1, dt * 14);
        velYaw += ((dragYaw - prevYaw) / Math.max(dt, 1e-3) - velYaw) * k;
        velPitch += ((dragPitch - prevPitch) / Math.max(dt, 1e-3) - velPitch) * k;
        velYaw = clamp(velYaw, -7, 7);
        velPitch = clamp(velPitch, -4, 4);
      } else {
        dragYaw += velYaw * dt;
        dragPitch = clamp(dragPitch + velPitch * dt, -0.6, 0.6);
        const decay = Math.pow(0.018, dt);
        velYaw *= decay; velPitch *= decay;
        release = Math.max(0, release - dt);
        if (release <= 0) {
          const home = Math.round(dragYaw / (Math.PI * 2)) * Math.PI * 2;
          const k = Math.min(1, dt * 0.55);
          dragYaw += (home - dragYaw) * k;
          dragPitch -= dragPitch * k;
        }
      }
      prevYaw = dragYaw; prevPitch = dragPitch;

      mouse.x += (mouse.tx - mouse.x) * Math.min(1, dt * 3.0);
      mouse.y += (mouse.ty - mouse.y) * Math.min(1, dt * 3.0);
      const idle = REDUCED ? 0 : 1;

      group.rotation.y = dragYaw + mouse.x * 0.16 + Math.sin(t * 0.23) * 0.045 * idle;
      group.rotation.x = dragPitch - mouse.y * 0.11 + Math.sin(t * 0.19) * 0.026 * idle;
      group.rotation.z = Math.sin(t * 0.27) * 0.018 * idle;
      group.position.y = Math.sin(t * 0.36) * 0.06 * idle;
      group.position.x = Math.sin(t * 0.21) * 0.05 * idle + mouse.x * 0.1;
      group.updateMatrixWorld();

      hover += (hoverTarget - hover) * Math.min(1, dt * 4.5);
      touchLight.intensity = hover * 2.6 * intro;
      if (hover > 0.002) {
        lightPos.set(mouse.tx, -mouse.ty, 0.5).unproject(camera).sub(camera.position).normalize();
        touchLight.position.copy(camera.position).addScaledVector(lightPos, (1.75 - camera.position.z) / lightPos.z);
      }

      buildQuad();
      const wantCursor = dragging ? 'grabbing' : overSheet ? 'grab' : 'default';
      if (wantCursor !== cursorNow) {
        cursorNow = wantCursor;
        if (el) el.style.cursor = wantCursor;
      }

      renderer.render(scene, camera);
    }

    frame();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      if (el) {
        el.removeEventListener('pointermove', onPointerMove);
        el.removeEventListener('pointerdown', onPointerDown);
        el.removeEventListener('pointerleave', onPointerLeaveContainer);
      }
      window.removeEventListener('pointerup', onPointerUp);
      if (canvas && canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
      renderer.dispose();
      geo.dispose();
      mat.dispose();
      certTex.dispose();
      haloTex.dispose();
      envTex.dispose();
    };
  }, [isOpen, certificateImage]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        // The luxury Apple glass blur you love!
        background: 'rgba(8, 8, 10, 0.45)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      className={isClosing ? 'certificate-glass-closing' : 'certificate-glass-opening'}
    >
      <style>{`
        .certificate-glass-opening {
          animation: certificateGlassOpen 600ms cubic-bezier(0.22, 1, 0.36, 1) both;
          will-change: opacity;
        }

        .certificate-glass-closing {
          animation: certificateGlassClose 350ms cubic-bezier(0.4, 0, 0.6, 1) both;
          will-change: opacity;
          pointer-events: none !important;
        }

        .certificate-modal-opening {
          animation: certificateModalOpen 600ms cubic-bezier(0.22, 1, 0.36, 1) both;
          will-change: transform, opacity;
        }

        .certificate-modal-closing {
          animation: certificateModalClose 350ms cubic-bezier(0.4, 0, 0.6, 1) both;
          will-change: transform, opacity;
          pointer-events: none !important;
        }

        @keyframes certificateGlassOpen {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes certificateGlassClose {
          from { opacity: 1; }
          to { opacity: 0; }
        }

        @keyframes certificateModalOpen {
          from { opacity: 0; transform: translate3d(0, 30px, 0); }
          to { opacity: 1; transform: translate3d(0, 0, 0); }
        }

        @keyframes certificateModalClose {
          from { opacity: 1; transform: translate3d(0, 0, 0); }
          to { opacity: 0; transform: translate3d(0, 30px, 0); }
        }
      `}</style>

      <button
        onClick={handleClose}
        style={{
          position: 'fixed',
          top: '28px',
          left: '28px',
          zIndex: 100,
          background: 'rgba(255, 255, 255, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          color: '#ffffff',
          padding: '8px 18px',
          borderRadius: '20px',
          fontSize: '12px',
          letterSpacing: '0.05em',
          cursor: 'pointer',
          backdropFilter: 'blur(8px)',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
      >
        ✕ Close
      </button>

      <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }} />

      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: '32px', zIndex: 10, pointerEvents: 'none',
        textAlign: 'center', fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase',
        color: 'rgba(242, 242, 240, 0.4)'
      }}>
        <b style={{ color: 'rgba(242, 242, 240, 0.8)' }}>Drag</b> to turn it &nbsp;·&nbsp; <b style={{ color: 'rgba(242, 242, 240, 0.8)' }}>Hover</b> to light it
      </div>
    </div>
  );
}
