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
import { useState, useEffect, useRef } from "react";

export default function Home() {
  const [stats, setStats] = useState({
    zones: 0,
    vehicles: 0,
    hours: 0,
  });
  
  const statsRef = useRef<HTMLDivElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

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
    // Form submission logic here
    alert("Formulario enviado. Nos pondremos en contacto pronto.");
  };

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b-4 border-[#1a4d3c]" style={{backgroundColor: '#ffffff'}}>
        <div className="container flex items-center justify-between h-20">
          <img 
            src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663148968393/YbohNlnEDVQCkCgw.png" 
            alt="Streetview Media" 
            className="h-12"
          />
          <div className="hidden md:flex items-center gap-8">
            <a href="#inicio" className="text-body font-medium hover:text-[#ff6b35] transition-colors">Inicio</a>
            <a href="#nosotros" className="text-body font-medium hover:text-[#ff6b35] transition-colors">Nosotros</a>
            <a href="#servicios" className="text-body font-medium hover:text-[#ff6b35] transition-colors">Servicios</a>
            <a href="#contacto" className="text-body font-medium hover:text-[#ff6b35] transition-colors">Contacto</a>
          </div>
        </div>
      </nav>

      {/* Hero Section - Video Placeholder */}
      <section id="inicio" className="relative h-screen mt-20">
        <div className="absolute inset-0 bg-[#1a4d3c]">
          {/* Video will be inserted here */}
          <div className="w-full h-full flex items-center justify-center">
            <img 
              src="https://private-us-east-1.manuscdn.com/sessionFile/hr87zNdaugqIp849vTw9bz/sandbox/ZJ16vX9yIumDJARemwBe53-img-1_1770039136000_na1fn_aGVyby1wbGFjZWhvbGRlcg.jpg?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvaHI4N3pOZGF1Z3FJcDg0OXZUdzliei9zYW5kYm94L1pKMTZ2WDl5SXVtREpBUmVtd0JlNTMtaW1nLTFfMTc3MDAzOTEzNjAwMF9uYTFmbl9hR1Z5Ynkxd2JHRmpaV2h2YkdSbGNnLmpwZz94LW9zcy1wcm9jZXNzPWltYWdlL3Jlc2l6ZSx3XzE5MjAsaF8xOTIwL2Zvcm1hdCx3ZWJwL3F1YWxpdHkscV84MCIsIkNvbmRpdGlvbiI6eyJEYXRlTGVzc1RoYW4iOnsiQVdTOkVwb2NoVGltZSI6MTc5ODc2MTYwMH19fV19&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=CivEFgIJfni9T9TEp0FfliZPdHVhf7eplvaKHfHCh9DauE5MzZM2sT4SYFOABOM3gCx0zQKkzWgTPeZq73dCkyQNsM1H1oochu3PQVnAb6JSniwCPv3fGRO2K4CK1wqkQklWxiN0mskgaBthScC0aXcOAQlqtk1zQ~ds4oM9xy5J76qsh~dryMncciMSTse5cEsPBAbzVZjDXl3MfTxGSzi~IPBeDXd1q-ht5mYAJSdwH3Rlg58-vUaeBQhSCHTnMIrmxgnktAEVn8DYfCn10B4c~hY29QmASZqwFOrImTjHeEXY231fzeP5xnrK~deEAAioqQwJvDzeIXVI6SHNMQ__"
              alt="San Juan Urban View"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a4d3c]/80 to-transparent"></div>
        </div>
        <div className="relative h-full container flex items-center">
          <div className="max-w-2xl">
            <h1 className="text-display text-7xl md:text-8xl text-white mb-6 leading-none">
              Tu Marca<br/>en el Camino
            </h1>
            <p className="text-body text-xl text-white/90 mb-8 max-w-xl">
              La nueva red de publicidad exterior especializada en mobiliario urbano de alto impacto en Puerto Rico.
            </p>
            <Button 
              size="lg" 
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
              <h2 className="text-display text-6xl text-[#1a4d3c] mb-6">
                Tu Marca en el Camino
              </h2>
              <p className="text-body text-lg text-[#2a2a2a] leading-relaxed mb-6">
                Llegamos para revitalizar el paisaje urbano. Somos la nueva red de publicidad exterior especializada en mobiliario urbano de alto impacto.
              </p>
              <div className="border-l-8 border-[#ff6b35] pl-6 mb-8">
                <p className="text-body text-lg text-[#2a2a2a] leading-relaxed">
                  Gestionamos las ubicaciones más codiciadas del área metropolitana, transformando simples puntos de espera en poderosos Mupis visuales. Nuestro objetivo es ofrecerle a su marca una presencia inevitable en las zonas de mayor tráfico.
                </p>
              </div>
              <p className="text-body text-lg text-[#2a2a2a] leading-relaxed">
                Asegure su espacio en las rutas clave de Puerto Rico.
              </p>
            </div>
            <div className="relative">
              <img 
                src="https://private-us-east-1.manuscdn.com/sessionFile/hr87zNdaugqIp849vTw9bz/sandbox/ZJ16vX9yIumDJARemwBe53-img-3_1770039136000_na1fn_bXVwaS1kYXk.jpg?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvaHI4N3pOZGF1Z3FJcDg0OXZUdzliei9zYW5kYm94L1pKMTZ2WDl5SXVtREpBUmVtd0JlNTMtaW1nLTNfMTc3MDAzOTEzNjAwMF9uYTFmbl9iWFZ3YVMxa1lYay5qcGc~eC1vc3MtcHJvY2Vzcz1pbWFnZS9yZXNpemUsd18xOTIwLGhfMTkyMC9mb3JtYXQsd2VicC9xdWFsaXR5LHFfODAiLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3OTg3NjE2MDB9fX1dfQ__&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=JwYQwI8MmoAgGmoi65Z~ViGMHuVcBe4jSmr8NDpn3EWsV45jsoBSlapyOMM1KdxslArpg~RO0bFWuffY9CzoLIJq9eDheAt3eLwEbkX8niFMXjOJKyH-TzLPN9a-Zckc711j1SeF2DF4~aWH6U6lb-CR1C4RUw8cp3f4vfVaSoyT5R82w9atqqLxt~pQ5HB6nIME8Ec~pbAxqV-Wdi30WcXjicEzFdXGI6jLpvm6WOjwJK-akiBIwhDETH0XSEvDfHIJwK2BdsD7Ax5svBplFBXmG3rmF9jVNKvPf73nNvKBL6h2r03RZu1P3Qo0j-R8~vea~T~dg1t3yEGWC94Bew__"
                alt="MUPI en San Juan"
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
                src="https://private-us-east-1.manuscdn.com/sessionFile/hr87zNdaugqIp849vTw9bz/sandbox/ZJ16vX9yIumDJARemwBe53-img-2_1770039135000_na1fn_bXVwaS1uaWdodA.jpg?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvaHI4N3pOZGF1Z3FJcDg0OXZUdzliei9zYW5kYm94L1pKMTZ2WDl5SXVtREpBUmVtd0JlNTMtaW1nLTJfMTc3MDAzOTEzNTAwMF9uYTFmbl9iWFZ3YVMxdWFXZG9kQS5qcGc~eC1vc3MtcHJvY2Vzcz1pbWFnZS9yZXNpemUsd18xOTIwLGhfMTkyMC9mb3JtYXQsd2VicC9xdWFsaXR5LHFfODAiLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3OTg3NjE2MDB9fX1dfQ__&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=lla0FFS6cJf--3YI0Jk8ShI3wpq41g4UolY9Wtuoe0I2QdNNyE5bwGz8QFvuRAWNZ~2MNOXB5hPSlsgbG4PD4FUtOQI2sVk2K7uWWMxXPbBP4YJd3670EYD-VqZBsd~c3DTte3u-qDXvDrZzS3V-C8RykuLmwr4~XmUwyhm9pnJOKypUQLdi5NTPTkhOEjSIf7gtEfVqJc2jnim2w08QF3ghhdoOpCVz6yo--rGPk1xnJSZy3GOhMW8LQL0FVQU0tdGyr0ezmHb9lUIbsjGEHth3K~vrRkiqACHFFEO6celozdq2glIP5uBqUN6keDoTTyrkK~uCtBv~YuFjfktJ4w__"
                alt="MUPI nocturno"
                className="w-full shadow-2xl border-8 border-[#ff6b35]"
              />
              <div className="absolute -top-6 -left-6 w-48 h-48 bg-[#1a4d3c] -z-10"></div>
            </div>
            <div className="order-1 md:order-2">
              <p className="text-body text-lg text-[#2a2a2a] leading-relaxed mb-6">
                Gestionamos las ubicaciones más codiciadas del área metropolitana, transformando simples puntos de espera en poderosos Mupis visuales. Nuestro objetivo es ofrecerle a su marca una presencia inevitable en las zonas de mayor tráfico.
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
              <div className="text-display text-7xl text-[#ff6b35] mb-2">
                {stats.zones}
              </div>
              <div className="text-body text-xl text-white uppercase tracking-wider">
                Zonas Estratégicas
              </div>
            </div>
            <div className="text-center border-l-4 border-r-4 border-[#ff6b35]">
              <div className="text-display text-7xl text-[#ff6b35] mb-2">
                {stats.vehicles.toLocaleString()}K+
              </div>
              <div className="text-body text-xl text-white uppercase tracking-wider">
                Vehículos Diarios
              </div>
            </div>
            <div className="text-center">
              <div className="text-display text-7xl text-[#ff6b35] mb-2">
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
          <h2 className="text-display text-6xl text-[#1a4d3c] mb-4 text-center">
            Formatos:
          </h2>
          
          <div className="grid md:grid-cols-2 gap-16 max-w-5xl mx-auto mt-16">
            <Card className="border-4 border-[#1a4d3c] p-8 bg-white shadow-none hover:shadow-2xl transition-shadow">
              <h3 className="text-display text-4xl text-[#1a4d3c] mb-4">
                MUPI FIJO
              </h3>
              <p className="text-body text-lg text-[#2a2a2a]">
                Descripción del formato MUPI Fijo. Ideal para campañas de largo plazo con alta visibilidad en puntos estratégicos del área metropolitana.
              </p>
            </Card>
            
            <Card className="border-4 border-[#ff6b35] p-8 bg-white shadow-none hover:shadow-2xl transition-shadow">
              <h3 className="text-display text-4xl text-[#ff6b35] mb-4">
                MUPI DIGITAL
              </h3>
              <p className="text-body text-lg text-[#2a2a2a]">
                Descripción del formato MUPI Digital. Contenido dinámico y rotativo que maximiza el impacto visual con tecnología de última generación.
              </p>
            </Card>
          </div>
          
          <div className="text-center mt-12">
            <Button 
              size="lg"
              className="bg-[#1a4d3c] hover:bg-[#0f3a2a] text-white text-display text-xl px-8 py-6 h-auto border-4 border-[#1a4d3c] hover:border-[#ff6b35] transition-all" style={{color: '#ffffff'}}
            >
              Ver Localizaciones
            </Button>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="py-24 bg-[#f5f5f5] relative">
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `url('https://private-us-east-1.manuscdn.com/sessionFile/hr87zNdaugqIp849vTw9bz/sandbox/ZJ16vX9yIumDJARemwBe53-img-5_1770039133000_na1fn_bWFwLXRleHR1cmU.jpg?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvaHI4N3pOZGF1Z3FJcDg0OXZUdzliei9zYW5kYm94L1pKMTZ2WDl5SXVtREpBUmVtd0JlNTMtaW1nLTVfMTc3MDAzOTEzMzAwMF9uYTFmbl9iV0Z3TFhSbGVIUjFjbVUuanBnP3gtb3NzLXByb2Nlc3M9aW1hZ2UvcmVzaXplLHdfMTkyMCxoXzE5MjAvZm9ybWF0LHdlYnAvcXVhbGl0eSxxXzgwIiwiQ29uZGl0aW9uIjp7IkRhdGVMZXNzVGhhbiI6eyJBV1M6RXBvY2hUaW1lIjoxNzk4NzYxNjAwfX19XX0_&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=uPhk8b0f5NdFZqX9D5x6BSwmzMSQFvw4Zm3WiIFoCUeXwUly1Qc~~vD9C3n~07EtR3rG3b3JK4UAUCfRCDTHGUReRKwjMeEBernBz54hnOiy7vf7Dpy5rFFDyPXVEDsXXov-J~Uz0MtDmDFO1BjV0RixnmzJjCTcodChspoinyt5XivzWT06L4XwSKpRmWcL3-JCz4~~70JEiJK9peO1n8xZQBFYb1usjwuD2GvyYQzNyTJakJ-~F3qmIIckB4ylxh63gNWvD78DERiiIEwh4khvDSE2jR~HpIZWyFfMNk7mXSo2IAGV8wtFdG6gUwn7DU9jaKashJFzSmY9y7NOPA__')`,
            backgroundSize: 'cover',
          }}
        ></div>
        <div className="container relative z-10">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-display text-6xl text-[#1a4d3c] mb-6">
              Nuestras Ubicaciones
            </h2>
            <p className="text-body text-lg text-[#2a2a2a]">
              Presencia estratégica en todo el área metropolitana de San Juan y principales municipios de Puerto Rico.
            </p>
          </div>
          
          <div className="bg-white border-8 border-[#1a4d3c] p-4 max-w-4xl mx-auto">
            <img 
              src="https://images.unsplash.com/photo-1524661135-423995f22d0b?w=1200&h=800&fit=crop"
              alt="Mapa de Puerto Rico con ubicaciones"
              className="w-full h-[500px] object-cover"
            />
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contacto" className="py-24 bg-white relative texture-concrete">
        <div className="container max-w-4xl">
          <div className="bg-[#f5f5f5] border-8 border-[#1a4d3c] p-12">
            <h2 className="text-display text-6xl text-[#1a4d3c] mb-8 text-center">
              Contáctanos
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="text-body font-semibold text-[#1a4d3c] mb-2 block">
                    Nombre<span className="text-[#ff6b35]">*</span>
                  </label>
                  <Input 
                    required
                    className="border-2 border-[#1a4d3c] focus:border-[#ff6b35] h-12"
                  />
                </div>
                <div>
                  <label className="text-body font-semibold text-[#1a4d3c] mb-2 block">
                    Apellido<span className="text-[#ff6b35]">*</span>
                  </label>
                  <Input 
                    required
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
                  className="border-2 border-[#1a4d3c] focus:border-[#ff6b35] h-12"
                />
              </div>
              
              <div>
                <label className="text-body font-semibold text-[#1a4d3c] mb-2 block">
                  Compañía<span className="text-[#ff6b35]">*</span>
                </label>
                <Input 
                  required
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
                  className="border-2 border-[#1a4d3c] focus:border-[#ff6b35]"
                />
              </div>
              
              <Button 
                type="submit"
                size="lg"
                className="w-full bg-[#ff6b35] hover:bg-[#e65a25] text-white text-display text-2xl py-6 h-auto border-4 border-[#ff6b35] hover:border-[#1a4d3c] transition-all"
              >
                Enviar Mensaje
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
                <p>📞 (787)708-5115</p>
                <p>✉️ contacto@streetviewmediapr.com</p>
                <p>📍 130 Ave. Winston Churchill<br/>PMB 167<br/>San Juan, PR 00926</p>
              </div>
            </div>
            
            <div>
              <h3 className="text-display text-2xl mb-4">Enlaces</h3>
              <div className="space-y-2 text-body text-sm">
                <a href="#inicio" className="block hover:text-[#ff6b35] transition-colors">Inicio</a>
                <a href="#nosotros" className="block hover:text-[#ff6b35] transition-colors">Nosotros</a>
                <a href="#servicios" className="block hover:text-[#ff6b35] transition-colors">Servicios</a>
                <a href="#contacto" className="block hover:text-[#ff6b35] transition-colors">Contacto</a>
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
