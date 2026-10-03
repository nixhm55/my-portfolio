import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { isMobile } from 'react-device-detect';

/**
 * Partially AI Generated
 */
const ProgressLoader = ({ progress }: { progress: number }) => {
  const strokeWidth = 3;
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  const [isDone, setIsDone] = useState(false);
  const [destroyed, setDestroyed] = useState(false);

  // Effect to update dimensions on window resize
  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const clampedProgress = Math.max(0, Math.min(100, progress));
  const isPhone = isMobile || (windowSize.width > 0 && windowSize.width < 768);

  // Disappear only on mobile devices after loading completes.
  // On desktop / laptop, the line remains permanently visible.
  useEffect(() => {
    if (isPhone && clampedProgress >= 100) {
      const fadeTimer = setTimeout(() => {
        setIsDone(true);
      }, 400);

      const destroyTimer = setTimeout(() => {
        setDestroyed(true);
      }, 1200);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(destroyTimer);
      };
    }
  }, [clampedProgress, isPhone]);

  if (isPhone && destroyed) return null;

  const svgWidth = Math.max(0, windowSize.width - 16);
  const svgHeight = Math.max(0, windowSize.height - 16);

  const halfStroke = 1;
  const rectWidth = Math.max(0, svgWidth - strokeWidth);
  const rectHeight = Math.max(0, svgHeight - strokeWidth);

  const perimeter = rectWidth > 0 && rectHeight > 0 ? (rectWidth * 2) + (rectHeight * 2) : 0;
  const strokeDashoffset = perimeter - (perimeter * clampedProgress) / 100;

  if (svgWidth <= strokeWidth || svgHeight <= strokeWidth) {
    return null;
  }

  return (
    <div
      className="fixed top-0 left-0 w-full h-full flex items-center justify-center pointer-events-none"
      style={{
        padding: '1rem',
        opacity: isPhone && isDone ? 0 : 1,
        transition: 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        style={{ display: svgWidth > 0 && svgHeight > 0 ? 'block' : 'none' }}
      >
        <rect
          x={halfStroke}
          y={halfStroke}
          width={rectWidth}
          height={rectHeight}
          fill="none"
          strokeWidth={strokeWidth}
          stroke="rgba(0, 0, 0, 0.2)"
        />
        <rect
          x={halfStroke}
          y={halfStroke}
          width={rectWidth}
          height={rectHeight}
          fill="none"
          strokeWidth={strokeWidth}
          stroke="rgba(255, 255, 255, 0.7)"
          style={{
            strokeDasharray: perimeter,
            strokeDashoffset: strokeDashoffset,
            transition: 'stroke-dashoffset 1s ease-in-out',
          }}
        />
      </svg>
    </div>
  );
};

export default dynamic(() => Promise.resolve(ProgressLoader), { ssr: false });
