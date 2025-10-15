// Landing page with certificate validation
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import HeroSection from "@/components/landing/HeroSection";
import { ConsultaCertificado } from "@/components/landing/ConsultaCertificado";
import BeneficiosSection from "@/components/landing/BeneficiosSection";
import ComoFuncionaSection from "@/components/landing/ComoFuncionaSection";
import FooterPublico from "@/components/landing/FooterPublico";

export default function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect logged-in users to dashboard
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

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
