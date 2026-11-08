import * as THREE from "three";
import { WorkTimelinePoint } from "../types";

/**
 * Work history shown as a 3D timeline.
 *
 * Each point declares its own certificate — `src` must point at a real file in
 * `public/`. Nothing here is inferred from the year or subtitle.
 */
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
    certificate: {
      src: '/my-certificate.jpg',
      alt: 'Plus One mark sheet of Mohammed Nisam, GHSS Kakkat, 2024.',
      label: 'Plus One Certificate',
    },
    position: 'left',
  },
  {
    point: new THREE.Vector3(-3, -1, -6),
    year: '2025',
    title: 'GHSS KAKKAT',
    subtitle: 'Plus Two',
    certificate: {
      src: '/plus-two-certificate.jpg',
      alt: 'Plus Two mark sheet of Mohammed Nisam, GHSS Kakkat, 2025.',
      label: 'Plus Two Certificate',
    },
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