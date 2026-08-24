// Pruebas del borrador local, sin navegador.
//
// El borrador es una red de seguridad contra la perdida de la visita entera,
// asi que lo que hay que fijar no es que guarde: es que NO MIENTA cuando no
// puede guardarlo todo. Un borrador que dice haber salvado unas capturas que
// dejo fuera es peor que no tener borrador, porque el tecnico se entera al
// imprimir el informe, dias despues y delante del cliente.
//
//   node scripts/test-borrador.mjs

import {
  guardarBorrador, leerBorrador, borrarBorrador, construirBorrador,
  borradorTieneContenido, haceCuanto, CLAVE_BORRADOR, VERSION_BORRADOR,
} from "../src/lib/borrador.js";

let ok = 0, fallos = 0;
const es = (etiqueta, real, esperado) => {
  const bien = JSON.stringify(real) === JSON.stringify(esperado);
  console.log(`  ${bien ? "ok  " : "FALLO"} ${etiqueta}${bien ? "" : `  esperaba ${JSON.stringify(esperado)}, dio ${JSON.stringify(real)}`}`);
  bien ? ok++ : fallos++;
};

/**
 * localStorage de mentira con cupo, porque el cupo es justo lo que hay que
 * probar. `cupo: Infinity` para el caso normal.
 */
function almacenFalso(cupo = Infinity) {
  const datos = new Map();
  return {
    datos,
    getItem: (k) => (datos.has(k) ? datos.get(k) : null),
    removeItem: (k) => datos.delete(k),
    setItem: (k, v) => {
      if (v.length > cupo) {
        const err = new Error("quota");
        err.name = "QuotaExceededError";
        throw err;
      }
      datos.set(k, v);
    },
  };
}

const AHORA = "2026-08-24T10:00:00.000Z";

const visita = (extra = {}) => ({
  clientData: { empresa: "Talleres Prueba SL", fecha: "2026-08-24", contacto: "Ana" },
  sectionEnabled: { backup: "si", red: "si" },
  formData: { backup: { 0: { frecuencia: "Diaria" } } },
  instanceCounts: { servidores: 2 },
  sectionImages: {},
  currentClientId: "c-123",
  currentFilePath: "Talleres_Prueba_SL",
  ...extra,
});

// Una captura incrustada ocupa; una ya subida a la nube es solo una URL corta.
const incrustada = (n) => ({ src: "data:image/png;base64," + "A".repeat(n), caption: "rack", name: "rack.png" });
const enLaNube = () => ({ src: "https://sb.example/firmada?token=abc", caption: "firewall", name: "fw.png", _storagePath: "c-123/red/1.png" });

console.log("\nBORRADOR LOCAL\n");

// ── Ida y vuelta ────────────────────────────────────────────────────────────
{
  const s = almacenFalso();
  const r = guardarBorrador(visita(), AHORA, s);
  es("guarda sin omitir nada", [r.guardado, r.capturasOmitidas], [true, 0]);

  const b = leerBorrador(s);
  es("recupera la ficha entera", b.formData, { backup: { 0: { frecuencia: "Diaria" } } });
  es("recupera el contador de instancias", b.instanceCounts, { servidores: 2 });
  // Sin el id, recuperar y guardar crearia un cliente DUPLICADO en Supabase en
  // vez de actualizar el que ya existe.
  es("conserva el id del cliente en la nube", b.clienteId, "c-123");
  es("conserva el nombre para poder ofrecerlo", b.empresa, "Talleres Prueba SL");
  es("sella la version del formato", b.version, VERSION_BORRADOR);

  borrarBorrador(s);
  es("borrarlo lo deja sin nada que ofrecer", leerBorrador(s), null);
}

// ── Lo que no cabe ──────────────────────────────────────────────────────────
{
  // Cupo que admite el formulario pero no dos capturas incrustadas.
  const s = almacenFalso(3000);
  const r = guardarBorrador(visita({ sectionImages: { red: [incrustada(4000), enLaNube()] } }), AHORA, s);

  es("guarda aunque no quepan las capturas", r.guardado, true);
  es("y CUENTA la que dejo fuera", r.capturasOmitidas, 1);

  const b = leerBorrador(s);
  es("la que ya estaba en la nube sobrevive", b.sectionImages.red.length, 1);
  es("y es la de la URL, no la incrustada", b.sectionImages.red[0].name, "fw.png");
  es("el numero de omitidas queda escrito en el borrador", b.capturasOmitidas, 1);
  // Lo que de verdad importa: el formulario NO se pierde por una foto.
  es("el formulario se salva entero", b.formData, { backup: { 0: { frecuencia: "Diaria" } } });
}

