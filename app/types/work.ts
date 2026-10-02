import * as THREE from "three";

export interface WorkTimelinePoint {
  point: THREE.Vector3;
  year: string;
  title: string;
  subtitle: string;
  certificate?: string;
  position: 'left' | 'right';
}
