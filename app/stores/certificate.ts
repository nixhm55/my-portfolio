import { create } from 'zustand';

interface CertificateState {
  isOpen: boolean;
  openCertificate: () => void;
  closeCertificate: () => void;
}

export const useCertificateStore = create<CertificateState>((set) => ({
  isOpen: false,
  openCertificate: () => set({ isOpen: true }),
  closeCertificate: () => set({ isOpen: false }),
}));
