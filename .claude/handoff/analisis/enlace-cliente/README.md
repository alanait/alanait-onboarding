# Enlace para que un externo rellene la ficha — diseño (02/10/2026)

El dueño preguntó: «¿no podemos hacer más fácil que se genere un enlace para que un
externo pueda acceder a rellenarlo?». Lo analizó un workflow de 10 agentes: tres vías
diseñadas por separado (portal propio, Excel por Microsoft 365, formulario externo
tipo Tally/Forms), cada una atacada por un revisor de seguridad/RGPD y otro de
esfuerzo real, y un juez final.

**No está implementado ni aprobado.** Esto es el diseño, guardado aquí porque la
carpeta temporal de la sesión se pierde.

| Fichero | Qué es |
|---|---|
| `diseno-recomendado.md` | La síntesis del juez: recomendación (portal propio), cómo funcionaría para técnico y externo, qué tiene que hacer el dueño antes, plan fichero a fichero, esfuerzo (7–8 días) y por qué no las otras vías. Las rutas a `scratchpad\...` que cita ya no existen. |
| `borrador-supabase-portal-enlace.sql` | Borrador del SQL, **SIN EJECUTAR** y con correcciones pendientes que lista el plan (paso 5 de `diseno-recomendado.md`). No ejecutarlo tal cual. |
| `perfil.mjs` | Los 52 campos candidatos a preguntarse al externo, por tipo. |
| `lista-blanca.mjs` | Qué parte de ese «inventario» no es inerte: señales de contradicción y disparadores de avisos. |
| `barrido-inercia.mjs` | Prototipo del guardarraíl: barre todos los valores de cada campo candidato sobre el cliente perfecto y las 5 fichas, y exige que `computeScore` no cambie. |

Se ejecutan desde la raíz del repositorio, por ejemplo
`node .claude/handoff/analisis/enlace-cliente/barrido-inercia.mjs`. La ruta al
repositorio se deriva de la posición del fichero.

**Lo que salió de aquí y ya está aplicado aparte:** el agujero de la vista
`v_actividad_ficha` en `supabase-auditoria.sql` (KNOWN_ISSUES AS8, PR #22) y la
corrección de AS1, que daba el alta por cerrada sin comprobarlo.

**Mediciones contra producción que hicieron los agentes**, solo lectura y con la clave
pública que ya va en la web: `GET /auth/v1/settings` (`disable_signup:false`,
`anonymous_users:false`), las tablas `clients`, `client_versions` y `client_images`
devuelven `[]` a un anónimo, y `audit_log` no existe todavía (PGRST205).
