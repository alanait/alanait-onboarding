# ALANA IT Onboarding Tecnico - Base de Conocimiento (KB)

> Ultima actualizacion: Marzo 2026

---

## 1. Que es ALANA IT Onboarding Tecnico

ALANA IT Onboarding Tecnico es una herramienta web interna desarrollada para que los tecnicos de ALANA IT puedan documentar de forma estructurada las auditorias de infraestructura IT de los clientes.

La aplicacion permite registrar informacion detallada en **13 secciones de infraestructura**, capturar imagenes, guardar en la nube, exportar informes PDF y mantener un historial de versiones de cada cliente.

### Secciones de infraestructura

| # | Seccion | Descripcion |
|---|---------|-------------|
| 1 | Red | Routers, switches, firewall, ISP, VLANs |
| 2 | Servidores | Fisicos, virtuales, cloud, roles, SO |
| 3 | Ordenadores / PCs | Equipos de trabajo, dominio, gestion |
| 4 | Backup | Software, destino, frecuencia, retencion |
| 5 | Email | Plataforma de correo, dominio, seguridad |
| 6 | Antivirus | Solucion de seguridad, consola central |
| 7 | WiFi | Puntos de acceso, SSID, gestion |
| 8 | VPN | Tipo, usuarios, proveedor |
| 9 | SAI / UPS | Proteccion electrica |
| 10 | Almacenamiento | NAS, SAN, almacenamiento compartido |
| 11 | Telefonia | Centralita, VoIP, lineas |
| 12 | Impresion | Impresoras, multifuncionales, gestion |
| 13 | ERP / Aplicaciones | Software de negocio, licencias |

Cada seccion soporta:
- Multiples instancias (ej: 3 servidores distintos)
- Diversos tipos de campos: texto, seleccion, radio, checkboxes, IP, CIDR
- Captura de imagenes (pegar desde portapapeles o arrastrar)
- Notas adicionales

---

## 2. Acceso a la aplicacion

### URL de produccion

La aplicacion esta desplegada en Vercel:

**https://alanait-onboarding.vercel.app**

(La URL exacta puede variar si se reconfigura el dominio en Vercel.)

### Registro de usuario

1. Ir a la URL de la aplicacion
2. Pulsar **"Registrate"**
3. Introducir un email con dominio **@alanait.com** (obligatorio)
4. Establecer una contrasena (minimo 6 caracteres)
5. Revisar el correo y confirmar el email mediante el enlace recibido
6. Una vez confirmado, iniciar sesion con email y contrasena

> **Nota:** Solo se permiten emails con dominio @alanait.com. Si no recibes el email de confirmacion, revisa la carpeta de spam.

### Inicio de sesion

1. Ir a la URL de la aplicacion
2. Introducir email y contrasena
3. Pulsar **"Iniciar Sesion"**

---

## 3. Guia de uso

### 3.1 Dashboard (Panel principal)

Al iniciar sesion se accede al Dashboard, que muestra:
- Lista de todos los clientes registrados
- Barra de busqueda para filtrar clientes
- Boton **"Nuevo Cliente"** para crear uno
- Boton para **importar** archivos `.alanait` (formato de backup)

### 3.2 Crear un nuevo cliente

1. Desde el Dashboard, pulsar **"Nuevo Cliente"**
2. Rellenar los datos generales: empresa, sector, trabajadores, sedes, contacto, etc.
3. Activar las secciones de infraestructura que apliquen al cliente
4. Rellenar los campos de cada seccion activada

### 3.3 Rellenar secciones

- **Activar/desactivar**: Cada seccion se activa con un toggle. Solo las secciones activas se incluyen en el informe.
- **Multiples instancias**: En secciones como Servidores o Red, se pueden anadir multiples instancias (ej: "Servidor 1", "Servidor 2").
- **Tipos de campo**:
  - Texto libre y areas de texto para descripciones
  - Selectores desplegables para opciones predefinidas
  - Radio buttons para si/no o opciones exclusivas
  - Checkboxes para seleccion multiple (ej: roles de servidor)
  - Campos IP para direcciones de red
  - Campos CIDR para rangos de red
- **Campos condicionales**: Algunos campos solo aparecen si se selecciona una opcion determinada (ej: el campo "Marca/Modelo Firewall" solo aparece si se indica que SI hay firewall).

### 3.4 Captura de imagenes

Cada seccion permite adjuntar imagenes:
- **Pegar desde portapapeles**: Hacer captura de pantalla y pegar (Ctrl+V) en la zona de imagen
- **Arrastrar y soltar**: Arrastrar un archivo de imagen sobre la zona

Las imagenes se almacenan en Supabase Storage (bucket `client-images`).

### 3.5 Guardar datos

- Los datos se guardan en la nube (Supabase) al pulsar el boton de guardar
- Cada guardado crea automaticamente una **version** en el historial
- No es necesario exportar archivos locales (aunque se puede hacer como backup)

