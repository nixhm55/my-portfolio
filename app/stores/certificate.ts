import { create } from 'zustand';

interface CertificateState {
  isOpen: boolean;
  certificateImage: string;
  openCertificate: (image?: string) => void;
  closeCertificate: () => void;
}

export const useCertificateStore = create<CertificateState>((set) => ({
  isOpen: false,
  certificateImage: '/my-certificate.jpg',
  openCertificate: (image = '/my-certificate.jpg') =>
    set({ isOpen: true, certificateImage: image }),
  closeCertificate: () => set({ isOpen: false }),
}));
