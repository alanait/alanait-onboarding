# ALANA IT Onboarding Tecnico

Herramienta web para realizar auditorias tecnicas de onboarding a nuevos clientes IT. Permite recopilar de forma estructurada toda la informacion sobre la infraestructura tecnologica de una empresa durante la primera visita.

**App en produccion:** [https://alanait-onboarding.vercel.app](https://alanait-onboarding.vercel.app)

## Para que sirve

Cuando un proveedor de servicios IT (MSP) incorpora un nuevo cliente, necesita documentar toda su infraestructura existente: redes, servidores, backups, correo, seguridad, etc. Esta app guia al tecnico a traves de un formulario completo y estructurado, y genera un informe PDF al finalizar.

## Secciones de auditoria

La app cubre 15 areas de infraestructura IT:

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
| Armario y SAI | Rack, sala, cableado, alimentacion, SAI y su autonomia |
| Almacenamiento | NAS, cloud, permisos, sincronizacion |
| Telefonia | VoIP, centralita, extensiones, moviles |
| Impresion | Impresoras, IPs, consumibles, mantenimiento |
| Aplicaciones de negocio | ERP, CRM, soporte, alojamiento |
| Servicios contratados | Licencias, dominios, hosting, SSL, cloud y contratos: producto, renovacion, coste, partner |
| Otros dispositivos | TPV, control de acceso/presencia, camaras, IoT, perifericos |

Ademas hay una seccion final de **Datos adicionales** con notas libres y capturas
que no encajan en ninguna de las anteriores.

## Funcionalidades

- Formularios dinamicos con campos condicionales
- Multiples instancias por seccion (ej: varios servidores)
- Capturas de pantalla por seccion (explorador, portapapeles)
- Barra de progreso por secciones completadas
- Guardado en la nube con base de datos
- Historial de versiones (restaurar cualquier estado anterior)
- Exportar/importar archivos `.alanait` como backup
- **CiberScore**: nota 0-100 sobre 8 dominios ponderados, calculada en vivo
  mientras se rellena (`src/score/`). Solo se publica como fiable cuando hay
  evidencia suficiente detras.
- **Avisos de buenas practicas** contextuales segun lo que se va contestando
  (`src/hints.js`), marcables como Hecho / Pendiente / N/A.
- Exportar informe a PDF, con **parte ejecutiva interna**: diagnostico por
  dominios, hallazgos criticos, preguntas criticas sin contestar, plan de accion
  y oportunidades comerciales. El PDF lleva **texto seleccionable y buscable**
  (una capa de texto invisible sobre cada pagina, como un PDF con OCR, pero con
  el texto exacto). Es de uso interno: no se entrega al cliente.
- **Cuestionario para el cliente** (boton 📨): el cliente adelanta su inventario
  en un fichero que rellena sin cuenta y el tecnico revisa cada dato antes de
  aplicarlo (ver abajo).
- Sirve para onboarding y para **mantenimientos**: los campos de quien gestiona,
  controla o es titular admiten ALANA IT.
- Login con email y contrasena; el alta de cuentas solo admite `@alanait.com`,
  tambien en el servidor (`supabase-restringir-alta.sql`)
- Registro de auditoria de quien abre, modifica, borra o exporta cada ficha
  (`supabase-auditoria.sql`)
- Dashboard con listado y busqueda de clientes

## Cuestionario para el cliente

Para que el cliente adelante su inventario antes de la visita (`src/cliente/`):

1. En la ficha, boton 📨 → **Descargar cuestionario**: un `.html` con lo que ya se
   sabe de ese cliente. Se le envia por correo; si su correo bloquea los `.html`,
   comprimido en `.zip` o por OneDrive.
2. El cliente lo abre en cualquier navegador, sin cuenta ni internet, completa lo
   que sepa y pulsa **Descargar respuestas**: devuelve un `.json`.
3. Boton 📨 → **Cargar lo que ha contestado**: cada dato aparece junto al de la
   ficha. Lo que rellena un hueco viene marcado; lo que cambia algo ya escrito lo
   decide el tecnico. Sus comentarios van a las notas de la seccion. La app nunca
   borra nada por lo que diga el cliente.

Solo pregunta inventario (contratos, equipos, impresoras, aplicaciones, servicios
contratados...). Nunca lo que puntua, ni ensena la nota o los avisos: una prueba
del build lo comprueba campo a campo contra el motor. Detalle en
`.claude/handoff/DECISIONS.md` D29.

## Para desarrollar

Antes de tocar el motor de puntuacion o el informe, leer `CLAUDE.md` y
`.claude/handoff/`: ahi estan las decisiones de modelo, los agujeros conocidos y
los experimentos que ya se probaron y no funcionaron.

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
