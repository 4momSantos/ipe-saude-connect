import { useEffect, useCallback, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Shield, Hospital, Users, FileCheck } from "lucide-react";

const slides = [
  {
    title: "Sistema de Credenciamento Digital",
    subtitle: "Seguro, Rápido e Transparente",
    description: "Gerencie todo o processo de credenciamento com tecnologia de ponta",
    icon: Shield,
    gradient: "from-blue-600/20 to-purple-600/20"
  },
  {
    title: "Certificados Digitais Verificáveis",
    subtitle: "Validação em Tempo Real",
    description: "Autenticidade garantida com sistema de validação público",
    icon: FileCheck,
    gradient: "from-green-600/20 to-emerald-600/20"
  },
  {
    title: "Gestão Completa de Prestadores",
    subtitle: "Tudo em um Só Lugar",
    description: "Controle total sobre documentação, contratos e certificados",
    icon: Hospital,
    gradient: "from-orange-600/20 to-amber-600/20"
  },
  {
    title: "Acesso para Todos os Públicos",
    subtitle: "Segurados, Prestadores e Gestores",
    description: "Plataforma integrada com perfis específicos para cada usuário",
    icon: Users,
    gradient: "from-purple-600/20 to-pink-600/20"
  }
];

export default function HeroWithCarousel() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });

  const scrollTo = useCallback(
    (index: number) => emblaApi && emblaApi.scrollTo(index),
    [emblaApi]
  );

  // Auto-play manual
  useEffect(() => {
    if (!emblaApi) return;
    
    const interval = setInterval(() => {
      emblaApi.scrollNext();
    }, 5000);

    return () => clearInterval(interval);
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    };

    emblaApi.on("select", onSelect);
    onSelect();

    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-muted/50 to-background py-12 md:py-20">
      <div className="container mx-auto px-4">
        <div className="overflow-hidden rounded-2xl" ref={emblaRef}>
          <div className="flex">
            {slides.map((slide, index) => (
              <div key={index} className="flex-[0_0_100%] min-w-0">
                <div className={`relative h-[400px] md:h-[500px] rounded-2xl bg-gradient-to-br ${slide.gradient} flex items-center justify-center p-8 md:p-12`}>
                  <div className="text-center space-y-6 max-w-3xl">
                    <div className="inline-flex p-6 bg-background/10 backdrop-blur-sm rounded-full">
                      <slide.icon className="h-16 w-16 md:h-20 md:w-20 text-foreground" />
                    </div>
                    <div className="space-y-3">
                      <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
                        {slide.title}
                      </h1>
                      <p className="text-xl md:text-2xl text-primary font-semibold">
                        {slide.subtitle}
                      </p>
                      <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
                        {slide.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dots de navegação */}
        <div className="flex justify-center gap-2 mt-6">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={`h-2 rounded-full transition-all ${
                index === selectedIndex 
                  ? "w-8 bg-primary" 
                  : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              }`}
              aria-label={`Ir para slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
