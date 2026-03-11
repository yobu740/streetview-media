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

## Anuncios Management Section
- [x] Complete Anuncios.tsx page with full table and filters
- [x] Add backend update procedure for anuncios (trpc.anuncios.update)
- [x] Add route to App.tsx for /anuncios page
- [x] Add navigation link in Admin panel to Anuncios page
- [x] Test editing anuncios and verify changes persist

## Auto-Update Expired Anuncios
- [x] Update all expired anuncios (fecha_fin < today) to Finalizado status
- [x] Modify backend to automatically check and update expired anuncios on query
- [x] Verify expired anuncios don't show in "Anuncio Actual" column
- [x] Test that paradas with expired anuncios show as Disponible

## Fix OPIOIDES Anuncios Not Showing
- [x] Verify OPIOIDES anuncios have correct fecha_fin (April 15, 2026)
- [x] Check approval_status of OPIOIDES anuncios
- [x] Verify OPIOIDES anuncios have estado = Activo
- [x] Created 104 active OPIOIDES anuncios until April 15, 2026

## LMS-Style Sidebar Navigation
- [x] Create AdminSidebar component with navigation links
- [x] Design sidebar with logo, user info, navigation sections
- [x] Update Admin.tsx to use sidebar layout
- [x] Update Calendar.tsx to use sidebar layout
- [x] Update Metrics.tsx to use sidebar layout
- [x] Update Anuncios.tsx to use sidebar layout
- [x] Implement mobile responsive behavior (collapsible sidebar)
- [x] Test navigation and responsive behavior

## Refine Sidebar Navigation
- [x] Remove logo from AdminSidebar (keep only in header)
- [x] Remove "Inicio" button from sidebar
- [x] Add "Reportes" button with submenu (Exportar Excel, Imprimir Reporte)
- [x] Add "Edición Masiva" button to sidebar
- [x] Clean Admin.tsx header to only show logo and notifications bell
- [x] Implement mobile hamburger menu for sidebar access
- [x] Test responsive behavior on mobile

## Fix Mobile Sidebar Menu Not Appearing
- [x] Debug why hamburger button is not visible on mobile
- [x] Removed old mobile menu from Admin.tsx that was conflicting
- [x] Fixed z-index and positioning of hamburger button
- [x] Changed button style to be more visible (green bg, white icons)
- [x] Test hamburger menu on mobile viewport

## Action Items Not Showing in Sidebar
- [x] Debug why Exportar Excel, Imprimir Reporte, Edición Masiva not visible
- [x] Check if handlers are being passed correctly to AdminSidebar
- [x] Added "ACCIONES" section title above action items
- [x] Improved styling with border, icons colored, and font-medium
- [x] Verify action items are rendering in both desktop and mobile sidebar
- [x] Test that action buttons work when clicked

## Recent Activity Tracking in Sidebar
- [x] Create activity_log table in database schema
- [x] Run database migration (pnpm db:push)
- [x] Add backend procedures to log user actions (activity.log mutation)
- [x] Create tRPC query to fetch last 3 activities for current user (activity.recent)
- [x] Add "Actividad Reciente" section in AdminSidebar component
- [x] Display activities with relative timestamps (hace X min/hora)
- [x] Add activity logging on Excel export and print report
- [x] Test that activities are logged and displayed correctly

## Fix OPIOIDES Anuncio Tipo Classification
- [x] Query current tipo values for all OPIOIDES anuncios
- [ ] Wait for user to provide original table with B classifications
- [ ] Update anuncio tipo to "Bonificación" for paradas with B classification
- [ ] Verify all OPIOIDES anuncios have correct tipo in gestor de anuncios

## Add Report Generation to Anuncios Manager
- [x] Add date range filter (fecha inicio/fin) to Anuncios page
- [x] Add tipo filter (Fijo/Bonificación/Todos) to Anuncios page
- [x] Add filter UI components to Anuncios page
- [x] Fix imports (FileSpreadsheet, Printer icons)
- [x] Implement handleExportExcel function (CSV export)
- [x] Implement handlePrintReport function (PDF print)
- [x] Include all fields in export: ID, Parada, Cliente, Producto, Tipo, Fechas, Estado
- [ ] Test report generation with different filters

## Add Costo Por Unidad to Reservations
- [x] Add costo_por_unidad field to anuncios table schema
- [x] Run database migration (pnpm db:push)
- [x] Add costo_por_unidad input to reservation modal in Calendar.tsx
- [x] Update backend create procedure to accept costo_por_unidad
- [ ] Test that cost saves correctly

## Add Parada Editing to Anuncios Manager
- [x] Add parada selection dropdown to edit dialog in Anuncios.tsx
- [x] Update backend update procedure to allow changing paradaId
- [ ] Test moving an ad from one parada to another
## Delete Anuncios Functionality
- [x] Add delete button to Anuncios.tsx table
- [x] Add confirmation dialog before deletion
- [x] Implement backend delete procedure (already exists)
- [ ] Test deletion works correctly

## Correct OPIOIDES Ads Classification
- [x] Read Excel file to identify which OPIOIDES ads are Bonificación (B) vs Fijo (F)
- [x] Create SQL update to correct tipo field for OPIOIDES ads
- [x] Verify all OPIOIDES ads have correct tipo after update (74 Fijo, 30 Bonificación)

