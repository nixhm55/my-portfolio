'use client';

import EverestExperience from "./components/EverestExperience";
import CertificateModal from "./components/CertificateModal";

const Home = () => {
  return (
    <>
      <main className="bg-black min-h-screen">
        <EverestExperience />
      </main>

      <CertificateModal />
    </>
  );
};

export default Home;
