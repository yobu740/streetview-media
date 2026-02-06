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

## Mejoras Solicitadas - Fase 2

- [x] Agregar botón para imprimir reportes
- [x] Cambiar "Digital" a "Bonificación" (abreviado "B")
- [x] Cambiar "Fija" a "Fija" (abreviado "F")
- [x] Agregar columna "Ruta" en el listado de paradas
- [x] Crear vista detallada de cada parada con foto genérica
- [x] Botón para abrir detalles de parada desde el listado


## Mejoras Solicitadas - Fase 3

- [x] Implementar filtros avanzados (por ruta, zona, tipo, estado, fechas)
- [x] Convertir estadísticas en botones de filtro clickeables
- [x] Agregar paginación de 20 paradas por página
- [x] Crear botón "Agregar Parada" para crear paradas manualmente
- [x] Implementar función de eliminar parada con confirmación
- [x] Agregar filtros en el modal de reportes antes de imprimir


## Correcciones - Fase 4

- [ ] Actualizar explicación de orientación: I=Inbound (dentro), O=Outbound (afuera), P=Peatonal (dirección acera)
- [ ] Identificar paradas digitales automáticamente por letras múltiples en ID (123A, 123B, 123C = Digital)
- [ ] Identificar paradas dobles por letras A/B solamente (123A, 123B = dos extremos de la misma parada)
- [ ] Importar productos del Excel como anuncios activos
- [ ] Generar fechas automáticas para anuncios importados
- [ ] Actualizar interfaz para mostrar correctamente tipo Digital vs Fija según ID

- [x] Agregar columna fotoUrl en tabla de paradas
- [x] Implementar carga de fotos en modal "Agregar Parada"
- [x] Agregar opción de cambiar foto en vista de detalles
- [x] Configurar upload a S3 para imágenes de paradas

- [x] Corregir error de React hooks moviendo uploadFoto.useMutation() al inicio del componente

## Mejoras de Navegación y Acceso

- [x] Agregar enlace "Admin" al menú de navegación del sitio web
- [x] Crear usuario demo para acceso al dashboard

## Mejoras de Búsqueda

- [x] Expandir búsqueda para incluir nombres de anuncios/clientes además de ID de parada y ruta

## Indicadores Visuales de Búsqueda

- [x] Agregar badge/indicador visual en resultados de búsqueda mostrando si el match fue por información de parada o por nombre de cliente

## Sistema de Roles y Permisos

- [x] Agregar campo 'role' a la tabla de usuarios (admin/vendedor)
- [x] Implementar control de acceso basado en roles en el backend
- [x] Adaptar UI para mostrar/ocultar funciones según rol del usuario
- [x] Vendedor: puede ver todo, añadir anuncios, NO eliminar/editar paradas

## Sistema de Reservas Inteligentes

- [x] Permitir reservar paradas disponibles con fecha futura
- [x] Permitir reservar paradas ocupadas mostrando fecha de disponibilidad
- [x] Mostrar advertencia cuando parada está ocupada con fecha de liberación
- [x] Validar que no haya conflictos de fechas en reservas

## Exportación de Datos

- [x] Implementar exportación a Excel del listado filtrado
- [x] Incluir toda la información de paradas en el export
- [x] Botón de descarga visible en la interfaz

## Vista de Calendario

- [x] Crear vista de calendario mensual
- [x] Mostrar ocupación de paradas por mes
- [x] Facilitar identificación de disponibilidad futura
- [x] Navegación entre meses

## Dashboard de Métricas

- [x] Gráfico de ocupación por zona
- [x] Lista de clientes más frecuentes
- [x] Cálculo y visualización de revenue proyectado por período
- [x] Estadísticas generales del inventario

## Bug Fixes

- [x] Corregir búsqueda por nombre de cliente (ej: BPPR no aparece en resultados)

## Mejoras de Búsqueda y Calendario

- [x] Crear buscador de clientes separado del buscador general
- [x] Hacer calendario interactivo - mostrar paradas al hacer clic en fecha
- [x] Agregar área debajo del calendario para listar paradas de fecha seleccionada
- [x] Crear botón "Reservar" con modal
- [x] Modal de reserva: selección de fechas (inicio/fin)
- [x] Modal de reserva: selección de rutas y/o paradas específicas
- [x] Modal de reserva: validación de disponibilidad

## Autenticación con Microsoft

- [x] Reemplazar Manus OAuth con Microsoft Azure AD OAuth
- [x] Actualizar backend para usar Microsoft Graph API
- [x] Actualizar frontend para login con Microsoft
- [x] Configurar variables de entorno de Azure AD
- [x] Probar flujo completo de autenticación
- [x] Fix Microsoft OAuth callback 404 error
- [x] Fix redirect URI protocol (https)
- [x] Fix returnPath redirect after login
- [x] Fix session validation for tRPC requests after Microsoft login

## Production Domain Fix
- [x] Add PUBLIC_URL environment variable
- [x] Update OAuth code to use PUBLIC_URL instead of req.get('host')
- [ ] Test production login
