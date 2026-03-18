# ALANA IT Onboarding Técnico

Herramienta web para realizar auditorías técnicas de onboarding a nuevos clientes IT. Permite recopilar de forma estructurada toda la información sobre la infraestructura tecnológica de una empresa durante la primera visita.

## Para qué sirve

Cuando un proveedor de servicios IT (MSP) incorpora un nuevo cliente, necesita documentar toda su infraestructura existente: redes, servidores, backups, correo, seguridad, etc. Esta app guía al técnico a través de un formulario completo y estructurado, y genera un informe PDF al finalizar.

## Secciones de auditoría

La app cubre 13 áreas de infraestructura IT:

| Sección | Qué se documenta |
|---|---|
| Red | ISP, routers, firewalls, switches, VLANs, IPs |
| Servidores | Hostname, SO, roles, RAM, almacenamiento, AD |
| Ordenadores / PCs | Cantidad, SO, dominio, MDM, antigüedad |
| Backup | Software, destino, frecuencia, retención, pruebas |
| Correo Electrónico | Proveedor, dominio, buzones, MFA, antispam |
| Antivirus / EDR | Solución, consola, licencias, cobertura |
| WiFi | SSIDs, APs, controlador, cobertura |
| VPN | Tipo, solución, usuarios, MFA |
| SAI / UPS | Marca, autonomía, equipos protegidos |
| Almacenamiento | NAS, cloud, permisos, sincronización |
| Telefonía | VoIP, centralita, extensiones, móviles |
| Impresión | Impresoras, IPs, consumibles, mantenimiento |
| Aplicaciones / ERP | ERP, CRM, licencias, soporte, alojamiento |

## Funcionalidades

- Formularios dinámicos con campos condicionales
- Múltiples instancias por sección (ej: varios servidores)
- Capturas de pantalla por sección (explorador, portapapeles)
- Barra de progreso por secciones completadas
- Guardar y cargar proyectos como archivos `.alanait`
- Historial de proyectos recientes
- Exportar informe a PDF desde el navegador
- Datos del cliente (empresa, sector, contacto, etc.)

## Requisitos

- [Node.js](https://nodejs.org) (versión LTS)

## Desarrollo

```
npm install
npm run dev
```

Se abre en http://localhost:3000

## Compilar para producción

```
npm run build
```

Los archivos se generan en `build/`. Se pueden servir con cualquier servidor web estático (Nginx, Apache, Vercel, Netlify, etc.).

## Stack

- React 18
- Vite
- Sin dependencias externas adicionales (UI 100% custom)
