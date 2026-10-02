import * as THREE from "three";
import { WorkTimelinePoint } from "../types";

export const WORK_TIMELINE: WorkTimelinePoint[] = [
  {
    point: new THREE.Vector3(3, 0, 0),
    year: '2023',
    title: 'KAKKAT',
    subtitle: 'SSLC',
    position: 'right',
  },
  {
    point: new THREE.Vector3(-4, -4, -3),
    year: '2024',
    title: 'GHSS KAKKAT',
    subtitle: 'Plus One',
    certificate: '/certificate',
    position: 'left',
  },
  {
    point: new THREE.Vector3(-3, -1, -6),
    year: '2025',
    title: 'GHSS KAKKAT',
    subtitle: 'Plus Two',
    position: 'left',
  },
  {
    point: new THREE.Vector3(0, -1, -10),
    year: '2026',
    title: 'LiveWire',
    subtitle: 'Python',
    position: 'left',
  },
  {
    point: new THREE.Vector3(1, 1, -12),
    year: new Date().toLocaleDateString('default', { year: 'numeric' }),
    title: 'Living...',
    subtitle: '',
    position: 'right',
  }
]