/*
Design Philosophy: Urban Brutalism con Street Art puertorriqueño
- Geometría audaz, contraste alto, tipografía industrial
- Bloques desplazados que imitan vallas publicitarias
- Bordes gruesos en naranja, texturas de concreto
*/

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Menu, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import ParadasMap from "@/components/ParadasMap";
import { trpc } from "@/lib/trpc";

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [stats, setStats] = useState({
    zones: 0,
    vehicles: 0,
    hours: 0,
  });
  
  const statsRef = useRef<HTMLDivElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);
  
  // Contact form state
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    telefono: "",
    mensaje: "",
  });
  
  const sendEmailMutation = trpc.contact.sendEmail.useMutation({
    onSuccess: () => {
      alert("¡Mensaje enviado correctamente! Nos pondremos en contacto pronto.");
      setFormData({ nombre: "", email: "", telefono: "", mensaje: "" });
    },
    onError: (error) => {
      alert("Error al enviar el mensaje. Por favor intente nuevamente.");
      console.error("Contact form error:", error);
    },
  });

  // Animated counter for stats
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          
          const duration = 2000;
          const steps = 60;
          const stepDuration = duration / steps;
          
          const targets = { zones: 400, vehicles: 670000, hours: 8760 };
          
          let currentStep = 0;
          const interval = setInterval(() => {
            currentStep++;
            const progress = currentStep / steps;
            
            setStats({
              zones: Math.floor(targets.zones * progress),
              vehicles: Math.floor(targets.vehicles * progress),
              hours: Math.floor(targets.hours * progress),
            });
            
            if (currentStep >= steps) {
              clearInterval(interval);
              setStats(targets);
            }
          }, stepDuration);
          
          return () => clearInterval(interval);
        }
      },
      { threshold: 0.3 }
    );
    
    if (statsRef.current) {
      observer.observe(statsRef.current);
    }
    
    return () => observer.disconnect();
  }, [hasAnimated]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    sendEmailMutation.mutate(formData);
  };

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-sm border-b-4 border-[#1a4d3c]" style={{backgroundColor: 'rgba(255, 255, 255, 0.85)'}}>
        <div className="container flex items-center justify-between h-20">
          <img 
            src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663148968393/YbohNlnEDVQCkCgw.png" 
            alt="Streetview Media" 
            className="h-12"
          />
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#inicio" onClick={(e) => handleNavClick(e, '#inicio')} className="text-body font-medium hover:text-[#ff6b35] transition-colors">Inicio</a>
            <a href="#nosotros" onClick={(e) => handleNavClick(e, '#nosotros')} className="text-body font-medium hover:text-[#ff6b35] transition-colors">Nosotros</a>
            <a href="#servicios" onClick={(e) => handleNavClick(e, '#servicios')} className="text-body font-medium hover:text-[#ff6b35] transition-colors">Servicios</a>
            <a href="#contacto" onClick={(e) => handleNavClick(e, '#contacto')} className="text-body font-medium hover:text-[#ff6b35] transition-colors">Contacto</a>
          </div>
          
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[#1a4d3c] hover:text-[#ff6b35] transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
        
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t-2 border-[#1a4d3c]">
            <div className="container py-4 flex flex-col gap-4">
              <a href="#inicio" onClick={(e) => handleNavClick(e, '#inicio')} className="text-body font-medium text-lg py-2 hover:text-[#ff6b35] transition-colors">Inicio</a>
              <a href="#nosotros" onClick={(e) => handleNavClick(e, '#nosotros')} className="text-body font-medium text-lg py-2 hover:text-[#ff6b35] transition-colors">Nosotros</a>
              <a href="#servicios" onClick={(e) => handleNavClick(e, '#servicios')} className="text-body font-medium text-lg py-2 hover:text-[#ff6b35] transition-colors">Servicios</a>
              <a href="#contacto" onClick={(e) => handleNavClick(e, '#contacto')} className="text-body font-medium text-lg py-2 hover:text-[#ff6b35] transition-colors">Contacto</a>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section - Video */}
      <section id="inicio" className="relative h-screen mt-20">
        <div className="absolute inset-0 bg-[#1a4d3c]">
          <video 
            autoPlay 
            loop 
            muted 
            playsInline
            className="w-full h-full object-cover"
          >
            <source src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663148968393/GnIjzAPVbfuLkxle.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a4d3c]/80 to-transparent"></div>
        </div>
        <div className="relative h-full container flex items-center">
          <div className="max-w-2xl">
            <h1 className="text-display text-5xl md:text-6xl text-white mb-6 leading-tight">
              Tu Marca en el Camino
            </h1>
            <p className="text-body text-xl text-white/90 mb-8 max-w-xl">
              La nueva red de publicidad exterior especializada en mobiliario urbano de alto impacto en Puerto Rico.
            </p>
            <Button 
              size="lg" 
              onClick={() => {
                const mapSection = document.getElementById('mapa');
                if (mapSection) {
                  mapSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
              className="bg-[#ff6b35] hover:bg-[#e65a25] text-white text-display text-xl px-8 py-6 h-auto border-4 border-[#ff6b35] hover:border-white transition-all"
            >
              Ver Localizaciones
            </Button>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="nosotros" className="py-24 bg-white relative texture-concrete">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-display text-4xl md:text-5xl text-[#1a4d3c] mb-6">
                Tu Marca en el Camino
              </h2>
              <p className="text-body text-lg text-[#2a2a2a] leading-relaxed mb-6">
                Llegamos para revitalizar el paisaje urbano. Somos la nueva red de publicidad exterior especializada en mobiliario urbano de alto impacto.
              </p>
              <div className="border-l-8 border-[#ff6b35] pl-6 mb-8">
                <p className="text-body text-lg text-[#2a2a2a] leading-relaxed">
                  Gestionamos las ubicaciones más codiciadas del área metropolitana, transformando simples puntos de espera en poderosas Paradas de Guagua visuales. Nuestro objetivo es ofrecerle a su marca una presencia inevitable en las zonas de mayor tráfico.
                </p>
              </div>
              <p className="text-body text-lg text-[#2a2a2a] leading-relaxed">
                
              </p>
            </div>
            <div className="relative">
              <img 
                src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663148968393/akCQAUPPSFjmkLQn.png"
                alt="Parada de guagua con publicidad"
                className="w-full shadow-2xl border-8 border-[#1a4d3c]"
              />
              <div className="absolute -bottom-6 -right-6 w-48 h-48 bg-[#ff6b35] -z-10"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Second About Image */}
      <section className="py-24 bg-[#f5f5f5] relative">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="relative order-2 md:order-1">
              <img 
                src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663148968393/RdXjWiUfDHukhAsL.png"
                alt="Parada de guagua con publicidad"
                className="w-full shadow-2xl border-8 border-[#ff6b35]"
              />
              <div className="absolute -top-6 -left-6 w-48 h-48 bg-[#1a4d3c] -z-10"></div>
            </div>
            <div className="order-1 md:order-2">
              <p className="text-body text-lg text-[#2a2a2a] leading-relaxed mb-6">
                En Puerto Rico, el trayecto es parte de la vida diaria. Aprovechamos esa rutina para generar una frecuencia de impacto inigualable. Al estar integrados naturalmente en el entorno urbano, logramos que su mensaje deje de ser solo un anuncio y se convierta en una referencia visual constante en la mente del consumidor.
              </p>
              <p className="text-body text-lg text-[#2a2a2a] leading-relaxed">
                Asegure su espacio en las rutas clave de Puerto Rico.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section 
        ref={statsRef}
        className="py-20 bg-[#1a4d3c] relative diagonal-cut-top diagonal-cut-bottom texture-concrete"
      >
        <div className="container">
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
                <div className="text-display text-6xl text-[#ff6b35] mb-2">
                  {stats.zones}
                </div>
              <div className="text-body text-xl text-white uppercase tracking-wider">
                Zonas Estratégicas
              </div>
            </div>
            <div className="text-center border-l-4 border-r-4 border-[#ff6b35]">
                <div className="text-display text-6xl text-[#ff6b35] mb-2">
                  {stats.vehicles.toLocaleString()}K+
                </div>
              <div className="text-body text-xl text-white uppercase tracking-wider">
                Vehículos Diarios
              </div>
            </div>
            <div className="text-center">
                <div className="text-display text-6xl text-[#ff6b35] mb-2">
                  {stats.hours.toLocaleString()}
                </div>
              <div className="text-body text-xl text-white uppercase tracking-wider">
                Horas de Visibilidad
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Formats Section */}
      <section id="servicios" className="py-24 bg-white relative">
        <div className="container">
          <h2 className="text-display text-4xl md:text-5xl text-[#1a4d3c] mb-4 text-center">
            Formatos:
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto mt-16">
            <Card className="border-4 border-[#1a4d3c] p-8 bg-white shadow-none hover:shadow-2xl transition-shadow">
              <h3 className="text-display text-3xl text-[#1a4d3c] mb-4">
                PARADA FIJA
              </h3>
              <p className="text-body text-lg text-[#2a2a2a]">
                Para una presencia constante, este formato le otorga la propiedad completa del espacio visual. Su marca disfruta de una exposición total las 24 horas del día en un panel impreso de 48.5 pulgadas de ancho por 69 de alto (con un área visual de 46.5 por 67 pulgadas), asegurando que su mensaje se mantenga visible y dominante en todo momento.
              </p>
            </Card>
            
            <Card className="border-4 border-[#ff6b35] p-8 bg-white shadow-none hover:shadow-2xl transition-shadow">
              <h3 className="text-display text-3xl text-[#ff6b35] mb-4">
                PARADA DIGITAL
              </h3>
              <p className="text-body text-lg text-[#2a2a2a]">
                Conecte con su audiencia mediante nuestras pantallas electrónicas controladas por computadora. Este formato le ofrece la flexibilidad total de actualizar su arte y cambiar mensajes sin costo de producción. Su anuncio se mantiene dinámico rotando cada 8 segundos en un circuito de hasta 8 clientes, con disponibilidad de diferentes tamaños para adaptarse a su estrategia.
              </p>
            </Card>
            
            <Card className="border-4 border-[#1a4d3c] p-8 bg-white shadow-none hover:shadow-2xl transition-shadow">
              <h3 className="text-display text-3xl text-[#1a4d3c] mb-4">
                TROQUELES
              </h3>
              <p className="text-body text-lg text-[#2a2a2a]">
                Rompa los límites del marco estándar con ejecuciones personalizadas. Este formato permite integrar figuras que sobresalen del anuncio para crear un efecto visual de mayor dimensión. Además, ofrece opciones de Cabezales en la parte superior de la estructura y rotulación en los Cristales Traseros, garantizando que su creatividad domine el entorno desde todos los ángulos, capturando tanto al tráfico como al peatón.
              </p>
            </Card>
          </div>
          
          <div className="text-center mt-12">
            <Button 
              size="lg"
              onClick={() => {
                const mapSection = document.getElementById('mapa');
                if (mapSection) {
                  mapSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
              className="bg-[#1a4d3c] hover:bg-[#0f3a2a] text-white text-display text-xl px-8 py-6 h-auto border-4 border-[#1a4d3c] hover:border-[#ff6b35] transition-all" style={{color: '#ffffff'}}
            >
              Ver Localizaciones
            </Button>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section id="mapa" className="py-24 bg-[#f5f5f5] relative">
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `url('https://private-us-east-1.manuscdn.com/sessionFile/hr87zNdaugqIp849vTw9bz/sandbox/ZJ16vX9yIumDJARemwBe53-img-5_1770039133000_na1fn_bWFwLXRleHR1cmU.jpg?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvaHI4N3pOZGF1Z3FJcDg0OXZUdzliei9zYW5kYm94L1pKMTZ2WDl5SXVtREpBUmVtd0JlNTMtaW1nLTVfMTc3MDAzOTEzMzAwMF9uYTFmbl9iV0Z3TFhSbGVIUjFjbVUuanBnP3gtb3NzLXByb2Nlc3M9aW1hZ2UvcmVzaXplLHdfMTkyMCxoXzE5MjAvZm9ybWF0LHdlYnAvcXVhbGl0eSxxXzgwIiwiQ29uZGl0aW9uIjp7IkRhdGVMZXNzVGhhbiI6eyJBV1M6RXBvY2hUaW1lIjoxNzk4NzYxNjAwfX19XX0_&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=uPhk8b0f5NdFZqX9D5x6BSwmzMSQFvw4Zm3WiIFoCUeXwUly1Qc~~vD9C3n~07EtR3rG3b3JK4UAUCfRCDTHGUReRKwjMeEBernBz54hnOiy7vf7Dpy5rFFDyPXVEDsXXov-J~Uz0MtDmDFO1BjV0RixnmzJjCTcodChspoinyt5XivzWT06L4XwSKpRmWcL3-JCz4~~70JEiJK9peO1n8xZQBFYb1usjwuD2GvyYQzNyTJakJ-~F3qmIIckB4ylxh63gNWvD78DERiiIEwh4khvDSE2jR~HpIZWyFfMNk7mXSo2IAGV8wtFdG6gUwn7DU9jaKashJFzSmY9y7NOPA__')`,
            backgroundSize: 'cover',
          }}
        ></div>
        <div className="container relative z-10">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-display text-4xl md:text-5xl text-[#1a4d3c] mb-6">
              Nuestras Ubicaciones
            </h2>
            <p className="text-body text-lg text-[#2a2a2a]">
              Presencia estratégica en todo el área metropolitana de San Juan y en sus principales avenidas. Contamos con mas de 400 paradas con diferentes formatos.
            </p>
          </div>
          
          <div className="max-w-6xl mx-auto">
            <ParadasMap />
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contacto" className="py-24 bg-[#1a4d3c] relative texture-concrete">
        <div className="container max-w-4xl">
          <h2 className="text-display text-4xl md:text-5xl text-white mb-12 text-center">
            Contáctanos
          </h2>
          <div className="bg-white p-12 shadow-2xl">
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="text-body font-semibold text-[#1a4d3c] mb-2 block">
                    Nombre<span className="text-[#ff6b35]">*</span>
                  </label>
                  <Input 
                    required
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="border-2 border-[#1a4d3c] focus:border-[#ff6b35] h-12"
                  />
                </div>
                <div>
                  <label className="text-body font-semibold text-[#1a4d3c] mb-2 block">
                    Teléfono<span className="text-[#ff6b35]">*</span>
                  </label>
                  <Input 
                    required
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    className="border-2 border-[#1a4d3c] focus:border-[#ff6b35] h-12"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-body font-semibold text-[#1a4d3c] mb-2 block">
                  Correo Electrónico<span className="text-[#ff6b35]">*</span>
                </label>
                <Input 
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="border-2 border-[#1a4d3c] focus:border-[#ff6b35] h-12"
                />
              </div>
              
              <div>
                <label className="text-body font-semibold text-[#1a4d3c] mb-2 block">
                  Mensaje<span className="text-[#ff6b35]">*</span>
                </label>
                <Textarea 
                  required
                  rows={6}
                  value={formData.mensaje}
                  onChange={(e) => setFormData({ ...formData, mensaje: e.target.value })}
                  className="border-2 border-[#1a4d3c] focus:border-[#ff6b35]"
                />
              </div>
              
              <Button 
                type="submit"
                disabled={sendEmailMutation.isPending}
                size="lg"
                className="w-full bg-[#ff6b35] hover:bg-[#e65a25] text-white text-display text-2xl py-6 h-auto border-4 border-[#ff6b35] hover:border-[#1a4d3c] transition-all"
              >
                {sendEmailMutation.isPending ? "Enviando..." : "Enviar Mensaje"}
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1a4d3c] text-white py-12 border-t-8 border-[#ff6b35]">
        <div className="container">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <img 
                src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663148968393/YbohNlnEDVQCkCgw.png" 
                alt="Streetview Media" 
                className="h-12 mb-4 brightness-0 invert"
              />
              <p className="text-body text-sm text-white/80">
                La nueva red de publicidad exterior en Puerto Rico.
              </p>
            </div>
            
            <div>
              <h3 className="text-display text-2xl mb-4">Contacto</h3>
              <div className="space-y-2 text-body text-sm">
                <p>(787)708-5115</p>
                <p>sales@streetviewmediapr.com</p>
                <p>130 Ave. Winston Churchill<br/>PMB 167<br/>San Juan, PR 00926</p>
              </div>
            </div>
            
            <div>
              <h3 className="text-display text-2xl mb-4">Enlaces</h3>
              <div className="space-y-2 text-body text-sm">
                <a href="#inicio" className="block hover:text-[#ff6b35] transition-colors">Inicio</a>
                <a href="#nosotros" className="block hover:text-[#ff6b35] transition-colors">Nosotros</a>
                <a href="#servicios" className="block hover:text-[#ff6b35] transition-colors">Servicios</a>
                <a href="#contacto" className="block hover:text-[#ff6b35] transition-colors">Contacto</a>
                <a href="/admin" className="block hover:text-[#ff6b35] transition-colors">Admin</a>
              </div>
            </div>
          </div>
          
          <div className="border-t-2 border-white/20 mt-8 pt-8 text-center text-body text-sm text-white/60">
            <p>&copy; 2026 Streetview Media. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
