# Streetview Media — Guía de Migración de Base de Datos

Este documento describe cómo configurar el entorno, conectar la base de datos y ejecutar todas las migraciones necesarias para desplegar el sistema en un nuevo servidor o entorno.

---

## Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

| Herramienta | Versión mínima | Notas |
|---|---|---|
| Node.js | 22.x | Se recomienda usar `nvm` |
| pnpm | 9.x | `npm install -g pnpm` |
| MySQL | 8.0+ | O una instancia TiDB compatible con MySQL |
| Git | Cualquiera | Para clonar el repositorio |

---

## 1. Clonar / Descomprimir el Proyecto

Si tienes el ZIP del proyecto:
```bash
unzip streetview-media.zip -d streetview-media
cd streetview-media
```

Si tienes acceso a un repositorio Git:
```bash
git clone <URL_DEL_REPOSITORIO>
cd streetview-media
```

---

## 2. Instalar Dependencias

```bash
pnpm install
```

---

## 3. Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables. **Nunca subas este archivo a Git.**

```env
# Base de datos MySQL / TiDB
DATABASE_URL="mysql://USUARIO:CONTRASEÑA@HOST:PUERTO/NOMBRE_BD"

# Autenticación JWT (genera una clave aleatoria segura)
JWT_SECRET="una-clave-secreta-larga-y-aleatoria"

# OAuth de Manus (si se usa la plataforma Manus)
VITE_APP_ID=""
OAUTH_SERVER_URL=""
VITE_OAUTH_PORTAL_URL=""
OWNER_OPEN_ID=""
OWNER_NAME=""

# AWS S3 (para almacenamiento de fotos e imágenes)
BUILT_IN_FORGE_API_KEY=""
BUILT_IN_FORGE_API_URL=""
VITE_FRONTEND_FORGE_API_KEY=""
VITE_FRONTEND_FORGE_API_URL=""

# Correo SMTP (para notificaciones)
SMTP_HOST=""
SMTP_PORT=""
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM=""

# URL pública de la aplicación
PUBLIC_URL="https://tu-dominio.com"
```

> **Nota:** En la plataforma Manus, estas variables se inyectan automáticamente desde el panel de Secrets. Si estás migrando a otro proveedor (Railway, Render, VPS propio), deberás configurarlas manualmente.

---

## 4. Crear la Base de Datos

Conéctate a tu servidor MySQL y crea la base de datos:

```sql
CREATE DATABASE streetview_media CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Asegúrate de que el usuario tenga permisos completos sobre esa base de datos:

```sql
GRANT ALL PRIVILEGES ON streetview_media.* TO 'tu_usuario'@'%';
FLUSH PRIVILEGES;
```

---

## 5. Ejecutar las Migraciones

El proyecto usa **Drizzle ORM** para gestionar el esquema de la base de datos. Para aplicar todas las migraciones (crear todas las tablas):

```bash
pnpm db:push
```

Este comando ejecuta internamente `drizzle-kit generate && drizzle-kit migrate`, lo que:
1. Genera los archivos SQL de migración a partir del esquema en `drizzle/schema.ts`.
2. Aplica todas las migraciones pendientes a la base de datos configurada en `DATABASE_URL`.

### Tablas que se crean

El proyecto tiene **35 migraciones** acumuladas (de `0000` a `0034`) que crean y evolucionan las siguientes tablas:

| Tabla | Descripción |
|---|---|
| `users` | Usuarios del sistema con roles (`admin`, `user`, `vendedor`) |
| `paradas` | Paradas de guagua (bus shelters) con coordenadas, condición y estado |
| `anuncios` | Anuncios/campañas publicitarias asociadas a paradas |
| `instalaciones` | Registro de instalaciones pendientes y relocalizaciones |
| `facturas` | Facturas generadas para clientes |
| `pagos` | Abonos y pagos parciales de facturas |
| `seguimientos` | CRM: seguimiento de clientes y renovaciones |
| `notas_cliente` | Notas de conversaciones con clientes |
| `notifications` | Notificaciones internas del sistema |
| `activity_log` | Registro de auditoría de acciones de usuarios |
| `mantenimiento_historial` | Historial de cambios de condición de paradas |
| `anuncio_historial` | Historial de cambios en anuncios |
| `announcements` | Avisos configurables que aparecen al entrar al panel |
| `clientes` | Clientes (empresas/agencias) con datos de contacto y facturación |
| `contratos` | Contratos de publicidad por cliente |
| `contrato_items` | Líneas de detalle de cada contrato (paradas, precios, meses) |
| `contrato_exhibit_a` | Tabla Exhibit A de cada contrato (ubicaciones y especificaciones) |

---

## 6. Crear el Primer Usuario Administrador

Después de ejecutar las migraciones, el primer usuario que inicie sesión con OAuth tendrá rol `user` por defecto. Para promoverlo a `admin`, ejecuta este SQL directamente en la base de datos:

```sql
UPDATE users SET role = 'admin' WHERE email = 'tu-email@streetviewmediapr.com';
```

O si prefieres buscar por nombre:

```sql
UPDATE users SET role = 'admin' WHERE name = 'Tu Nombre';
```

---

## 7. Configurar Azure AD (Microsoft OAuth)

El sistema usa Microsoft Azure AD para autenticación. Para configurarlo:

1. Ve a [portal.azure.com](https://portal.azure.com) → **Azure Active Directory** → **App registrations** → **New registration**.
2. Nombre: `Streetview Media`
3. Tipos de cuenta soportados: selecciona según tu necesidad.
4. URI de redirección: `https://TU_DOMINIO/api/auth/microsoft/callback`
5. Copia el **Application (client) ID** → `MICROSOFT_CLIENT_ID`
6. Copia el **Directory (tenant) ID** → `MICROSOFT_TENANT_ID`
7. En **Certificates & secrets** → crea un nuevo secreto → `MICROSOFT_CLIENT_SECRET`
8. En **API permissions** → agrega `User.Read` (Microsoft Graph).

