# Clientes de ejemplo

Cinco onboardings completos que cubren el rango del CiberScore. Se importan
desde el panel de clientes con **Importar .alanait**.

No son datos aleatorios: cada uno es un perfil de pyme reconocible, con una
infraestructura coherente consigo misma. Sirven para tres cosas — calibrar el
modelo de puntuación, enseñar la herramienta sin exponer datos de un cliente
real, y como banco de pruebas cuando se toquen los criterios.

| Archivo | Cliente | Nota | Tramo |
|---|---|---:|---|
| `01-bien-protegido` | Garrigues Assessors · asesoría, 18 empleados | 99 | Riesgo bajo |
| `02-medio-alto` | Tècnics Vallès · ingeniería, 32 empleados | 78 | Riesgo medio |
| `03-medio` | Distribucions Bages · distribución, 45 empleados | 53 | Riesgo alto |
| `04-medio-bajo` | Mecanitzats Serra · taller, 24 empleados | 32 | Riesgo crítico |
| `05-riesgo-critico` | Construccions Pla i Fills · obra, 12 empleados | 6 | Riesgo crítico |

## Qué representa cada uno

**01 · Bien protegido.** Venía de un MSP competente. M365 Business Premium con
MFA y acceso condicional, Veeam con copias inmutables y restauraciones probadas,
FortiGate en soporte, EDR con SOC, todo saneado. No llega a 100 a propósito:
DMARC en cuarentena en vez de rechazo, WiFi en WPA2-PSK y firmware del SAI
pendiente. En una auditoría de verdad nadie sale perfecto.

**02 · Medio alto.** Se lleva sola razonablemente bien, pero sin MFA en las
cuentas de administrador —que capa el dominio de identidad a 40—, sin pruebas
de restauración, con parte del parque aún en Windows 10 y el firewall
gestionado por el proveedor saliente.

**03 · Medio.** Venía de un informático autónomo. El saneamiento está a medias:
revocados los accesos del router y los servidores, pendientes los del WiFi y la
consola de backup. Copias solo locales sin inmutabilidad, antivirus básico en
vez de EDR y la consola todavía en manos del anterior.

**04 · Medio bajo.** Descuidado pero no en ruinas. Servidor en soporte con
parches pendientes, copias a disco externo y cloud que nadie comprueba, sin
gestión de parcheo, todos los usuarios administradores locales y la misma
contraseña de administrador en todos los equipos.

**05 · Riesgo crítico.** Llega tras romper con su informático. **Sin copias de
seguridad** —lo que por sí solo capa la nota global a 59—, Windows Server
2012 R2 sin parches desde 2023, RDP publicado a internet, RAID degradado, sin
firewall dedicado y todos los accesos del anterior todavía dentro.

## Puntuarlos sin abrir la aplicación

```bash
npm run escenarios      # escenarios sintéticos del motor
node scripts/puntuar-ejemplos.mjs   # estos cinco clientes, con desglose
```

## Al cambiar los criterios

Si se tocan pesos, mapas o caps en `src/score/criterios.js`, estas notas
cambiarán. Es lo esperable — pero conviene volver a puntuarlos y comprobar que
el orden relativo se mantiene: el cliente bien protegido debe seguir por encima
del medio, y el que no tiene copias debe seguir capado. Si eso se rompe, el
cambio de criterios tiene un efecto que no se había previsto.

## Nombres en el panel

Al cargarlos, cada cliente aparece con su nota en el nombre —por ejemplo
`Construccions Pla i Fills SL - Ex. Ciberscore 6/100`— para distinguirlos de
los clientes reales de un vistazo.

La etiqueta se calcula, no se escribe a mano. Si se tocan los criterios y las
notas cambian, basta con volver a ejecutar:

```bash
node scripts/etiquetar-ejemplos.mjs
```

Eso reetiqueta los cinco y republica los que sirve la aplicacion en
`public/ejemplos/`.
