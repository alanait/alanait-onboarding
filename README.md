# ALANA IT Onboarding Tecnico

Herramienta web para realizar auditorias tecnicas de onboarding a nuevos clientes IT. Permite recopilar de forma estructurada toda la informacion sobre la infraestructura tecnologica de una empresa durante la primera visita.

**App en produccion:** [https://alanait-onboarding.vercel.app](https://alanait-onboarding.vercel.app)

## Para que sirve

Cuando un proveedor de servicios IT (MSP) incorpora un nuevo cliente, necesita documentar toda su infraestructura existente: redes, servidores, backups, correo, seguridad, etc. Esta app guia al tecnico a traves de un formulario completo y estructurado, y genera un informe PDF al finalizar.

## Secciones de auditoria

La app cubre 13 areas de infraestructura IT:

| Seccion | Que se documenta |
|---|---|
| Red | ISP, routers, firewalls, switches, VLANs, IPs |
| Servidores | Hostname, SO, roles, RAM, almacenamiento, AD |
| Ordenadores / PCs | Cantidad, SO, dominio, MDM, antiguedad |
| Backup | Software, destino, frecuencia, retencion, pruebas |
| Correo Electronico | Proveedor, dominio, buzones, MFA, antispam |
| Antivirus / EDR | Solucion, consola, licencias, cobertura |
| WiFi | SSIDs, APs, controlador, cobertura |
| VPN | Tipo, solucion, usuarios, MFA |
| SAI / UPS | Marca, autonomia, equipos protegidos |
| Almacenamiento | NAS, cloud, permisos, sincronizacion |
| Telefonia | VoIP, centralita, extensiones, moviles |
| Impresion | Impresoras, IPs, consumibles, mantenimiento |
| Aplicaciones / ERP | ERP, CRM, licencias, soporte, alojamiento |

## Funcionalidades

- Formularios dinamicos con campos condicionales
- Multiples instancias por seccion (ej: varios servidores)
- Capturas de pantalla por seccion (explorador, portapapeles)
- Barra de progreso por secciones completadas
- Guardado en la nube con base de datos
- Historial de versiones (restaurar cualquier estado anterior)
- Exportar/importar archivos `.alanait` como backup
- Exportar informe a PDF
- Login con email y contrasena (restringido a dominio corporativo)
- Dashboard con listado y busqueda de clientes

## Arquitectura

```
Frontend (React + Vite)
    |
    ├── src/App.jsx                  # Editor de onboarding
    ├── src/components/Dashboard.jsx  # Panel de clientes
    ├── src/components/LoginPage.jsx  # Autenticacion
    ├── src/components/VersionHistory.jsx
    ├── src/lib/supabase.js          # Cliente de base de datos
    ├── src/lib/auth.js              # Funciones de login
    └── src/lib/clientService.js     # CRUD de clientes

Backend (Supabase - servicio externo)
    |
    ├── PostgreSQL                   # Base de datos (clientes, versiones)
    ├── Storage                      # Almacenamiento de imagenes
    └── Auth                         # Autenticacion de usuarios

Hosting (Vercel)
    |
    └── Auto-deploy desde rama main
```

| Capa | Tecnologia |
|------|-----------|
| Frontend | React 18 + Vite 5 |
| Base de datos | Supabase (PostgreSQL) |
| Imagenes | Supabase Storage |
| Autenticacion | Supabase Auth |
| Hosting | Vercel (auto-deploy desde GitHub) |

## Desarrollo local

### Requisitos

- [Node.js](https://nodejs.org) (version 18 o superior)
- npm
- Credenciales de Supabase (pedir al administrador)

### Pasos

```bash
git clone https://github.com/alanait/alanait-onboarding.git
cd alanait-onboarding
npm install
```

Crear archivo `.env.local` en la raiz con las credenciales:

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

Iniciar el servidor de desarrollo:

```bash
npm run dev
```

Se abre en http://localhost:3000

### Scripts

| Comando | Descripcion |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de produccion (carpeta `build/`) |
| `npm run preview` | Previsualizar build |

## Despliegue

El despliegue es automatico: cada push a la rama `main` despliega en Vercel.

```
git add .
git commit -m "descripcion del cambio"
git push origin main
# Vercel despliega automaticamente en ~1 minuto
```

Las variables de entorno de produccion se configuran en el dashboard de Vercel (Settings > Environment Variables).

## Estructura de la base de datos

| Tabla | Descripcion |
|-------|-------------|
| `clients` | Datos de cliente + formulario (JSONB) |
| `client_versions` | Historial de cambios por cliente |
| `client_images` | Referencias a imagenes en Storage |

El script de creacion esta en `supabase-setup.sql`.

## Licencia

Uso interno ALANA IT.
