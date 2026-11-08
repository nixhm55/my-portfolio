'use client';

import CanvasLoader from "./components/common/CanvasLoader";
import ScrollWrapper from "./components/common/ScrollWrapper";
import Experience from "./components/experience";
import Footer from "./components/footer";
import Hero from "./components/hero";
import CertificateModal from "./components/CertificateModal";

const Home = () => {
  return (
    <>
      <CanvasLoader>
        <ScrollWrapper>
          <Hero />
          <Experience />
          <Footer />
        </ScrollWrapper>
      </CanvasLoader>

      <CertificateModal />
    </>
  );
};

export default Home;
