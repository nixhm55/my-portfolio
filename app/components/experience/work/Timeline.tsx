import { Box, Edges, Line, Text, TextProps } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { usePortalStore } from "@stores";
import { useCertificateStore } from "../../../stores/certificate";
import gsap from "gsap";
import { useEffect, useMemo, useRef, useState } from "react";
import { isMobile } from "react-device-detect";
import * as THREE from "three";

import { WORK_TIMELINE } from "@constants";
import { WorkTimelinePoint } from "@types";

const reusableLeft = new THREE.Vector3(-0.3, 0, -0.1);
const reusableRight = new THREE.Vector3(0.3, 0, -0.1);

const TimelinePoint = ({ point, diff }: { point: WorkTimelinePoint, diff: number }) => {
  const { camera, raycaster } = useThree();
  const certGroupRef = useRef<THREE.Group>(null);
  const [isHovered, setIsHovered] = useState(false);
  const openCertificate = useCertificateStore((state) => state.openCertificate);

  const hasCertificate = Boolean(
    point.certificate ||
    point.subtitle?.toLowerCase().includes('plus') ||
    point.subtitle?.toLowerCase().includes('two') ||
    point.subtitle?.toLowerCase().includes('one') ||
    String(point.year).includes('2024') ||
    String(point.year).includes('2025')
  );

  const certificatePath = useMemo(() => {
    const sub = (point.subtitle || '').toLowerCase();
    const yr = String(point.year || '');

    if (sub.includes('two') || yr.includes('2025')) {
      return '/plus-two-certificate.jpg';
    }
    if (sub.includes('one') || yr.includes('2024')) {
      return '/my-certificate.jpg';
    }
    if (typeof point.certificate === 'string' && point.certificate.trim() !== '') {
      return point.certificate;
    }
    return '/my-certificate.jpg';
  }, [point]);

  const getPoint = useMemo(() => {
    switch (point.position) {
      case 'left': return reusableLeft;
      case 'right': return reusableRight;
      default: return new THREE.Vector3();
    }
  }, [point.position]);

  const textAlign = point.position === 'left' ? 'right' : 'left';

  const textProps: Partial<TextProps> = useMemo(() => ({
    font: "./Vercetti-Regular.woff",
    color: "white",
    anchorX: textAlign,
    fillOpacity: 2 - 2 * diff,
  }), [textAlign, diff]);

  const titleProps = useMemo(() => ({
    ...textProps,
    font: "./soria-font.ttf",
    fontSize: 0.6,
    maxWidth: 3,
  }), [textProps]);

  useEffect(() => {
    if (!hasCertificate) return;

    let startX = 0;
    let startY = 0;
    let startTime = 0;

    const checkHit = (clientX: number, clientY: number) => {
      if (!certGroupRef.current || diff > 0.4) return false;

      const mouse = new THREE.Vector2(
        (clientX / window.innerWidth) * 2 - 1,
        -(clientY / window.innerHeight) * 2 + 1
      );
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(certGroupRef.current.children, true);
      if (hits.length > 0) return true;

      const worldPos = new THREE.Vector3();
      certGroupRef.current.getWorldPosition(worldPos);
      const screenPos = worldPos.clone().project(camera);
      if (screenPos.z > 1) return false;

      const sx = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
      const sy = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;

      const dx = Math.abs(clientX - sx);
      const dy = Math.abs(clientY - sy);
      return dx < (isMobile ? 50 : 75) && dy < (isMobile ? 25 : 30);
    };

    const onPointerDown = (e: PointerEvent) => {
      startX = e.clientX;
      startY = e.clientY;
      startTime = performance.now();
    };

    const onPointerUp = (e: PointerEvent) => {
      const dist = Math.hypot(e.clientX - startX, e.clientY - startY);
      const duration = performance.now() - startTime;

      // സ്ക്രോൾ ചെയ്യുമ്പോൾ (dist > 10px) സർട്ടിഫിക്കറ്റ് ഓപ്പൺ ആകില്ല
      if (dist < 10 && duration < 350) {
        if (checkHit(e.clientX, e.clientY)) {
          openCertificate(certificatePath);
        }
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (isMobile) return; // മൊബൈലിൽ അനാവശ്യ റേകാസ്റ്റിംഗ് ഒഴിവാക്കുന്നു
      const hit = checkHit(e.clientX, e.clientY);
      setIsHovered(hit);
      document.body.style.cursor = hit ? 'pointer' : 'auto';
    };

    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    if (!isMobile) {
      window.addEventListener('pointermove', onPointerMove, { passive: true });
    }

    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      if (!isMobile) {
        window.removeEventListener('pointermove', onPointerMove);
      }
      document.body.style.cursor = 'auto';
    };
  }, [camera, raycaster, hasCertificate, certificatePath, openCertificate, diff]);

  return (
    <group position={point.point} scale={isMobile ? 0.35 : 0.6}>
      <Box args={[0.2, 0.2, 0.2]} position={[0, 0, -0.1]} scale={[1 - diff, 1 - diff, 1 - diff]}>
        <meshBasicMaterial color="white" wireframe />
        <Edges color="white" lineWidth={1.5} />
      </Box>
      <group>
        <group position={getPoint}>
          <Text {...textProps} fontSize={0.3} position={[-diff / 2, 0, 0]}>
            {point.year}
          </Text>
          <group position={[0, -0.5, 0]}>
            <Text {...titleProps} fontSize={0.6} maxWidth={3} position={[0, -diff / 2, 0]}>
              {point.title}
            </Text>
            <Text {...textProps} fontSize={0.2} position={[0, -0.4 - diff, 0]}>
              {point.subtitle}
            </Text>

            {hasCertificate && (
              <group ref={certGroupRef} position={[0, -0.68 - diff, 0]}>
                <Text
                  {...textProps}
                  fontSize={0.16}
                  fillOpacity={isHovered ? 1 : 0.75}
                >
                  Certificate ↗
                </Text>
                <mesh position={[textAlign === 'right' ? -0.52 : 0.52, -0.11, 0]}>
                  <planeGeometry args={[1.05, 0.01]} />
                  <meshBasicMaterial
                    color="white"
                    transparent
                    opacity={isHovered ? 0.9 : 0.25}
                  />
                </mesh>
                <mesh position={[textAlign === 'right' ? -0.52 : 0.52, 0, 0.05]}>
                  <planeGeometry args={[1.6, 0.5]} />
                  <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                </mesh>
              </group>
            )}
          </group>
        </group>
      </group>
    </group>
  );
};