{
  // Cupo tan corto que ni con las URLs cabe: hay que soltar todas las capturas.
  // El cupo se CALCULA en vez de fijarlo a ojo: un numero magico aqui deja de
  // probar lo que dice en cuanto cambie un campo del borrador.
  const conFotos = visita({ sectionImages: { red: [incrustada(4000), enLaNube()] } });
  const sinNinguna = JSON.stringify(construirBorrador({ ...conFotos, sectionImages: {} }, AHORA)).length;
  const s = almacenFalso(sinNinguna + 10);
  const r = guardarBorrador(conFotos, AHORA, s);
  es("con cupo minimo suelta todas las capturas", [r.guardado, r.capturasOmitidas], [true, 2]);
  es("pero sigue salvando el formulario", leerBorrador(s).sectionEnabled, { backup: "si", red: "si" });
}

{
  // Ni aligerando cabe: hay que reconocerlo, no fingir que se guardo.
  const s = almacenFalso(10);
  const r = guardarBorrador(visita(), AHORA, s);
  es("si no cabe de ninguna manera, lo dice", r.guardado, false);
  es("y no deja un borrador a medias", leerBorrador(s), null);
}

{
  // Un fallo que NO es de cupo (modo privado, permisos) no se arregla quitando
  // fotos: reintentar aligerando solo perderia capturas sin motivo.
  const s = almacenFalso();
  s.setItem = () => { throw new Error("acceso denegado"); };
  const r = guardarBorrador(visita({ sectionImages: { red: [incrustada(10)] } }), AHORA, s);
  es("un fallo que no es de cupo no sacrifica capturas", [r.guardado, r.capturasOmitidas], [false, 0]);
}

// ── Borradores que no se deben interpretar ──────────────────────────────────
{
  const s = almacenFalso();
  s.setItem(CLAVE_BORRADOR, JSON.stringify({ ...construirBorrador(visita(), AHORA), version: 999 }));
  // Recuperar mal una visita es peor que no recuperarla: el tecnico da por
  // bueno lo que ve en pantalla.
  es("un borrador de otra version se descarta", leerBorrador(s), null);
}
{
  const s = almacenFalso();
  s.setItem(CLAVE_BORRADOR, "{esto no es json");
  es("un borrador corrupto no revienta la app", leerBorrador(s), null);
}
{
  es("sin almacenamiento no se cae", leerBorrador(null), null);
}

// ── Cuando merece la pena ofrecerlo ─────────────────────────────────────────
{
  // La ficha nace con la fecha de hoy puesta. Ofrecer recuperar ESO ensena al
  // tecnico a decir que no al aviso, y el dia que importe tambien dira que no.
  const recienAbierto = construirBorrador({
    clientData: { empresa: "", fecha: "2026-08-24" }, sectionEnabled: {}, formData: {}, instanceCounts: {}, sectionImages: {},
  }, AHORA);
  es("una ficha recien abierta no se ofrece", borradorTieneContenido(recienAbierto), false);

  const conNombre = construirBorrador({ clientData: { empresa: "Talleres Prueba SL", fecha: "2026-08-24" } }, AHORA);
  es("con el nombre puesto ya hay trabajo que salvar", borradorTieneContenido(conNombre), true);

  const conSeccion = construirBorrador({ clientData: { fecha: "2026-08-24" }, sectionEnabled: { backup: "no" } }, AHORA);
  es("declarar una seccion tambien es trabajo", borradorTieneContenido(conSeccion), true);

  es("sin borrador no hay nada que ofrecer", borradorTieneContenido(null), false);
}

// ── El "hace cuanto" del aviso ──────────────────────────────────────────────
{
  const t = (min) => haceCuanto(AHORA, new Date(Date.parse(AHORA) + min * 60000).toISOString());
  es("segundos", t(0), "hace unos segundos");
  es("un minuto en singular", t(1), "hace 1 minuto");
  es("minutos en plural", t(14), "hace 14 minutos");
  es("una hora en singular", t(60), "hace 1 hora");
  es("horas en plural", t(300), "hace 5 horas");
  es("un dia en singular", t(60 * 24), "hace 1 día");
  es("dias en plural", t(60 * 24 * 3), "hace 3 días");
  es("una fecha ilegible no imprime basura", haceCuanto("no-es-fecha", AHORA), "");
}

console.log(`\n${ok} correctas, ${fallos} fallos\n`);
process.exit(fallos ? 1 : 0);