### 3.6 Historial de versiones

- Accesible desde el editor de cada cliente
- Muestra todas las versiones anteriores con fecha y nota de cambio
- Permite **restaurar** cualquier version anterior
- Util para deshacer cambios no deseados o comparar estados

### 3.7 Exportar PDF

- Desde el editor del cliente, pulsar el boton de **exportar PDF**
- Se genera un informe imprimible con toda la informacion del cliente
- Incluye solo las secciones activadas
- Util para entregar al cliente o archivar

### 3.8 Exportar/Importar archivos .alanait

- **Exportar**: Genera un archivo `.alanait` con todos los datos del cliente (formato JSON). Sirve como backup local.
- **Importar**: Desde el Dashboard, se puede importar un archivo `.alanait` para restaurar o migrar datos de un cliente.

### 3.9 Barra de progreso

La aplicacion muestra una barra de progreso que indica el porcentaje de campos completados en las secciones activas. Ayuda a verificar que no queden campos sin rellenar.

---

## 4. Arquitectura tecnica

### Stack tecnologico

| Componente | Tecnologia |
|------------|-----------|
| Frontend | React 18 + Vite 5 |
| Base de datos | Supabase (PostgreSQL) |
| Almacenamiento de imagenes | Supabase Storage |
| Autenticacion | Supabase Auth |
| Hosting | Vercel (auto-deploy desde GitHub) |

### Estructura del proyecto

```
C:\AlanaitOnboardingApp\
  src/
    App.jsx                    # Componente principal (vista de editor)
    components/
      Dashboard.jsx            # Panel de clientes / dashboard
      LoginPage.jsx            # Pagina de autenticacion
      VersionHistory.jsx       # Modal de historial de versiones
    lib/
      supabase.js              # Cliente de Supabase (configuracion)
      auth.js                  # Funciones de autenticacion
      clientService.js         # Operaciones CRUD de clientes
  supabase-setup.sql           # Script de creacion de la base de datos
  vercel.json                  # Configuracion de despliegue en Vercel
  package.json                 # Dependencias y scripts
  .env.local                   # Variables de entorno (NO se sube a Git)
```

### Flujo de datos

1. El usuario inicia sesion mediante Supabase Auth
2. El Dashboard carga la lista de clientes desde la tabla `clients`
3. Al abrir un cliente, se cargan los datos (JSONB) y las imagenes asociadas
4. Al guardar, se actualiza el registro en `clients` y se crea una entrada en `client_versions`
5. Las imagenes se suben a Supabase Storage y se registran en `client_images`

---

## 5. Base de datos

### Tabla `clients`

Almacena los datos de cada cliente.

| Columna | Tipo | Descripcion |
|---------|------|-------------|
| id | UUID | Clave primaria, generada automaticamente |
| empresa | TEXT | Nombre de la empresa |
| sector | TEXT | Sector de actividad |
| trabajadores | TEXT | Numero de trabajadores |
| sedes | TEXT | Numero de sedes |
| contacto | TEXT | Persona de contacto |
| telefono | TEXT | Telefono |
| email | TEXT | Email de contacto |
| web | TEXT | Sitio web |
| direccion | TEXT | Direccion |
| fecha | TEXT | Fecha de la auditoria |
| responsable | TEXT | Tecnico responsable |
| section_enabled | JSONB | Secciones activadas (true/false por seccion) |
| form_data | JSONB | Todos los datos del formulario |
| instance_counts | JSONB | Numero de instancias por seccion |
| created_at | TIMESTAMPTZ | Fecha de creacion |
| updated_at | TIMESTAMPTZ | Fecha de ultima modificacion (auto) |

### Tabla `client_versions`

Historial de versiones de cada cliente.

| Columna | Tipo | Descripcion |
|---------|------|-------------|
| id | UUID | Clave primaria |
| client_id | UUID | FK a `clients` |
| version | INTEGER | Numero de version |
| snapshot | JSONB | Snapshot completo del estado del cliente |
| changed_by | TEXT | Usuario que realizo el cambio |
| change_note | TEXT | Nota del cambio |
| created_at | TIMESTAMPTZ | Fecha de la version |

### Tabla `client_images`

Referencias a imagenes almacenadas en Supabase Storage.

| Columna | Tipo | Descripcion |
|---------|------|-------------|
| id | UUID | Clave primaria |
| client_id | UUID | FK a `clients` |
| section_id | TEXT | Seccion a la que pertenece la imagen |
| storage_path | TEXT | Ruta en Supabase Storage |
| caption | TEXT | Descripcion de la imagen |
| file_name | TEXT | Nombre del archivo |
| sort_order | INTEGER | Orden de visualizacion |
| created_at | TIMESTAMPTZ | Fecha de subida |

### Seguridad (RLS)

Las tablas tienen Row Level Security habilitado con politicas permisivas (acceso total para usuarios autenticados). Esto es adecuado al ser una herramienta interna.