const Timeline = ({ progress }: { progress: number }) => {
  const { camera } = useThree();
  const isActive = usePortalStore((state) => state.activePortalId === 'work');
  const timeline = useMemo(() => WORK_TIMELINE, []);

  const curve = useMemo(() => new THREE.CatmullRomCurve3(timeline.map(p => p.point), false), [timeline]);
  const curvePoints = useMemo(() => curve.getPoints(500), [curve]);
  const visibleCurvePoints = useMemo(() => curvePoints.slice(0, Math.max(1, Math.ceil(progress * curvePoints.length))), [curvePoints, progress]);
  const visibleTimelinePoints = useMemo(() => timeline.slice(0, Math.max(1, Math.round(progress * (timeline.length - 1) + 1))), [timeline, progress]);

  const [visibleDashedCurvePoints, setVisibleDashedCurvePoints] = useState<THREE.Vector3[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useFrame((_, delta) => {
    if (isActive) {
      const safeDelta = Math.min(delta, 0.05); // ഫ്രെയിം ഡ്രോപ്പിൽ ക്യാമറ തെറിച്ചുപോകാതിരിക്കാൻ
      const position = curve.getPoint(progress);
      camera.position.x = THREE.MathUtils.damp(camera.position.x, (isMobile ? -1 : -2) + position.x, 4, safeDelta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, -39 + position.z, 4, safeDelta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, 13 - position.y, 4, safeDelta);
    }
  });

  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    const tl = gsap.timeline();
    if (groupRef.current) {
      tl.to(groupRef.current.scale, {
        x: isActive ? 1 : 0,
        y: isActive ? 1 : 0,
        z: isActive ? 1 : 0,
        duration: 0.8,
        ease: "power2.inOut",
      });
      tl.to(groupRef.current.position, {
        y: isActive ? 0 : -2,
        duration: 0.8,
        ease: "power2.inOut",
      }, 0);
    }

    if (isActive) {
      let i = 0;
      clearInterval(intervalRef.current!);
      setTimeout(() => {
        intervalRef.current = setInterval(() => {
          const p = i++ / 100;
          setVisibleDashedCurvePoints(curvePoints.slice(0, Math.max(1, Math.ceil(p * curvePoints.length))));
          if (i > 100 && intervalRef.current) clearInterval(intervalRef.current);
        }, 10);
      }, 800);
    } else {
      clearInterval(intervalRef.current!);
      setTimeout(() => setVisibleDashedCurvePoints([]), 800);
    }

    return () => clearInterval(intervalRef.current!);
  }, [isActive, curvePoints]);

  return (
    <group position={[0, -0.1, -0.1]}>
      <Line points={visibleCurvePoints} color="white" lineWidth={3} />
      {visibleDashedCurvePoints.length > 0 && (
        <Line
          points={visibleDashedCurvePoints}
          color="white"
          lineWidth={0.5}
          dashed
          dashSize={0.25}
          gapSize={0.25}
        />
      )}
      <group ref={groupRef}>
        {visibleTimelinePoints.map((point, i) => {
          const diff = Math.min(2 * Math.max(i - (progress * (timeline.length - 1)), 0), 1);
          return <TimelinePoint point={point} key={i} diff={diff} />;
        })}
      </group>
    </group>
  );
};

export default Timeline;
