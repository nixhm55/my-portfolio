import * as THREE from "three";

/**
 * A document the viewer can open from a timeline point.
 *
 * Declared explicitly on the point itself — nothing in the rendering layer
 * infers a document from the title, subtitle or year. `src` must resolve to a
 * real file in `public/`; every entry in `WORK_TIMELINE` is verified on disk.
 */
export interface Certificate {
  /** Path under `public/`, e.g. '/my-certificate.jpg'. */
  src: string;
  /** Describes the document for assistive technology. */
  alt: string;
  /** Short human-readable name, used as the viewer's accessible label. */
  label: string;
}

export interface WorkTimelinePoint {
  point: THREE.Vector3;
  year: string;
  title: string;
  subtitle: string;
  /** Present only when the point has a document to open. */
  certificate?: Certificate;
  position: 'left' | 'right';
}