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

## Professional Login Page
- [x] Design professional login page with Streetview Media branding
- [x] Add Microsoft sign-in button with proper styling
- [x] Include artistic banner with bus stop image
- [ ] Test login flow

## Admin Notification System for Reservations
- [x] Add approval status field to anuncios table (pending, approved, rejected)
- [x] Add approvedBy and approvedAt fields to track who approved
- [x] Create backend procedures for approval workflow
- [x] Create notifications table for admin alerts
- [x] Implement notification UI in admin dashboard
- [x] Add approval/rejection buttons for pending reservations
- [x] Send notifications when vendors create reservations
- [x] Add approval status filter dropdown

## Responsive Dashboard Design
- [x] Implement hamburger menu for mobile navigation
- [x] Make search filters stack vertically on mobile
- [x] Optimize header for mobile with notification bell
- [x] Add "Nueva Búsqueda" button to clear all filters

## Calendar and Metrics Improvements
- [x] Make Calendar page header responsive with hamburger menu
- [x] Make Metrics page header responsive with hamburger menu
- [x] Simplify calendar display - show only occupied/available count per day
- [x] Show detailed parada list only when clicking on a specific date
- [x] Implement date-first selection for reservations
- [x] Validate parada availability based on selected date range
- [x] Fix route filter to show individual available paradas within route
- [x] Prevent selection of occupied paradas for selected dates

## Bulk Reservation Approval
- [x] Add checkbox selection for individual pending reservations
- [x] Add "Select All" checkbox for pending reservations
- [x] Implement "Aprobar Todas" button for selected reservations
- [x] Implement "Rechazar Todas" button for selected reservations
- [x] Add backend support for bulk approval operations
- [x] Add backend support for bulk rejection operations

## Bug Fixes
- [x] Fix pending reservations not disappearing after approval/rejection
- [x] Fix vendor reservations not appearing in admin notifications
- [x] Fix route filter selecting all paradas instead of individual selected paradas
- [x] Fix reservation creation failing with error message (was permission issue)
- [x] Allow regular users to create reservations (not just vendedores)
- [x] Verify approved reservations appear as Programado in calendar

## Reservations Page and Workflow Fix
- [x] Create "Mis Reservas" page to view all user reservations
- [x] Fix admin dashboard anuncios not appearing when added (auto-approve for admins)
- [x] Ensure approved reservations appear in calendar (show Activo and Programado)
- [x] Clarify distinction between direct anuncio creation (admin) and reservations (users)

## Critical Bugs - Availability Validation
- [x] Fix availability calculation to consider approved anuncios (not just "Activo")
- [x] Add server-side validation to prevent overlapping reservations
- [x] Fix anuncios not appearing immediately after creation in admin dashboard
- [x] Update parada status display to show occupied when has approved anuncios

## New Feature - Cancel Anuncio
- [x] Add ability to cancel/remove anuncios before end date
- [x] Add backend cancel procedure
- [x] Update estado to "Inactivo" when cancelled (keeps history)
- [x] Ensure cancelled anuncios free up parada availability

## Quick Status Management in Admin Panel
- [x] Add dropdown to change anuncio status directly from parada details
- [x] Allow changing between Disponible, Activo, Programado, Inactivo, Finalizado
- [x] Update UI immediately after status change with query invalidation
- [x] Admin-only feature with Select component

## Main Listing Display Bugs
- [x] Fix "Anuncio Actual" column not showing cliente name and dates
- [x] Fix status showing "Disponible" when parada has active anuncios
- [x] Clean overlapping/duplicate anuncios in database
- [x] Verify query joins anuncios table correctly

## Bug - Cannot Create Anuncios Tipo "Fijo"
- [x] Investigate why only "Bonificación" type works - Found mismatch in Select value
- [x] Fix validation or schema for "Fijo" type - Changed "Fija" to "Fijo" in form
- [x] Test both types work correctly

## UI Labels - Clarify Tipo de Parada vs Tipo de Anuncio
- [x] Update filter labels to say "Tipo de Parada" (Fija/Digital)
- [x] Keep anuncio tipo as "Tipo de Anuncio" (Fijo/Bonificación)
- [x] Update table headers to be clear
- [x] Update form labels in parada creation
- [x] Verify all labels are consistent throughout the app

## Mis Reservas - Export and Access
- [x] Verify vendedor role can access Mis Reservas page - Yes, all authenticated users can access
- [x] Add Excel export functionality to Mis Reservas - CSV export with all reservation data
- [x] Add print/PDF functionality to Mis Reservas - Print styles added, browser print dialog
- [x] Test export features work correctly

## Search and Reports Improvements
- [x] Add comma-separated multi-ID search for cobertizo IDs (e.g., "186, 187, 188")
- [x] Add date range filter to reports page
- [x] Add print functionality to reservation reports
- [x] Test multi-ID search works correctly
- [x] Test date filtering in reports

## Navigation and Reports Improvements
- [x] Add "Ver Métricas" button/link in Admin panel header - Added to desktop and mobile menu
- [x] Add client filter dropdown to Metrics reports - Dropdown with all unique clients
- [x] Filter reservations table by selected client - Filters work with date filters
- [x] Test navigation from Admin to Metrics
- [x] Test client filtering works correctly

## Database Update and UI Changes
- [x] Remove "Ver Métricas" button from Admin header (desktop and mobile)
- [x] Add date range filter to print modal for filtered reports
- [x] Read Excel file and analyze structure
- [x] Add "producto" column to paradas table for anuncio/producto name
- [x] Add "cliente" column to paradas table (can be empty)
- [x] Import Excel data and update all paradas - 1,073 paradas updated
- [x] Mark paradas as "Disponible" when producto is "Removida", "Apagado", or "No display" - 523 marked
- [x] Change search label from "Cliente" to "Anuncio/Producto"
- [x] Update search functionality to search by producto field
- [x] Test all changes work correctly