---

## 8. Iniciar el Servidor de Desarrollo

```bash
pnpm dev
```

El servidor estará disponible en `http://localhost:3000`.

---

## 9. Compilar para Producción

```bash
pnpm build
```

Esto genera:
- `dist/` — Frontend compilado (archivos estáticos).
- `dist/index.js` — Servidor Express compilado.

Para iniciar en producción:

```bash
node dist/index.js
```

---

## 10. Notas sobre el Almacenamiento de Archivos (S3)

Las fotos de paradas, instalaciones y documentos PO se almacenan en **AWS S3** a través de la API de Manus. Si migras fuera de la plataforma Manus, deberás:

1. Configurar un bucket S3 propio en AWS.
2. Actualizar las funciones `storagePut` y `storageGet` en `server/storage.ts` con tus credenciales AWS (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_BUCKET_NAME`).
3. Las URLs de fotos ya almacenadas en la base de datos seguirán apuntando al CDN de Manus — deberás migrar esos archivos manualmente si cambias de proveedor.

---

## 11. Solución de Problemas Comunes

| Problema | Causa probable | Solución |
|---|---|---|
| `Error: connect ECONNREFUSED` | `DATABASE_URL` incorrecto o BD no iniciada | Verifica host, puerto y credenciales |
| `Access denied for user` | Permisos insuficientes en MySQL | Ejecuta `GRANT ALL PRIVILEGES` (ver paso 4) |
| `Table already exists` | Migraciones ya aplicadas parcialmente | Drizzle es idempotente; puedes re-ejecutar `pnpm db:push` |
| `JWT_SECRET not set` | Variable de entorno faltante | Agrega `JWT_SECRET` al archivo `.env` |
| Fotos no cargan | S3 no configurado | Verifica las variables `BUILT_IN_FORGE_API_*` |
| Login falla con Microsoft | Azure AD mal configurado | Verifica `MICROSOFT_CLIENT_ID`, `MICROSOFT_TENANT_ID` y la URI de redirección |
| `Unknown column` en SQL | Migración incompleta | Ejecuta `pnpm db:push` de nuevo |

---

## 12. Estructura del Proyecto

```
streetview-media/
├── client/                  # Frontend React + TypeScript
│   ├── public/              # Assets estáticos
│   └── src/
│       ├── pages/           # Páginas de la aplicación
│       ├── components/      # Componentes reutilizables
│       └── lib/             # Utilidades y cliente tRPC
├── drizzle/
│   ├── schema.ts            # Definición de todas las tablas
│   ├── relations.ts         # Relaciones entre tablas
│   └── 0000_*.sql … 0034_*.sql  # Archivos SQL de migración
├── server/
│   ├── db.ts                # Funciones de consulta a la BD
│   ├── routers.ts           # Procedimientos tRPC (API)
│   ├── storage.ts           # Helpers de AWS S3
│   ├── email-service.ts     # Envío de correos (SMTP)
│   ├── invoice-generator.ts # Generación de facturas PDF
│   └── scheduled-jobs.ts    # Tareas programadas (notificaciones)
├── shared/                  # Tipos y constantes compartidos
├── .env                     # Variables de entorno (NO subir a Git)
├── drizzle.config.ts        # Configuración de Drizzle ORM
└── package.json             # Scripts y dependencias
```

---

---

## 13. Scripts Disponibles

| Comando | Descripción |
|---|---|
| `pnpm dev` | Inicia el servidor de desarrollo (puerto 3000) |
| `pnpm build` | Compila frontend y backend para producción |
| `pnpm start` | Inicia el servidor compilado en producción |
| `pnpm db:push` | Genera y aplica migraciones de base de datos |
| `pnpm test` | Ejecuta los tests con Vitest |
| `pnpm check` | Verifica tipos TypeScript sin compilar |

---

*Actualizado el 26 de marzo de 2026 — Streetview Media PR*