## Add Parada Condition Fields
- [x] Add condicion_parada fields to paradas table (pintada, arreglada, limpia)
- [x] Add display_publicidad field to paradas table (Si/No/N/A)
- [x] Update Paradas list page to show condition badges (Renovada/Pendiente de renovación)
- [x] Add condition editing fields to parada detail dialog (checkboxes + display select)
- [x] Update backend to accept condition fields
- [ ] Test condition updates work correctly

## Add Clickable Filters to Anuncios Cards
- [x] Make stat cards in Anuncios.tsx clickable to filter by estado
- [x] Add active state styling to selected filter card (ring-2 border)
- [ ] Test filtering works when clicking cards

## Set All Displays to Si and Add Optimistic Updates
- [x] Update all existing paradas to set displayPublicidad to "Si"
- [x] Add optimistic updates to Mantenimiento checkboxes for instant feedback
- [ ] Test that checkboxes respond immediately when clicked

## Add Condición Column to Admin Table
- [x] Add Condición column header to Admin paradas table
- [x] Display status badge (Renovada/Pendiente) based on condition fields
- [ ] Test that status updates when conditions change in Mantenimiento

## Fix Mobile Menu and Reservar Button
- [x] Move Reservar button from Calendar header to main content area
- [x] Add Reservar button to Mis Reservas page for vendedores
- [x] Remove adminOnly restriction from Mantenimiento in sidebar
- [ ] Test mobile menu doesn't have conflicts

## Add Monthly Billing Metrics and Cost Management
- [x] Update all OPIOIDES Fijo ads to $350 cost per unit
- [x] Add cost_por_unidad editing field to Anuncios edit dialog
- [x] Enforce Bonificación ads have $0 cost (auto-set)
- [x] Create monthly billing chart in Métricas page
- [x] Show total revenue by month calculated from cost_por_unidad
- [x] Show annual total and monthly average

## Create PDF Invoice Generation System
- [x] Add "Generar Factura" button to Anuncios page header
- [x] Create dialog to select client and month for invoice
- [x] Implement backend procedure to generate professional PDF invoice
- [x] Include logo, client info, itemized ads, and totals in PDF
- [x] Generate unique invoice numbers
- [ ] Test invoice generation for different clients and months

## Fix Invoice Generation Issues
- [x] Debug why invoices show $0.00 total (fixed by using anuncioIds instead of date range query)
- [x] Add Streetview Media logo to PDF header
- [x] Fix dropdown to show clients instead of products (removed dropdown)
- [x] Change invoice generation to use currently filtered anuncios list
- [x] Remove client/month selector, add title/description input for invoice
- [ ] Test invoice generation with filtered OPIOIDES ads

## Fix Date Range Filter in Anuncios
- [x] Debug why date range filter (desde/hasta) is not working (fixed overlapping logic)
- [ ] Test date filter with various date ranges

## Debug Invoice Generation Issues
- [ ] Debug why logo is not appearing in PDF (check file path and pdfkit image loading)
- [ ] Debug why costs show $0.00 (check costoPorUnidad field name and parsing)
- [ ] Add console logging to invoice generator to trace data flow
- [ ] Test with OPIOIDES ads that have $350 cost

## Fix Invoice Empty Table Issue
- [ ] Add detailed logging to see what anuncioIds are received
- [ ] Add logging to see what database query returns
- [ ] Verify costoPorUnidad is being selected in query
- [ ] Fix logo not loading in PDF (shows text instead of image)

## Invoice Generation Cost Fix
- [x] Update database to set costo_por_unidad = 350 for all OPIOIDES Fijo ads
- [x] Import 104 OPIOIDES ads from Excel with correct costs (74 Fijo @ $350, 30 Bonificación @ $0)
- [ ] Verify invoice PDF shows correct costs and line items
- [ ] Test invoice generation with filtered OPIOIDES ads

## Invoice Generation Fixes (Current)
- [x] Include Activo and Programado ads in invoice (not just Finalizado)
- [x] Fix logo not displaying in PDF header (uploaded to S3 CDN)
- [ ] Test invoice generation with all three estados

