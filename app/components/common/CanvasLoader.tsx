'use client';

import { useGSAP } from "@gsap/react";
import { AdaptiveDpr, Preload, ScrollControls, useProgress } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import gsap from "gsap";
import { Suspense, useEffect, useRef, useSyncExternalStore } from "react";
import { isMobile } from "react-device-detect";

import { useThemeStore } from "@stores";

import AwwardsBadge from "./AwwardsBadge";
import Preloader from "./Preloader";
import ProgressLoader from "./ProgressLoader";
import { ScrollHint } from "./ScrollHint";
import ThemeSwitcher from "./ThemeSwitcher";
// import {Perf} from "r3f-perf"

const CanvasLoader = (props: { children: React.ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const backgroundColor = useThemeStore((state) => state.theme.color);
  const { progress } = useProgress();
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);

  // തീം മാറുമ്പോൾ Safari-യുടെ ടോപ്പ് ബാറും ഒപ്പം മാറാൻ
  useEffect(() => {
    if (typeof window !== "undefined") {
      document.body.style.backgroundColor = backgroundColor;

      let meta = document.querySelector('meta[name="theme-color"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'theme-color');
        document.head.appendChild(meta);
      }

      // Safari ബാർ ഡാർക്ക് മോഡിൽ ഡിം ആകുന്നതുകൊണ്ട്, ലൈറ്റ് ബ്ലൂ വരുമ്പോൾ
      // അതിലേക്ക് കുറച്ചുകൂടി ബ്രൈറ്റ് ആയ ബ്ലൂ നൽകുന്നു (ഇതോടെ രണ്ടും ഒരേ ലൈറ്റ് ബ്ലൂ ആയി മാറും)
      const isLightMode = backgroundColor !== '#0a0a0a' && backgroundColor !== '#010101' && backgroundColor !== '#000000';
      const safariColor = isLightMode ? '#62c9fa' : backgroundColor;

      meta.setAttribute('content', safariColor);
    }
  }, [backgroundColor]);

  const canvasStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    opacity: 0,
    overflow: "hidden",
    ...(mounted && !isMobile && {
      inset: '1rem',
      width: 'calc(100% - 2rem)',
      height: 'calc(100% - 2rem)',
    }),
  };

  useGSAP(() => {
    if (progress === 100) {
      gsap.to('.base-canvas', { opacity: 1, duration: 3, delay: 1 });
    }
  }, [progress]);

  useGSAP(() => {
    gsap.to(ref.current, {
      backgroundColor: backgroundColor,
      duration: 1,
    });
    gsap.to(canvasRef.current, {
      backgroundColor: backgroundColor,
      duration: 1,
      ...noiseOverlayStyle,
    });
  }, [backgroundColor]);

  const noiseOverlayStyle = {
    backgroundBlendMode: "soft-light",
    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 600'%3E%3Cfilter id='a'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23a)'/%3E%3C/svg%3E\")",
    backgroundRepeat: "repeat",
    backgroundSize: "100px",
  };

  return (
    <div className="h-[100dvh] wrapper relative">
      <div className="h-[100dvh] relative" ref={ref}>
        <Canvas 
          className="base-canvas"
          style={canvasStyle}
          ref={canvasRef}
          dpr={[1, 1.5]}
          gl={{ powerPreference: 'high-performance', antialias: false }}
        >
          {/* <Perf/> */}
          <Suspense fallback={null}>
            <ambientLight intensity={0.5} />

            <ScrollControls pages={4} damping={0.25} maxSpeed={1} distance={1} style={{ zIndex: 1 }}>
              {props.children}
              <Preloader />
            </ScrollControls>

            <Preload all />
          </Suspense>
          <AdaptiveDpr pixelated/>
        </Canvas>
        <ProgressLoader progress={progress} />
      </div>
      <AwwardsBadge />
      <ThemeSwitcher />
      <ScrollHint />
    </div>
  );
};

export default CanvasLoader;