### Storage

Las imagenes se almacenan en el bucket `client-images` de Supabase Storage, configurado como publico para poder mostrar las imagenes en la aplicacion.

---

## 6. Desarrollo local

### Requisitos previos

- Node.js (version 18 o superior recomendada)
- npm
- Git
- Acceso al repositorio de GitHub

### Pasos

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/alanait/alanait-onboarding.git
   cd alanait-onboarding
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**:
   Crear un archivo `.env.local` en la raiz del proyecto con:
   ```
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...tu-anon-key...
   ```
   Pedir las credenciales al administrador del proyecto Supabase si no las tienes.

4. **Iniciar el servidor de desarrollo**:
   ```bash
   npm run dev
   ```
   La aplicacion se abrira en `http://localhost:3000` (o el puerto que indique Vite).

### Scripts disponibles

| Comando | Descripcion |
|---------|-------------|
| `npm run dev` | Inicia el servidor de desarrollo (Vite) |
| `npm run build` | Genera la build de produccion en `/build` |
| `npm run preview` | Previsualiza la build de produccion |

---

## 7. Despliegue

### Despliegue automatico (Vercel)

La aplicacion esta conectada a Vercel con **auto-deploy** desde la rama `main` del repositorio de GitHub.

**Flujo de despliegue:**
1. Hacer cambios en el codigo
2. Commit y push a la rama `main`
3. Vercel detecta el push y despliega automaticamente
4. La nueva version esta disponible en la URL de produccion en pocos minutos

### Configuracion de Vercel

El archivo `vercel.json` define:
- Framework: Vite
- Comando de build: `npm run build`
- Directorio de salida: `build`

### Variables de entorno en Vercel

Las siguientes variables deben estar configuradas en el dashboard de Vercel (Settings > Environment Variables):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

> **Importante:** Si se cambian las credenciales de Supabase, hay que actualizar las variables tanto en `.env.local` (local) como en Vercel (produccion) y redesplegar.

---

## 8. Repositorios y servicios

| Servicio | URL / Ubicacion |
|----------|----------------|
| Repositorio GitHub | https://github.com/alanait/alanait-onboarding |
| App en produccion | URL de Vercel (ver Dashboard de Vercel) |
| Supabase Dashboard | https://supabase.com/dashboard (proyecto "ALANA IT Onboarding") |
| Vercel Dashboard | https://vercel.com (proyecto alanait-onboarding) |

---

## 9. Resolucion de problemas

### No puedo registrarme

- **Verificar el dominio del email**: Solo se permiten emails @alanait.com
- **No llega el email de confirmacion**: Revisar carpeta de spam/correo no deseado. El email viene de Supabase (noreply@mail.app.supabase.io o similar).
- **Contrasena rechazada**: La contrasena debe tener un minimo de 6 caracteres.

### No puedo iniciar sesion

- **Email no confirmado**: Verificar que se haya confirmado el email mediante el enlace recibido.
- **Contrasena olvidada**: Actualmente no hay flujo de reseteo de contrasena implementado. Contactar al administrador.
- **Error de conexion**: Verificar que la URL de la app es correcta y que hay conexion a Internet.

### Los datos no se guardan

- **Verificar conexion a Internet**: La aplicacion requiere conexion para guardar en Supabase.
- **Verificar la consola del navegador** (F12 > Console): Buscar errores relacionados con Supabase o permisos.
- **Variables de entorno incorrectas**: Si la app se ejecuta en local, comprobar que `.env.local` tiene las credenciales correctas.

### Las imagenes no se cargan

- **Verificar que el bucket `client-images` existe** en Supabase Storage y esta configurado como publico.
- **Tamano del archivo**: Archivos muy grandes pueden fallar. Intentar con imagenes mas pequenas.
- **Formato**: Se aceptan formatos comunes de imagen (PNG, JPG, GIF).

### La app no compila / errores al hacer npm run dev

- **Ejecutar `npm install`** para asegurarse de que todas las dependencias estan instaladas.
- **Verificar la version de Node.js**: Se recomienda Node 18 o superior.
- **Borrar node_modules y reinstalar**: `rm -rf node_modules && npm install`
- **Verificar `.env.local`**: Debe existir y tener las variables correctas.

### El despliegue en Vercel falla

- **Revisar los logs de build** en el dashboard de Vercel.
- **Verificar que las variables de entorno estan configuradas** en Vercel.
- **Comprobar que la rama `main` tiene codigo funcional**: Hacer `npm run build` en local antes de hacer push.

### Quiero restaurar una version anterior de un cliente

1. Abrir el cliente en el editor
2. Acceder al historial de versiones
3. Seleccionar la version deseada
4. Pulsar restaurar
5. Los datos del cliente se reemplazaran con los de la version seleccionada

---

## 10. Contacto y soporte

Para dudas, problemas o sugerencias sobre la herramienta, contactar con el equipo de desarrollo de ALANA IT.
