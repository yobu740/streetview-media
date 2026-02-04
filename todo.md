# Streetview Media - TODO List

## Sistema de Gestión de Inventario ✅

### Fase 1: Base de Datos
- [x] Crear esquema de base de datos para paradas
- [x] Crear esquema de base de datos para anuncios
- [x] Importar 573 paradas desde Excel
- [x] Configurar relaciones entre tablas

### Fase 2: Backend API
- [x] Crear funciones de base de datos para paradas
- [x] Crear funciones de base de datos para anuncios
- [x] Implementar endpoints tRPC para paradas
- [x] Implementar endpoints tRPC para anuncios
- [x] Sistema de verificación de disponibilidad
- [x] Tests unitarios (8 tests pasando)

### Fase 3: Panel Administrativo
- [x] Página de administración con autenticación
- [x] Listado completo de paradas con búsqueda
- [x] Visualización de estado (Disponible/Ocupada)
- [x] Formulario para crear anuncios
- [x] Gestión de fechas de inicio y fin
- [x] Tipos de anuncio (Fijo/Bonificación)
- [x] Estados de anuncio (Activo/Programado/Finalizado)
- [x] Estadísticas en tiempo real

## Sitio Web Público ✅

### Diseño y Contenido
- [x] Hero banner con video de paradas de guagua
- [x] Navegación fija con logo
- [x] Sección "Tu Marca en el Camino"
- [x] Estadísticas animadas (400 zonas, 670K+ vehículos, 8,760 horas)
- [x] Sección de formatos (Parada Fija y Digital)
- [x] Mapa de ubicaciones
- [x] Formulario de contacto
- [x] Footer con información de contacto
- [x] Menú hamburguesa móvil
- [x] Diseño responsive

## Próximas Mejoras Sugeridas

### Vista Pública de Consulta
- [ ] Página pública para consultar disponibilidad
- [ ] Mapa interactivo con paradas disponibles
- [ ] Filtros por zona, fechas, tipo
- [ ] Formulario de solicitud de cotización

### Funcionalidades Avanzadas
- [ ] Dashboard con métricas y reportes
- [ ] Exportar listado a Excel/PDF
- [ ] Sistema de notificaciones por email
- [ ] Calendario visual de ocupación
- [ ] Galería de fotos por parada
- [ ] Integración con Google Maps para coordenadas
- [ ] Sistema de renovación automática de contratos
- [ ] Historial de anuncios por parada

### Optimizaciones
- [ ] Agregar coordenadas GPS a las paradas
- [ ] Importar anuncios actuales desde Excel
- [ ] Sistema de permisos por rol (admin/viewer)
- [ ] Logs de auditoría de cambios