## URGENT: Invoice Still Broken
- [x] Production database has all costs at $0 (dev import didn't sync to production) - FIXED with SQL UPDATE
- [x] Fix logo loading - replace require() with ES import - FIXED using fetch()
- [x] Run import script against production database - FIXED with direct SQL

## costoPorUnidad Reading Issue
- [x] Backend changed to use raw SQL instead of Drizzle ORM (avoiding decimal mapping bug)
- [ ] Frontend shows total $350 instead of $25,900 (74 × $350) - NEEDS FIX
- [ ] Test backend invoice generation after raw SQL change

## SQL Execute Error (URGENT)
- [ ] db.execute() with placeholders failing - "Failed query" error
- [ ] Need to use sql`` template or build query differently
- [ ] Invoice generation completely broken

## Invoice & Anuncios Issues (Current)
- [x] Updated costs in production DB (73 Fijo @ $350, 30 Bonificación @ $0)
- [x] Step 1: Change costoPorUnidad from decimal to varchar in schema and migrate data
- [x] Step 2: Add to invoice modal: Production Cost, Other Services (description + cost), Salesperson name
- [x] Step 3: Change ID column to show cobertizoId and enable search by cobertizo number
- [ ] Fix frontend total calculation
- [ ] Change PDF to download instead of open in new tab

## Paradas Status Label
- [ ] Change "Renovada" status label to "Lista" (means ready for sales)

## PDF Download
- [ ] Change invoice PDF to download instead of opening in new tab (browser blocks popup)

## Edit Anuncio Dialog Issues
- [x] Dropdown de paradas no muestra cobertizoId (solo ubicación) - FIXED: ahora muestra cobertizoId
- [x] Falta validación: dropdown debe mostrar solo paradas disponibles en rango de fechas - FIXED: filtra por disponibilidad
- [x] Cambios en parada no se reflejan automáticamente en listas - FIXED: usa Promise.all para invalidar queries

## Remaining Frontend Fixes
- [x] Fix frontend total calculation - shows $350 instead of summing all costs
- [x] Change PDF to download instead of opening in new tab - uses fetch + blob
- [x] Rename parada status "Renovada" to "Lista"

## PDF Invoice Issues (URGENT)
- [x] Texto solapado - vendedor debe estar en header, no en footer
- [x] Solo muestra 1 anuncio en PDF cuando se seleccionaron 103 activos - FIXED: updated costs in DB

## Edit Dialog Parada Display
- [x] Dropdown de parada aparece vacío en edición - FIXED: ahora muestra parada actual con cobertizoId

## PDF Layout Fixes (Current)
- [x] Vendedor en header se solapa con descripción - FIXED: dynamic Y positioning
- [x] Totales se solapan - FIXED: changed to table format with proper spacing

## Invoice History System
- [x] Create facturas table schema (id, fecha, cliente, monto, pdf_url, created_by, etc.)
- [x] Add migration for facturas table - 0016_glorious_kang.sql
- [x] Create backend procedures (list with filters, delete)
- [x] Create Facturas page with table and filters - /facturas route
- [x] Save invoice record when generating PDF - auto-saves to facturas table

## Final Enhancements
- [x] Add Facturas link to main navigation menu (Home page)
- [x] Implement Excel export for Facturas page
- [x] Change anuncios.list to protectedProcedure
- [x] Change facturas.list to protectedProcedure
- [x] Change invoices.generate to protectedProcedure

## Reorganization - Move Facturas to Admin Area
- [x] Remove Facturas link from public landing page navigation (desktop and mobile)
- [x] Add Facturación menu item to AdminSidebar below Mantenimiento (admin-only)
- [x] Add AdminSidebar layout to Facturas page
- [x] Implement Excel export for individual invoices (button in table actions)

## UI Fixes - Responsive and Header Issues
- [x] Fix responsive layout: Generar Factura button overflow in Anuncios page
- [x] Fix button overflow in Facturación page
- [x] Add header with Streetview Media logo to Facturación page

## Home Page Content Updates
- [x] Update footer email to sales@streetviewpr.com
- [x] Update Parada Digital format description with new content
- [x] Update Parada Fija format description with new content and dimensions

## Paradas Page Enhancements
- [x] Add editable location/address field in parada detail modal
- [x] Implement multi-select checkboxes for paradas in table
- [ ] Add bulk status change functionality for selected paradas
- [x] Update Excel export to include "Anuncio Actual" column (product info)
- [x] Modify export to only export selected paradas when checkboxes are used
- [x] Add "Select All" checkbox in table header

## Bug Fixes
- [x] Fix editable location/address fields in parada detail modal - fields not accepting keyboard input

## UI Improvements - Reservation Modal
- [x] Change reservation modal to display direccion instead of localizacion next to parada ID

## Bulk Edit Feature for Anuncios
- [x] Add checkboxes to Anuncios table for multi-select
- [x] Add "Select All" checkbox in table header
- [x] Show "Editar Seleccionados" button when anuncios are selected
- [x] Create bulk edit modal with fields: Tipo, Fecha Final, Estado, Producto, Cliente
- [x] Implement conditional field enabling: Producto (only if all same producto), Cliente (only if all same cliente)
- [x] Add backend bulk update procedure
- [x] Test bulk edit with various selection scenarios

## Permission Enforcement and Menu Cleanup
- [x] Remove "Edición Masiva" option from AdminSidebar menu
- [x] Enforce admin-only permission for editing parada locations/addresses (already implemented)
- [x] Enforce admin-only permission for editing anuncio dates (fechaInicio, fechaFin)
- [x] Enforce admin-only permission for changing maintenance status (condicion)
- [x] Ensure vendedores/users can create reservations and view listings
- [x] Hide edit buttons and disable edit functionality for non-admin users in Anuncios page
- [x] Disable maintenance status toggles for non-admin users in Mantenimiento page
- [x] Test all permission scenarios (admin, vendedor, user roles)

## Anuncios Report Enhancement
- [x] Add "Costo" column to Excel export showing price for each anuncio
- [x] Display "Bonificación - Sin Costo" for anuncios with tipo "Bonificación" in Excel
- [x] Add "Costo" column to print report with same bonificación handling

## Home Page - New Format Addition
- [x] Add Troqueles format card to formats section with description

## Interactive Map Implementation
- [x] Read Excel file with paradas coordinates (1039 paradas extracted)
- [x] Add latitude/longitude fields to paradas database schema (already exists: coordenadasLat, coordenadasLng)
- [x] Import coordinates data from Excel into database (using JSON file approach for map)
- [x] Create custom bus stop SVG icon with brand colors (#1a4d3c, #ff6b35)
- [x] Implement interactive Google Map component on Home page
- [x] Add info windows showing parada ID and direccion on marker click
- [x] Center map on San Juan, Puerto Rico with appropriate zoom level
- [x] Make map responsive for mobile devices

## Map Debugging - Markers Not Showing
- [x] Check browser console for errors loading paradas_coordinates.json
- [x] Verify markers are being created correctly with proper coordinates
- [x] Ensure map centers on San Juan with all parada markers visible
- [x] Fixed timing issue: markers now added after both map AND data are ready

## Replace Google Maps with Leaflet + OpenStreetMap
- [x] Install leaflet and react-leaflet packages
- [x] Create LeafletMap component with OpenStreetMap tiles
- [x] Add custom bus stop icon markers with brand colors
- [x] Implement info popups showing parada ID and direccion
- [x] Replace ParadasMap component to use Leaflet
- [x] Test map displays all 1039 paradas correctly

## Bug Fix - Map Duplicate Keys
- [x] Fix React duplicate key error in ParadasMap caused by duplicate parada IDs (e.g., AMA11)

## Map Enhancements - Clustering, Scroll, and Filters
- [x] Install react-leaflet-cluster package for marker clustering
- [x] Implement MarkerClusterGroup to group nearby paradas when zoomed out
- [x] Add smooth scroll functionality to "Ver Localizaciones" buttons
- [ ] Create filter controls for Ruta (route selection) - DEFERRED: requires database integration
- [ ] Create filter controls for Tipo de Formato (Fija/Digital/Troqueles) - DEFERRED: requires database integration
- [ ] Create filter controls for Disponibilidad (Disponible/Ocupada) - DEFERRED: requires database integration
- [ ] Update map markers in real-time based on selected filters - DEFERRED: requires database integration

## Contact Form Email Implementation
- [x] Fix footer email address to sales@streetviewmediapr.com
- [x] Create backend tRPC procedure to send contact form emails
- [x] Configure email sending to sales@streetviewmediapr.com and cesteves@streetviewmediapr.com
- [ ] Connect frontend contact form to backend email procedure
- [ ] Add success/error toast notifications for form submission

## Map Section Text Update
- [x] Update "Nuestras Ubicaciones" section description text

## Contact Form and Landing Page Updates

- [x] Implement contact form email functionality with Outlook SMTP
- [x] Configure email service to send to sales@streetviewmediapr.com and cesteves@streetviewmediapr.com
- [x] Connect form inputs to tRPC mutation
- [x] Add loading state and success/error handling
- [x] Verify SMTP credentials with test
- [ ] Update map section title to "Nuestras Ubicaciones"
- [ ] Update map section description to "Presencia estratégica en todo el área metropolitana de San Juan y en sus principales avenidas. Contamos con mas de 400 paradas con diferentes formatos."

## Navigation Update

- [x] Remove Admin link from header navigation (desktop and mobile)
- [x] Add Admin link to footer Enlaces section

## Contact Form Bug Fix

- [x] Debug 500 error when sending contact form emails
- [x] Check server logs for detailed error message
- [x] Verify SMTP credentials are correctly configured
- [x] Fix email sending functionality (changed from address to use authenticated SMTP_USER)

## Contact Form Improvements

- [x] Remove cesteves@streetviewmediapr.com from email recipients (only send to sales@)
- [x] Add toast notification for successful form submission
- [x] Implement Google reCAPTCHA v3 for spam protection

## reCAPTCHA Verification Bug

- [x] Debug reCAPTCHA verification failure error (browser-error in dev, works in production)
- [x] Check server logs for detailed error information
- [x] Add development mode bypass for easier testing

## Date Display Bug

- [x] Re-investigate date formatting function (fixed to parse ISO strings directly)
- [x] Fix date showing day before in Gestor de Anuncios table (backend conversion)
- [x] Fix date showing day before in Panel Principal "Anuncio Actual" column (backend conversion)
- [x] Fix date showing day before in reports/exports (backend conversion)
- [x] Fix Parada detail view in Panel Principal
- [x] Verify invoice generation shows correct dates (working)
- [x] Verify Detalle del anuncio shows correct dates (working)

## OAuth Custom Domain Migration

- [x] Update Microsoft Azure OAuth redirect URIs to include www.streetviewmediapr.com
- [x] Add reCAPTCHA domains (streetview-mediapr.manus.space and www.streetviewmediapr.com)
- [x] Fix OAuth redirect to maintain custom domain after authentication (use req.get('host') instead of PUBLIC_URL)
- [ ] Test authentication on custom domain
- [ ] Document the process for future reference

## Domain Redirect Investigation

- [x] Review code for hardcoded domain references (none found)
- [x] Identified issue: req.get('host') returns Cloud Run domain, not custom domain
- [x] Find correct header for custom domain detection (headers not passed by Manus proxy)
- [x] Update OAuth code to check forwarded headers first (didn't work)
- [x] New approach: Frontend passes window.location.origin to backend
- [x] Update getLoginUrl() to include origin parameter and in state
- [x] Update backend to use origin from query parameter
- [x] Update callback to redirect to absolute URL with custom domain
- [ ] Test authentication with custom domain

## OAuth Callback Error

- [x] Check server logs for OAuth callback error details
- [x] Identify root cause of "OAuth callback failed" error (callback was using Cloud Run domain instead of custom domain)
- [x] Fix the issue (parse origin from state before calling getTokenFromCode)
- [ ] Deploy and test authentication flow in production

## Invoice and Export Improvements

- [x] Fix invoice to include bonification items (price $0) in the invoice
- [x] Add client selector in invoice modal when multiple clients are selected
- [x] Add "Notas" column to Excel exports in Gestor de Anuncios
- [x] Add "Orientación (I/O)" column to Excel exports in Gestor de Anuncios

## Historial de Anuncios Feature

- [ ] Create database table for anuncio history (anuncio_historial)
- [ ] Track location changes (parada relocations) with timestamps
- [ ] Track state changes (Activo, Programado, Finalizado, Inactivo) with timestamps
- [ ] Create backend router for history queries
- [ ] Add history view in anuncio detail modal
- [ ] Display history timeline with dates and changes

## Invoicing System Improvements

- [x] Add payment status column to facturas table (Pagada/Pendiente/Vencida)
- [x] Add payment date column to facturas table
- [x] Create Facturación page with invoices table
- [x] Add status badges with colors in invoices table
- [x] Implement mark as paid functionality with date picker
- [ ] Create invoice preview modal before PDF generation
- [ ] Show all included anuncios in preview with calculations
- [ ] Add email sending functionality for invoices
- [ ] Implement email customization modal
- [ ] Create reporting dashboard page
- [ ] Add monthly income charts
- [ ] Add client comparison analytics
- [ ] Add additional services analysis
- [ ] Implement customizable invoice templates system
- [ ] Add template selector (corporativo vs. pequeño negocio)
- [ ] Allow logo and terms customization per template

## Notification System

- [ ] Create notification for overdue unpaid invoices
- [ ] Create notification for clients without invoice in last month
- [ ] Add notification dashboard/panel in admin
- [ ] Implement automatic email reminders for overdue invoices
- [ ] Add scheduled job to check and send notifications daily
- [ ] Create notification preferences/settings page

## Facturacion Page Fixes

- [x] Fix page layout - add proper header/title
- [x] Restore delete invoice button
- [x] Add search/filter functionality for invoices
- [x] Add export report button with options (por mes, por cliente)

## Facturacion Page Fixes

- [x] Fix page layout - add proper header/title
- [x] Restore delete invoice button
- [x] Add search/filter functionality for invoices
- [x] Add export report button with options (por mes, por cliente)

## Facturacion Header Fix

- [x] Add same header layout as Panel Principal (logo + notification bell)
- [x] Remove "Volver" button (Facturacion is a main section, not a sub-page)

## Facturacion Scroll Issue

- [x] Fix unnecessary vertical scroll in Facturacion page - adjust padding/spacing

## Facturacion React Hooks Error

- [x] Fix "Rendered more hooks than during the previous render" error in Facturacion page

## Facturacion Layout Fix

- [x] Remove header with logo (should only have sidebar like other admin sections)
- [x] Fix large empty space before "Facturación" title causing scroll

## New Features Implementation

### Date Filters in Facturacion
- [x] Add date range picker component to Facturacion page
- [x] Implement filtering logic for invoices by date range
- [x] Add quick filter buttons (Este mes, Último mes, Últimos 3 meses)

### Ad History Audit System
- [x] Create anuncioHistorial table in database schema
- [x] Add tRPC procedures for logging and querying history
- [x] Automatically log changes when ad status or location changes
- [ ] Create UI component to display history table for each ad (can be added later when needed)

### Invoice Preview Modal
- [x] Create modal component with invoice preview
- [x] Display all included ads with individual costs
- [x] Show calculated totals (subtotal, production, other services, total)
- [x] Add editable fields for adjustments before PDF generation
- [x] Integrate with existing invoice generation flow

### Automatic Notification System
- [x] Create background job to check overdue invoices daily
- [x] Send notifications for invoices past due date without payment
- [x] Check clients without invoices in last 30 days
- [x] Create notification entries in database for admin review

## Statistics Dashboard and History UI

- [x] Add mini dashboard with invoice statistics (Total, Pagadas, No Pagadas) to Facturacion page
- [x] Create UI component to display ad history audit logs
- [x] Add button/link to view history for each ad in Anuncios page

## Notification System Test

- [x] Add manual test button in Admin panel to trigger notification check
- [x] Display toast with results showing how many notifications were created

## Campaign Expiration Alerts

- [x] Add notification types for campaign expiration (21, 14, 7 days before end)
- [x] Create procedure to check campaigns ending soon
- [x] Integrate with existing notification system
- [x] Send notifications to sales team/admins

## CRM System for Vendedores

### Database Schema
- [x] Create seguimientos table (client follow-ups tracking)
- [x] Create notas_cliente table (conversation notes)
- [x] Add follow-up status enum (Pendiente, Contactado, Interesado, Renovado, No Renovará)

### Backend (tRPC)
- [x] Create seguimientos router with CRUD procedures
- [x] Add procedure to get pending follow-ups for vendedor
- [x] Add procedure to mark client as contacted
- [x] Add procedure to schedule future calls
- [x] Add procedure to save conversation notes

### Frontend
- [x] Create Vendedor dashboard page with sidebar access
- [x] Build task list showing clients with campaigns ending soon
- [x] Add contact registration form with date and result
- [x] Create follow-up scheduling interface with calendar
- [x] Build notes editor for conversation details
- [x] Add status badges and filters

## Invoice Improvements

- [x] Add Streetview Media address below logo in PDF invoices (130 Ave. Winston Churchill, PMB 167, San Juan, PR 00926)
- [x] Change invoice numbering to short sequential format (INV-190, INV-191, etc.)

## Invoice Numbering Update

- [x] Update invoice numbering to start from INV-1000 for consistent 4-digit format

## Migrate Existing Invoices

- [x] Create migration script to renumber all existing invoices to 4-digit format
- [x] Execute migration on database
- [x] Verify all invoices have new numbering format (10 invoices migrated: INV-1000 to INV-1009)

## Invoice PDF Footer Fix

- [x] Move thank you message from separate page to footer of last page
- [x] Ensure message appears at bottom of final page regardless of invoice length
- [x] Fix: Footer still appearing on second page - need to place dynamically after content

## Invoice Archiving System

- [x] Add 'archivada' boolean field to facturas table schema
- [x] Create tRPC procedures for archiving/unarchiving invoices
- [x] Add archive button to Facturacion table for paid invoices
- [x] Add filter toggle to show/hide archived invoices
- [x] Create archived invoices view section

## Ad Relocation Tracking Enhancement

- [x] Implement automatic detection of parada_id changes in update logic
- [x] Update history logging to capture old and new parada names (not just IDs)
- [x] Add "Relocalizado" action type to history with from/to parada details
- [x] Enhance edit modal to show warning when parada is being changed
- [x] Add optional "Motivo de relocalización" field in edit modal
- [x] Update history display UI to clearly show relocation events with parada names (already shows in history dialog)

## Invoice PDF Footer Fix (Second Attempt)

- [x] Remove doc.addPage() call that creates second page (no addPage found - was spacing issue)
- [x] Place footer directly after content on same page with reduced spacing
- [ ] Test with actual invoice to verify single-page output

## Remove Invoice Footer Message

- [x] Remove "Gracias por su preferencia" message from invoice PDF completely

## UI Improvements - Combobox, Direccion Column, Caras Labels

- [ ] Implement combobox with search for parada selection in ad edit modal
- [ ] Change "Ubicacion" column to "Direccion" in Gestor de Anuncios table
- [ ] Update Panel Principal stats: "Total Paradas" → "Total Caras", "Paradas Disponibles" → "Caras Disponibles", "Paradas Ocupadas" → "Caras Ocupadas"

## Estado "En Construcción" en Mantenimiento
- [x] Añadir campos enConstruccion y fechaDisponibilidad al schema de paradas
- [x] Ejecutar migración de base de datos (pnpm db:push)
- [x] Actualizar procedimiento updateCondicion para aceptar nuevos campos
- [x] Registrar cambio de estado En Construcción en historial de mantenimiento
- [x] Actualizar getAllParadas en paradas-db.ts para incluir nuevos campos
- [x] Añadir botón/ícono de casco en columna Estado General de Mantenimiento
- [x] Crear diálogo para marcar/desmarcar En Construcción con fecha estimada
- [x] Mostrar badge amarillo "En Construcción" con fecha de disponibilidad en listado
- [x] Añadir filtro "En Construcción" en el selector de condición
- [x] Añadir contador "En Construcción" en las tarjetas de estadísticas
- [x] Incluir estado En Construcción en exportación Excel y reporte impreso

## En Construcción - Integración con Panel Principal
- [x] Caras en construcción deben contarse como no disponibles en stats del panel principal
- [x] Mostrar badge "En Construcción" en columna Condición del panel principal
- [x] Al marcar en construcción: verificar si hay anuncio activo/programado y alertar para relocalizar
- [x] Bloquear marcado en construcción si hay anuncio activo hasta que se relocalice o cancele

## En Construcción - Próximos Pasos
- [x] Bloquear creación y aprobación de anuncios en caras En Construcción (backend)
- [x] Mostrar mensaje de error con fecha estimada al intentar reservar cara En Construcción
- [x] Botón "Relocalizar" en el aviso de anuncio activo en Mantenimiento
- [x] Notificación automática al admin cuando vence la fecha estimada de disponibilidad

## Historial de Anuncios - Nombre de Usuario
- [x] Corregir historial de anuncios para mostrar nombre real del usuario en lugar de "usuario desconocido"

## Facturación - Correcciones
- [x] Corregir campo "Facturado a" en factura: mostrar "Todos los clientes" cuando se selecciona esa opción en el modal de preview

## Facturación - Exportar Reporte PDF
- [x] Añadir botón "Exportar Reporte PDF" en el módulo de Facturación
- [x] Generar PDF con listado completo de facturas (número, cliente, fecha, total, estado de pago)
- [x] Incluir resumen de totales al final: total pagadas, pendientes, vencidas y gran total

## Facturación - Pagos Parciales
- [ ] Añadir tabla `pagos` al schema (facturaId, monto, fechaPago, metodoPago, notas)
- [ ] Añadir procedimientos backend: registrar abono, listar pagos por factura, eliminar abono
- [ ] Calcular balance adeudado automáticamente (total - suma de abonos)
- [ ] Estado "Pago Parcial" (badge azul) cuando hay abonos pero no está pagada completamente
- [ ] Auto-marcar como "Pagada" cuando suma de abonos iguala el total
- [ ] Columna "Balance" en tabla de facturas
- [ ] Diálogo de historial de abonos con botón "Registrar Abono"
- [ ] Actualizar reporte PDF para incluir columna balance y totales de deuda parcial

## Facturación - Pagos Parciales
- [x] Añadir tabla `pagos` en schema y ejecutar db:push
- [x] Procedimientos backend: registrarAbono, listPagos, deleteAbono
- [x] Estado "Pago Parcial" (badge azul) en facturas
- [x] Columna "Balance" en tabla de facturas
- [x] Botón "Abono" por factura no pagada
- [x] Diálogo de registro de abono con monto, fecha, método y notas
- [x] Diálogo de historial de abonos con resumen de balance
- [x] Tarjeta "Pago Parcial" en estadísticas de Facturación
- [x] Reporte PDF actualizado con columna Balance y total adeudado

## Reporte PDF Facturación - Logo y Slogan
- [x] Usar logo real de Streetview Media (imagen PNG) en el encabezado del reporte PDF
- [x] Actualizar slogan a "Tu Marca en el Camino" en el reporte PDF

## Reporte PDF - Logo Blanco
- [x] Convertir logo a versión blanca para que sea visible sobre el fondo verde del encabezado del reporte PDF

## Correcciones Urgentes
- [x] Pagos parciales: columna Balance debe mostrar monto adeudado (total - abonos), no el total original
- [x] Reporte PDF: logo no carga en producción porque usa ruta local del servidor - cambiar a CDN URL

## Facturación - Dashboard Stats Fix
- [x] Tarjeta "Pago Parcial": mostrar total de abonos recibidos (no el total de la factura)
- [x] Tarjeta "No Pagadas": mostrar suma de balances adeudados (Pendiente + Vencida + balance restante de Pago Parcial)

## Reporte PDF - Orientación Horizontal
- [x] Cambiar reporte de facturación a orientación horizontal (landscape) para que todas las columnas quepan sin cortarse

## Caras Destacadas (Estrella Manual)
- [x] Añadir campo `destacada` boolean en tabla paradas (schema + db:push)
- [x] Procedimiento backend para toggle de destacada
- [x] Estrella dorada clickeable en panel principal para marcar/desmarcar
- [x] Badge/indicador visual en filas destacadas
- [x] Filtro "Solo Destacadas" en el panel principal

## Notificaciones Toast Flotante
- [x] Tabla `announcements` en schema (mensaje, tipo, activo, fechas)
- [x] Procedimientos backend: crear, editar, activar/desactivar, eliminar, getActive
- [x] Toast flotante en esquina inferior derecha al entrar a la plataforma (con botón cerrar)
- [x] Se recuerda en sessionStorage para no repetirse en la misma sesión
- [x] Página "Anuncios Sistema" para admin (crear, editar, activar/desactivar, eliminar)
- [x] Enlace "Anuncios Sistema" en el sidebar (solo admin)

## Correcciones y Mejoras - Notificaciones y Estrella
- [x] Eliminar sistema de toast/anuncios (AnnouncementToast, AnunciosConfig, ruta, sidebar link)
- [x] Corregir bug: estrella destacada no se marca visualmente al hacer clic
- [x] Añadir pop-up en campana de notificaciones mostrando "Tiene X notificaciones sin leer"
- [x] Marcar notificación como leída al tocarla (quitar marca naranja)
- [x] Añadir botón "Marcar todas como leídas"
- [x] Añadir procedimiento backend markAllAsRead
- [x] Backdrop para cerrar panel al hacer clic fuera

## Fix Estrella - Actualización Instantánea
- [x] Implementar optimistic update en toggleDestacada para respuesta inmediata sin esperar servidor

## Bloqueo de Reservas por Display
- [x] Backend: bloquear creación de anuncios si parada tiene displayPublicidad = "No"
- [x] Frontend: mostrar indicador visual "Sin Display" en paradas bloqueadas
- [x] Frontend: deshabilitar botón "+" y mostrar tooltip explicativo
- [x] Frontend: mostrar badge "Sin Display" en listado de paradas
- [x] Frontend: tarjeta de filtro "Sin Display" en panel de stats

## Flowcat Filter Feature
- [x] Poblar campo flow_cat en todas las paradas según mapeo localizacion → número Flowcat (1073 paradas actualizadas)
- [x] Agregar procedimiento backend getFlowcats para listar Flowcats únicos
- [x] Agregar filtro por Flowcat en panel Admin con ordenamiento: cobertizo numérico asc, I antes de O antes de P
- [x] Mostrar nombre de avenida + número Flowcat en el dropdown de filtro
- [x] Mostrar FC XXX debajo de localizacion en tabla
- [x] Badge de Flowcat activo en header de tabla con indicador de ordenamiento

## Flowcat en Reportes
- [x] Agregar columna "Flowcat" en el reporte de Excel exportado
- [x] Agregar filtro por Flowcat en el modal de impresión de reportes (con ordenamiento secuencial)

## Fix Dashboard En Construcción
- [x] Corregir conteo y filtro "En Construcción" para usar campo enConstruccion directamente (condicion en Mantenimiento), sin verse afectado por prioridad de Sin Display

## Notificaciones - Botones Ignorar y Dar Seguimiento
- [x] Agregar campo "ignorada" a la tabla de notificaciones en DB
- [x] Agregar procedimiento backend ignoreNotification
- [x] Agregar procedimiento backend createSeguimientoFromNotification (obtiene fechaFin real del anuncio)
- [x] Mostrar botones "Ignorar" y "Dar Seguimiento" en notificaciones de anuncios por vencer
- [x] Al dar seguimiento: crear entrada automática en el área de seguimiento con info del cliente/anuncio
- [x] Ocultar notificaciones ignoradas del panel (campo ignorada=1 excluido de la query)

## Fix - Botones en Sección "Anuncios Próximos a Vencer"
- [x] Agregar botones "Dar Seguimiento" e "Ignorar" en la sección de anuncios por vencer del dashboard

## Sección Anuncios Por Vencer - Acordeón + Botones
- [x] Convertir sección "Anuncios Próximos a Vencer" en acordeón colapsable (cerrado por defecto)
- [x] Agregar botones "Dar Seguimiento" e "Ignorar" en cada fila del listado
- [x] Ocultar filas ignoradas del listado (estado local con dismissedExpiringIds)

## Seguimientos - Mejoras Completas
- [x] DB: agregar campos telefono, email, archivedAt a tabla seguimientos
- [x] DB: agregar campo anuncioId opcional (para seguimientos manuales sin anuncio)
- [x] Backend: procedimiento createManual (nombre, producto, telefono, email, vendedor opcional)
- [x] Backend: procedimiento updateContact (telefono, email)
- [x] Backend: procedimiento assignVendor
- [x] Backend: procedimiento deleteSeguimiento
- [x] Backend: procedimiento archiveSeguimiento
- [x] Backend: procedimiento listVendors (para el dropdown de asignación)
- [x] UI: botón "Añadir Cliente" con modal (nombre, producto, teléfono, email, vendedor opcional, fecha límite)
- [x] UI: campos teléfono y email editables en cada seguimiento (botón lápiz)
- [x] UI: botón "Asignar a Vendedor" con dropdown de vendedores
- [x] UI: botón "Borrar" con confirmación
- [x] UI: botón "Archivar" y vista de archivados con toggle

## Nuevas Funcionalidades - Mantenimiento y Reportes
- [ ] Añadir condición "Removida" en Mantenimiento (bloquea reservas, tiene fecha estimada de retorno)
- [ ] Añadir columna de coordenadas en reporte Excel de anuncios
- [ ] Añadir columna de coordenadas en reporte PDF de anuncios

## Página de Notificaciones
- [ ] Crear página /notificaciones con secciones: Reservas Pendientes, Anuncios por Vencer, Notificaciones del Sistema
- [ ] Registrar ruta /notificaciones en App.tsx
- [ ] Agregar enlace en sidebar/nav hacia /notificaciones
- [ ] Corregir botón "Ir a Notificaciones" en Admin para navegar a /notificaciones
- [ ] Eliminar secciones duplicadas del panel Admin (reservas pendientes y anuncios por vencer)

## Simplificación de Estados en Panel Principal
- [ ] Reemplazar estados de parada por 3: Ocupado, Disponible, No Disponible
- [ ] "Sin Display" → "No Disponible" en toda la app
- [ ] No Disponible = Construcción + Sin Display + Removida (bloquea reservas)
- [ ] Disponible = condición Lista o Pendiente
- [ ] Eliminar estrellas y categoría Destacado
- [ ] Actualizar contadores: Total Caras, Caras Disponibles, Caras Ocupadas, No Disponibles
- [ ] Eliminar contadores: En Construcción, Caras Destacadas, Sin Display
- [ ] Arreglar logo de Streetview desaparecido en factura PDF
- [x] Agregar columna Orientación en Gestor de Anuncios (tabla y exportes)
- [x] Restaurar campo Flowcat en modal de Añadir Parada
- [x] Restaurar campo Flowcat editable en detalle de parada
- [ ] Add multi-select checkboxes to Mantenimiento table
- [ ] Add select-all checkbox in Mantenimiento table header
- [ ] Add bulk action toolbar in Mantenimiento (En Construcción, Removida, Sin Display, Limpiar condición)
- [ ] Add bulk condition change confirmation dialog in Mantenimiento
- [ ] Add bulkUpdateCondicion backend procedure for batch updates
- [ ] Create Notificaciones page with reservas pendientes, anuncios por vencer, and approvals
- [ ] Add job automático to reactivate Removidas when fechaRetorno arrives
- [ ] Add Flowcat/Ruta filter dropdown to Gestor de Anuncios

## Completado - Sesión Actual
- [x] Add multi-select checkboxes to Mantenimiento table
- [x] Add select-all checkbox in Mantenimiento table header
- [x] Add bulk action toolbar in Mantenimiento (En Construcción, Removida, Sin Display, Limpiar condición)
- [x] Add bulk condition change confirmation dialog in Mantenimiento
- [x] Add bulkUpdateCondicion backend procedure for batch updates
- [x] Create Notificaciones page with reservas pendientes, anuncios por vencer, and approvals
- [x] Add job automático to reactivate Removidas when fechaRetorno arrives (daily notification)
- [x] Add Flowcat/Ruta filter dropdown to Gestor de Anuncios
- [x] Fix dashboard stat cards grid: changed from md:grid-cols-6 (leaving 2 empty columns) to grid-cols-2 md:grid-cols-4 so all 4 cards fill the full row

## Companion Parada al Crear
- [x] Después de crear una parada Inbound, preguntar si desea crear la Outbound con los mismos datos
- [x] Después de crear una parada Outbound, preguntar si desea crear la Inbound con los mismos datos
- [x] Mostrar diálogo de confirmación con preview de los datos que se crearán
- [x] Al confirmar, crear la parada complementaria automáticamente

## Detección de Duplicados - Parada Complementaria
- [x] Antes de crear la parada complementaria, verificar si ya existe una con el mismo cobertizoId y la orientación opuesta
- [x] Si existe duplicado, mostrar advertencia con los datos de la parada existente en lugar de crear otra
- [x] Permitir al usuario cancelar o forzar la creación si lo desea

## Condición detallada en Panel Principal
- [x] Cuando la parada es "No Disponible", mostrar el estado específico de Mantenimiento (Removida, En Construcción, Sin Display) en la columna Condición del panel principal

## Métrica de Paradas Físicas
- [x] Calcular paradas físicas únicas consolidando IDs con sufijos A-H como una sola parada
- [x] Mostrar tarjeta "Paradas Físicas" en el área de métricas del panel principal
