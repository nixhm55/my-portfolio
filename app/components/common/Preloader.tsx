'use client';

const Preloader = () => {
  // Asset and shader preloading is already handled by <Preload all /> in CanvasLoader.
  // Avoid mounting duplicate GLTF scene graphs on frame 0 to eliminate cold-start lag.
  return null;
};

export default Preloader;
