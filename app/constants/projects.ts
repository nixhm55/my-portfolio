import { Project } from "../types";

/**
 * Projects shown in the 3D carousel.
 *
 * URL policy:
 * - `url` is only set when the project actually has a public address a visitor
 *   can open. A project without one simply omits the field, which is what the
 *   carousel checks before rendering its "VIEW" affordance.
 * - Placeholder entries link to the root of `example.com`, a domain permanently
 *   reserved for documentation and examples. Note it only serves the bare root:
 *   any subpath (`example.com/anything`) returns 404, so the URL is kept
 *   path-less rather than dressed up as a per-project route that would dead-end
 *   for visitors.
 *
 * `featured` is intentionally left unset everywhere so every card keeps the
 * same dashed outline; setting it swaps the card border for solid edges.
 *
 * TODO: Move this to an API
 */
export const PROJECTS: Project[] = [

  {
    title: 'VOID',
    date: '    2026',
    subtext: 'Where music meets motion. An immersive listening experience shaped by liquid glass, cinematic visuals, and fluid interactions.',
    url: 'https://void-six-cyan.vercel.app',
  },
 
];