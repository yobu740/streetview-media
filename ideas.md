# Ideas de Diseño para Streetview Media

## Análisis del Mockup
- Empresa de publicidad exterior en mobiliario urbano (Puerto Rico)
- Hero banner con video de paradas de guagua y puntos de San Juan
- Secciones: Hero, "Tu Marca en el Camino", estadísticas, formatos, mapa, contacto
- Paleta: Verde oscuro (#1a4d3c), naranja (#ff6b35), colores vibrantes en logo
- Tipografía: Bold sans-serif para títulos
- Fotografías urbanas reales de San Juan

<response>
<text>
**Design Movement**: Urban Brutalism con influencias del Street Art puertorriqueño

**Core Principles**:
1. Geometría audaz y asimétrica que refleja el paisaje urbano de San Juan
2. Contraste alto entre bloques de color sólido y fotografía documental
3. Tipografía industrial con jerarquía marcada
4. Autenticidad urbana - sin suavizar la realidad de la ciudad

**Color Philosophy**: 
Paleta inspirada en el concreto, asfalto y señalética urbana de Puerto Rico. Verde bosque profundo (#1a4d3c) como ancla institucional, naranja vibrante (#ff6b35) como acento energético que remite a señales de tránsito y atardeceres caribeños. Grises cálidos y blancos roto para equilibrio.

**Layout Paradigm**: 
Bloques desplazados y superpuestos que imitan vallas publicitarias y estructuras urbanas. Grid roto intencionalmente con elementos que sangran fuera de contenedores. Secciones con cortes diagonales que simulan perspectivas de calle.

**Signature Elements**:
1. Bordes gruesos en naranja que enmarcan secciones clave como marcos de vallas
2. Texturas sutiles de concreto/asfalto en fondos
3. Números estadísticos con tipografía display extra-bold

**Interaction Philosophy**: 
Transiciones bruscas pero satisfactorias, como el movimiento de un autobús urbano. Hover states con desplazamientos laterales y cambios de color directos sin gradientes suaves.

**Animation**: 
Parallax sutil en el hero video. Números estadísticos con conteo animado al entrar en viewport. Elementos que "entran" desde los lados como vehículos en movimiento. Sin bounces ni easing suave - preferir easing cúbico o linear.

**Typography System**:
- Display: "Bebas Neue" o "Oswald" (extra-bold) para títulos y números
- Body: "Work Sans" (regular/medium) para legibilidad en descripciones
- Jerarquía: Contraste extremo entre tamaños (72px títulos vs 16px body)
</text>
<probability>0.08</probability>
</response>

<response>
<text>
**Design Movement**: Tropical Modernism con estética de revista de arquitectura

**Core Principles**:
1. Elegancia minimalista con toques caribeños sofisticados
2. Espacios respirables con whitespace generoso
3. Fotografía de alta calidad como protagonista
4. Refinamiento profesional sin perder calidez local

**Color Philosophy**: 
Paleta terrosa y natural inspirada en la arquitectura colonial de San Juan. Verde salvia (#2d5a4a) como color primario institucional, terracota suave (#e67e50) como acento cálido. Beige arena y blanco marfil como fondos neutros. Toques de azul caribeño (#4a90a4) para contraste.

**Layout Paradigm**: 
Composiciones asimétricas con márgenes amplios. Secciones que alternan entre ancho completo y contenedores estrechos (max-width: 1100px). Imágenes que se extienden hasta un borde mientras el texto mantiene padding generoso.

**Signature Elements**:
1. Líneas decorativas finas en terracota que guían el ojo
2. Cards elevadas con sombras suaves y esquinas redondeadas (16px)
3. Iconografía custom minimalista para servicios

**Interaction Philosophy**: 
Movimientos fluidos y orgánicos que evocan la brisa caribeña. Transiciones suaves con easing natural. Micro-interacciones delicadas en hover (lift + shadow increase).

**Animation**: 
Fade-in con ligero slide-up para elementos al scroll. Video hero con overlay gradiente sutil. Números estadísticos con conteo animado suave. Parallax muy sutil en imágenes de fondo (0.3x speed).

**Typography System**:
- Display: "Playfair Display" (bold) para títulos principales - elegancia editorial
- Headings: "Montserrat" (semibold) para subtítulos - modernidad limpia
- Body: "Source Sans Pro" (regular) para texto corrido - legibilidad óptima
- Jerarquía: Progresión armónica (48px → 32px → 24px → 16px)
</text>
<probability>0.07</probability>
</response>

<response>
<text>
**Design Movement**: Neo-Constructivismo Digital con influencias de Motion Graphics

**Core Principles**:
1. Dinamismo visual constante - nada es completamente estático
2. Capas superpuestas con transparencias y blend modes
3. Geometría precisa con ángulos no-ortogonales
4. Energía urbana traducida a movimiento digital

**Color Philosophy**: 
Sistema de color vibrante y saturado inspirado en la señalética urbana y grafiti de San Juan. Verde esmeralda (#0d7a5f) como base energética, naranja neón (#ff5722) como impulso visual, amarillo limón (#ffd600) como acento de alerta. Fondos en gris carbón (#1e1e1e) y blanco puro para máximo contraste.

**Layout Paradigm**: 
Grid modular con módulos que rotan 2-5 grados. Secciones con cortes angulares (clip-path polygons). Elementos flotantes con z-index variado creando profundidad. Texto que sigue paths diagonales.

**Signature Elements**:
1. Barras de color sólido que cruzan secciones en diagonal
2. Badges circulares con gradientes radiales para stats
3. Bordes animados con gradient borders que rotan

**Interaction Philosophy**: 
Respuesta inmediata y exagerada. Hover triggers cambios de escala (1.05x), rotación leve (2deg), y shifts de color. Clicks generan ripple effects. Scroll parallax en múltiples capas a diferentes velocidades.

**Animation**: 
Hero video con máscaras animadas que revelan contenido. Texto con stagger animation (cada palabra entra con 50ms delay). Secciones con slide-in desde ángulos inesperados. Loading states con skeleton screens animados. Transiciones de página con wipe effects diagonales.

**Typography System**:
- Display: "Space Grotesk" (bold) - futurista pero legible
- Headings: "Inter" (extrabold) - versatilidad digital
- Body: "Inter" (regular) - consistencia del sistema
- Accents: "JetBrains Mono" (medium) para números/stats - precisión técnica
- Jerarquía: Variación por weight y tracking (tight para display, normal para body)
</text>
<probability>0.09</probability>
</response>

## Decisión Final

**Seleccionado: Urban Brutalism con influencias del Street Art puertorriqueño**

Esta aproximación captura la autenticidad y energía de la publicidad exterior urbana mientras mantiene profesionalismo. El contraste fuerte, geometría audaz y tipografía industrial reflejan perfectamente el medio (vallas en mobiliario urbano) y el contexto (calles de San Juan).
