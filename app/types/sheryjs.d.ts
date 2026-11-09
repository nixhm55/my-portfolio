export {};

declare global {
  interface Window {
    Shery?: {
      makeMagnet: (
        target: string | Element,
        options?: { ease?: string; duration?: number }
      ) => void;
    };
  }
}
