import { create } from 'zustand';
import { Certificate } from '../types';

interface CertificateState {
  isOpen: boolean;
  /** The document currently being viewed; set by `openCertificate`. */
  certificate: Certificate | null;
  openCertificate: (certificate: Certificate) => void;
  closeCertificate: () => void;
}

export const useCertificateStore = create<CertificateState>((set) => ({
  isOpen: false,
  certificate: null,
  openCertificate: (certificate) => set({ isOpen: true, certificate }),
  // The document is kept on close so the modal's exit animation can keep
  // rendering the texture it already loaded.
  closeCertificate: () => set({ isOpen: false }),
}));