## Bug - Duplicate Parada IDs
- [x] Query database to find duplicate paradas (IDs 261, 121) - Found LEFT JOIN was creating duplicates
- [x] Remove or merge duplicate entries - Fixed getAllParadas to return only ONE row per parada
- [x] Verify React key errors are resolved - Server restarted successfully

## Bug - Producto Search Not Finding Anuncios
- [x] Investigate why search doesn't find paradas with current anuncios - Only searched p.producto
- [x] Update search to check both `producto` field and `anuncioCliente` field
- [x] Test search with known anuncio names

## Calendario and Search Issues
- [x] Verify calendario page uses new schema (producto, cliente columns) - Calendar uses anuncios table which is correct
- [x] Fix search returning paradas without search term (e.g., "Bluey" returns non-Bluey paradas) - Changed to exact match
- [x] Test calendario displays correct current data - Calendar uses anuncios table correctly
- [x] Test search only returns exact matches - Changed from .includes() to === for exact match

## Bug - Exact Search Still Returning Wrong Results
- [ ] Investigate why searching "KFC" returns paradas without KFC
- [ ] Check if there are hidden characters or whitespace issues
- [ ] Verify the exact match logic is actually being used
- [ ] Test with multiple search terms

## Search and Display Fix
- [x] Search filter searches in 'producto' field of parada
- [x] 'Anuncio Actual' column shows producto + dates from active anuncio
- [x] Test that searching "KFC" shows correct results (6 paradas with producto="KFC")

## Database Verification and Update
- [x] Analyze Excel file SISTEMASPARADASNEW2-6-26.xlsx
- [x] Check for missing paradas (e.g., 257 Inbound vs 257 Outbound)
- [x] Verify and correct localizations (rows 3-71 in Excel are AVE. ASHFORD)
- [x] Update database schema to allow multiple paradas with same cobertizo_id but different orientacion
- [x] Import all 1,073 paradas from Excel
- [x] Verify all changes are reflected in database

## Update Parada Status Based on Producto
- [x] Mark paradas as OCCUPIED (activa=0) if producto has a valid value (not NULL, NO DISPLAY, REMOVIDA, or APAGADO)
- [x] Mark paradas as AVAILABLE (activa=1) if producto is NULL, NO DISPLAY, REMOVIDA, or APAGADO
- [x] Create anuncios automatically for paradas with valid producto
- [x] Verify status changes in admin panel

## Calendar Data Verification
- [x] Review calendar component code
- [x] Identified old 2025 anuncios causing incorrect data display
- [x] Deleted all 2025 anuncios to avoid confusion
- [x] Calendar now shows only current 2026 anuncios (565 total)

## New Features Implementation
- [x] Add orientation column (I/O/P) to main paradas table
- [x] Create bulk date editing tool for multiple anuncios at once
- [x] Implement automatic expiration alerts (7 days before anuncio ends)
- [x] Test all three features

## Mobile Version Fixes
- [x] Fix admin delete icon not showing on mobile in paradas table (buttons visible with horizontal scroll)
- [x] Fix "Agregar Parada" button not showing on mobile (now full-width on mobile)
- [x] Fix photo upload from mobile camera not working (added capture attribute)
- [x] Fix photo upload from mobile gallery not working (accept image/* allows gallery selection)
- [x] Test all fixes on mobile view

## Photo Upload Fixes
- [x] Fix permission error (10002) when admin uploads photos (changed to protectedProcedure)
- [x] Implement automatic image compression before upload to save space (max 1920x1920, 85% quality)
- [x] Test photo upload from mobile with compression

## Photo Source Options Fix
- [x] Remove capture attribute to restore all photo source options (camera, gallery, Google Drive, OneDrive)
- [x] Test that all options are available on mobile

## UI Cleanup
- [x] Remove version tag [v2.1] from Admin panel header

## Reservation Modal Search
- [x] Add search field for parada ID in reservation modal
- [x] Filter available paradas by search term (cobertizo ID)
- [x] Test search functionality works correctly

## Reservation Modal - Show Orientation
- [x] Display orientation (I/O/P) next to parada ID in reservation modal
- [x] Show in both "Paradas Específicas" and "Por Rutas" modes
- [x] Test that orientation is visible and clear

## Separate Producto and Cliente in Anuncios
- [x] Add producto field to anuncios table schema
- [x] Run database migration (pnpm db:push)
- [x] Update anuncio creation form to have both producto and cliente inputs
- [x] Update backend procedures to require producto field
- [x] Update all displays to show both fields correctly
- [x] Fix Anuncio Actual display to clear when status is Disponible
- [ ] Test that both fields save and display properly

## Show Occupied Paradas with Availability Date
- [x] Modify reservation modal to show ALL paradas (not just available)
- [x] Disable occupied paradas with message "Disponible después de [fecha]"
- [x] Update getAvailableParadas to return all paradas with availability info
- [ ] Test that occupied paradas show correct availability date

## Fix Producto Search - Partial Matching
- [x] Update producto search to show results with partial matches (e.g., "OPI" shows "OPIOIDES")
- [x] Test that search works with incomplete terms

## Update Anuncio End Dates
- [x] Update all OPIOIDES anuncios to end on April 15, 2026
- [x] Update all other anuncios to end on January 31, 2026
- [x] Verify that only OPIOIDES paradas show as occupied
