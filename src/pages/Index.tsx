import HeroSection from "@/components/landing/HeroSection";
import ConsultaCertificado from "@/components/landing/ConsultaCertificado";
import BeneficiosSection from "@/components/landing/BeneficiosSection";
import ComoFuncionaSection from "@/components/landing/ComoFuncionaSection";
import FooterPublico from "@/components/landing/FooterPublico";

export default function Index() {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <ConsultaCertificado />
      <BeneficiosSection />
      <ComoFuncionaSection />
      <FooterPublico />
    </div>
  );
}
