// Pruebas del motor del CiberScore. Sin dependencias: node scripts/test-score.mjs
//
// No comprueban que el modelo sea "justo" (eso es criterio de auditor), sino
// que el motor respeta sus tres reglas: la ignorancia no puntua, los caps no se
// pueden maquillar, y en multi-instancia manda quien diga la agregacion.

import { computeScore } from "../src/score/computeScore.js";
// El grueso de las pruebas usa modelos sinteticos para aislar el motor. El
// bloque de deduccion del soporte necesita el modelo REAL: depende de ids
// concretos y de la tabla de fin de soporte.
import { CRITERIOS, PRECONDICIONES, CAMPOS_QUE_PUNTUAN } from "../src/score/criterios.js";

let ok = 0, fallos = 0;
const es = (etiqueta, real, esperado) => {
  const bien = JSON.stringify(real) === JSON.stringify(esperado);
  console.log(`  ${bien ? "ok  " : "FALLO"} ${etiqueta}${bien ? "" : `  esperaba ${JSON.stringify(esperado)}, dio ${JSON.stringify(real)}`}`);
  bien ? ok++ : fallos++;
};

const CRIT = [
  { id: "rdp", dominio: "perimetro", seccion: "red", campo: "rdp_expuesto", peso: 3,
    mapa: { "No": 1, "Sí": 0, "No revisado": 0 }, agregacion: "min",
    critico: { cuando: ["Sí"], capDominio: 30 }, porQue: "RDP publicado a internet" },
  { id: "utm", dominio: "perimetro", seccion: "red", campo: "utm", peso: 2,
    mapa: { "Sí": 1, "No": 0 }, agregacion: "max", porQue: "sin filtrado web" },
  { id: "so", dominio: "endpoint", seccion: "servidores", campo: "so_soporte", peso: 3,
    mapa: { "En soporte": 1, "Fuera de soporte (EOL)": 0 }, agregacion: "min", porQue: "SO sin parches" },
  { id: "fwsop", dominio: "perimetro", seccion: "red", campo: "firewall_soporte", peso: 2,
    dep: { field: "firewall", value: "Sí" },
    mapa: { "En soporte": 1, "Fuera de soporte (EOL)": 0 }, agregacion: "min", porQue: "firewall EOL" },
];
const PREC = [{ id: "sin_backup", seccion: "backup", cuando: "no", dominio: "backup",
  capGlobal: 59, texto: "El cliente no tiene copias de seguridad" }];

const r = (sectionEnabled, formData, instanceCounts) =>
  computeScore({ criterios: CRIT, precondiciones: PREC, sectionEnabled, formData, instanceCounts });
const dom = (res, id) => res.dominios.find(d => d.id === id);

console.log("\nRegla 1 — la ignorancia no puntua");
es("sin nada respondido no hay nota", r({}, {}).nota, null);
es("'No revisado' sale del denominador",
   dom(r({ red: "si" }, { red: { 0: { rdp_expuesto: "No revisado", utm: "Sí" } } }), "perimetro").criteriosEvaluados, 1);
// El titular de este test siempre dijo lo correcto; era la asercion la que
// documentaba el bug. Con el denominador aplicable, rdp sin comprobar pesa 3 y
// vale 0, asi que utm (2 de 5) da 40 y no 100.
es("...y no puntua como bueno",
   dom(r({ red: "si" }, { red: { 0: { rdp_expuesto: "No revisado", utm: "Sí" } } }), "perimetro").nota, 40);
es("campo vacio sale del denominador",
   dom(r({ red: "si" }, { red: { 0: { utm: "Sí" } } }), "perimetro").criteriosEvaluados, 1);
es("literal desconocido no inventa valor",
   dom(r({ red: "si" }, { red: { 0: { rdp_expuesto: "Puede ser" } } }), "perimetro").criteriosEvaluados, 0);
es("seccion sin responder no cuenta", dom(r({}, { red: { 0: { utm: "Sí" } } }), "perimetro").evaluable, false);
es("seccion marcada 'no' no cuenta", dom(r({ red: "no" }, { red: { 0: { utm: "No" } } }), "perimetro").evaluable, false);

console.log("\nRegla 2 — los caps no se maquillan");
const capado = r({ red: "si" }, { red: { 0: { rdp_expuesto: "Sí", utm: "Sí" } } });
es("RDP expuesto capa el dominio a 30", dom(capado, "perimetro").nota, 30);
es("y queda marcado como capado", dom(capado, "perimetro").capado, true);
es("y genera hallazgo critico", capado.hallazgos.filter(h => h.gravedad === "critico").length, 1);
const sinbk = r({ red: "si", backup: "no" }, { red: { 0: { rdp_expuesto: "No", utm: "Sí" } } });
es("sin backup capa la nota global a 59", sinbk.nota, 59);
es("y lo senala", sinbk.capadaGlobal, true);

console.log("\nRegla 3 — multi-instancia");
es("min: manda el peor servidor",
   dom(r({ servidores: "si" }, { servidores: { 0: { so_soporte: "En soporte" }, 1: { so_soporte: "Fuera de soporte (EOL)" } } }, { servidores: 2 }), "endpoint").nota, 0);
// rdp se contesta en las dos instancias para aislar lo que este test mide: si
// se deja en blanco, su peso entra en el denominador valiendo 0 y tapa el
// efecto de la agregacion.
es("max: basta una buena",
   dom(r({ red: "si" }, { red: { 0: { utm: "No", rdp_expuesto: "No" }, 1: { utm: "Sí", rdp_expuesto: "No" } } }, { red: 2 }), "perimetro").nota, 100);
const capMulti = r({ red: "si" }, { red: { 0: { rdp_expuesto: "No" }, 1: { rdp_expuesto: "Sí" } } }, { red: 2 });
es("el cap se dispara aunque solo una instancia sea critica",
   capMulti.hallazgos.some(h => h.id === "rdp"), true);
// Un cap es un TECHO, no un suelo: si la agregacion ya da menos, manda ese menos.
es("y si la nota ya es peor que el cap, manda la nota", dom(capMulti, "perimetro").nota, 0);

console.log("\nCondicionales y cobertura");
es("campo con dep no cumplida sale del denominador",
   dom(r({ red: "si" }, { red: { 0: { firewall: "No", firewall_soporte: "Fuera de soporte (EOL)", utm: "Sí" } } }), "perimetro").criteriosEvaluados, 1);
es("con dep cumplida si cuenta",
   dom(r({ red: "si" }, { red: { 0: { firewall: "Sí", firewall_soporte: "En soporte", utm: "Sí" } } }), "perimetro").criteriosEvaluados, 2);
es("un dominio sin datos no arrastra la nota",
   r({ red: "si" }, { red: { 0: { rdp_expuesto: "No", utm: "Sí" } } }).nota, 100);
// La `cobertura` vieja contaba peso de DOMINIOS tocados, y por eso este caso
// daba 18 (el peso entero de perimetro) con un solo criterio contestado de dos.
// La evidencia cuenta peso de CRITERIO: 3 de 5.
es("la evidencia mide peso de criterio, no dominios tocados",
   r({ red: "si" }, { red: { 0: { rdp_expuesto: "No" } } }).evidencia, 60);

console.log("\nDeterminismo");
const a = r({ red: "si" }, { red: { 0: { rdp_expuesto: "No", utm: "Sí" } } });
const b = r({ red: "si" }, { red: { 0: { rdp_expuesto: "No", utm: "Sí" } } });
es("misma entrada, misma salida", JSON.stringify(a), JSON.stringify(b));

console.log("");
console.log("Caps y condicionales (bug encontrado en la revision)");
{
  // firewall_soporte solo existe si firewall = "Sí". Un valor fosil de cuando
  // se contesto que si, con el firewall ahora en "No", no puede capar nada.
  const CR = [
    { id: "fwsop", dominio: "perimetro", seccion: "red", campo: "firewall_soporte", peso: 2,
      dep: { field: "firewall", value: "Sí" },
      mapa: { "En soporte": 1, "Fuera de soporte (EOL)": 0 }, agregacion: "min",
      critico: { cuando: ["Fuera de soporte (EOL)"], capDominio: 59 }, porQue: "firewall EOL" },
    { id: "utm2", dominio: "perimetro", seccion: "red", campo: "utm", peso: 1,
      mapa: { "Sí": 1, "No": 0 }, agregacion: "max", porQue: "sin UTM" },
  ];
  const oculto = computeScore({ criterios: CR, sectionEnabled: { red: "si" },
    formData: { red: { 0: { firewall: "No", firewall_soporte: "Fuera de soporte (EOL)", utm: "Sí" } } } });
  es("un valor fosil oculto no capa el dominio", oculto.dominios.find(d => d.id === "perimetro").nota, 100);
  es("y no genera hallazgo", oculto.hallazgos.length, 0);

  const visible = computeScore({ criterios: CR, sectionEnabled: { red: "si" },
    formData: { red: { 0: { firewall: "Sí", firewall_soporte: "Fuera de soporte (EOL)", utm: "Sí" } } } });
  es("con el campo visible si capa", visible.dominios.find(d => d.id === "perimetro").nota, 33);
  es("y si genera hallazgo", visible.hallazgos.length, 1);
}

console.log("");
console.log("Fiabilidad de la nota (fallos hallados al revisar la fase 4)");
{
  const CR = [
    { id: "mfa", dominio: "identidad", seccion: "email", campo: "mfa", peso: 3,
      mapa: { "Sí": 1, "No": 0 }, agregacion: "min", porQue: "MFA" },
    { id: "rdp2", dominio: "perimetro", seccion: "red", campo: "rdp_expuesto", peso: 3,
      mapa: { "No": 1, "Sí": 0 }, agregacion: "min", porQue: "RDP" },
  ];
  const PR = [{ id: "sin_bk", seccion: "backup", cuando: "no", dominio: "backup",
    capGlobal: 59, exigida: true, texto: "sin copias" }];
  const r2 = (se, fd) => computeScore({ criterios: CR, precondiciones: PR, sectionEnabled: se, formData: fd });

  // Una respuesta suelta daba 100 sobre 100 y "riesgo bajo"
  const suelta = r2({ email: "si" }, { email: { 0: { mfa: "Sí" } } });
  es("una sola respuesta no da nota fiable", suelta.fiable, false);
  es("pero la nota se sigue devolviendo", suelta.nota, 100);

  // Callar sobre el backup puntuaba mejor que reconocer que no hay copias
  const callando = r2({ email: "si", red: "si" }, { email: { 0: { mfa: "Sí" } }, red: { 0: { rdp_expuesto: "No" } } });
  es("seccion exigida sin responder invalida la nota", callando.fiable, false);
  es("y dice cual falta", callando.sinResponder, ["backup"]);

  const declarado = r2({ email: "si", red: "si", backup: "no" }, { email: { 0: { mfa: "Sí" } }, red: { 0: { rdp_expuesto: "No" } } });
  es("reconocer que no hay backup si da nota", declarado.nota !== null, true);
  es("capada a 59", declarado.nota, 59);
}


// ── Regla 1: lo que no se ha comprobado no puntua ───────────────────────
//
// Fijan la semantica que arreglo el caso Kishoa-Powen (backup 100/100 con UN
// criterio contestado de diez) y, sobre todo, cierran las dos trampas que
// aparecieron al disenar el arreglo: las dos subian la nota al esconder
// informacion, que es el bug que este proyecto ya corrigio dos veces.
console.log("\nRegla 1 — lo que no se ha comprobado no puntua");
{
  const soloUno = r({ red: "si" }, { red: { 0: { utm: "Sí" } } });
  const pe = dom(soloUno, "perimetro");
  es("un criterio bueno de dos no da 100", pe.nota, 40);
  es("y el motor publica cuantos lo respaldan", [pe.criteriosEvaluados, pe.criteriosAplicables], [1, 2]);

  // "No aplica" es una afirmacion sobre el CLIENTE; el hueco lo es sobre la
  // VISITA. Solo lo primero sale del denominador.
  const conDep = dom(r({ red: "si" }, { red: { 0: { firewall: "No", utm: "Sí", rdp_expuesto: "No" } } }), "perimetro");
  es("un criterio con dep no cumplida sale del denominador", conDep.criteriosAplicables, 2);
  es("y el dominio llega a 100 sin el", conDep.nota, 100);

  // Declarar la ignorancia y callarla son el mismo estado de conocimiento: si
  // valieran distinto, el tecnico aprenderia a no tocar el desplegable.
  const declarada = dom(r({ red: "si" }, { red: { 0: { utm: "Sí", rdp_expuesto: "No revisado" } } }), "perimetro").nota;
  const callada = dom(r({ red: "si" }, { red: { 0: { utm: "Sí" } } }), "perimetro").nota;
  es("declarar 'No revisado' y dejar en blanco dan la misma nota", declarada, callada);

  // ── La trampa del reparto ──
  // Un dominio activado y vacio NO puede desaparecer: si desapareciera, su peso
  // se repartiria entre los que si tienen datos —los que salieron bien— y
  // borrar respuestas subiria la nota global.
  const vacio = dom(r({ red: "si" }, { red: { 0: {} } }), "perimetro");
  es("un dominio activado y vacio NO sale del reparto", vacio.evaluable, true);
  es("y entra valiendo 0", vacio.nota, 0);

  // Marcar "no" y no tocar la seccion dan la misma nota; lo unico que cambia es
  // que sin decidirla no hay nota publicable. Asi no hay premio por declarar
  // inexistente algo que si existe.
  const sinTocar = r({ red: "si" }, { red: { 0: { utm: "Sí", rdp_expuesto: "No" } } });
  const marcadaNo = r({ red: "si", servidores: "no" }, { red: { 0: { utm: "Sí", rdp_expuesto: "No" } } });
  es("marcar una seccion 'no' da la misma nota que dejarla sin tocar", sinTocar.nota, marcadaNo.nota);
  es("pero sin decidirla la nota no es fiable", sinTocar.fiable, false);

  // Multi-instancia: tres servidores son tres comprobaciones.
  const unoDeTres = dom(r({ servidores: "si" }, { servidores: { 0: { so_soporte: "En soporte" } } }, { servidores: 3 }), "endpoint");
  es("tres servidores con uno contestado no dan evidencia plena", unoDeTres.evidencia, 33);
  // ...salvo que el valor ya no pueda cambiar mirando las demas instancias.
  const resuelto = dom(r({ servidores: "si" }, { servidores: { 0: { so_soporte: "Fuera de soporte (EOL)" } } }, { servidores: 3 }), "endpoint");
  es("...salvo que el valor ya este resuelto (min con un 0)", resuelto.evidencia, 100);

  // Un capador que aplicaba y nadie comprobo no toca la nota, pero se publica:
  // el informe no puede decir "sin hallazgos criticos" por encima de el.
  const pend = r({ red: "si" }, { red: { 0: { utm: "Sí" } } });
  es("un capador aplicable sin contestar sale en capadoresPendientes",
     pend.capadoresPendientes.map(x => x.id), ["rdp"]);
  es("y no genera hallazgo", pend.hallazgos.length, 0);
}


// ── Lo que la aplicacion puede deducir, no lo pregunta ──────────────────
// Reportado por el dueno: "esto se deberia determinar segun la version y si
// tiene soporte oficial, no preguntarlo". Ademas de trabajo de mas, preguntarlo
// hacia que el MISMO HECHO puntuara dos veces en el dominio endpoint.
console.log("\nDeduccion del soporte del sistema operativo");
{
  const rr = (se, fd, fecha) => computeScore({ criterios: CRITERIOS, precondiciones: PRECONDICIONES, sectionEnabled: se, formData: fd, instanceCounts: {}, fecha });
  const end = (r) => r.dominios.find(d => d.id === "endpoint");

  // Servidores: la version ya tiene su propio criterio, asi que preguntar
  // ademas "esta en soporte?" contaba el mismo hecho dos veces.
  const ws2012 = rr({ servidores: "si" }, { servidores: { 0: { so_familia: "Windows Server", so_windows_server: "Windows Server 2012", so_soporte: "Fuera de soporte (EOL)" } } }, "2026-08-20");
  es("un servidor EOL genera UN hallazgo, no dos", ws2012.hallazgos.map(h => h.id), ["srv_so_version_windows_server"]);

  // ...pero donde la version NO decide, la pregunta sigue haciendo falta.
  const mac = rr({ servidores: "si" }, { servidores: { 0: { so_familia: "macOS" } } }, "2026-08-20");
  es("en macOS el soporte se sigue preguntando",
     mac.capadoresPendientes.some(p => p.campo === "so_soporte"), true);

  // Parque de PCs: no hay criterio de version, asi que el dato hace falta y se
  // deduce en vez de preguntarse.
  const w10 = end(rr({ pcs: "si" }, { pcs: { 0: { so: "Windows 10" } } }, "2026-08-20"));
  es("Windows 10 hoy se deduce fuera de soporte", w10.nota, 0);
  es("y cuenta como evidencia, no como hueco", w10.evidencia > 0, true);

  // La deduccion depende de la fecha de la VISITA, no del reloj de hoy: un
  // informe de hace un ano tiene que seguir diciendo lo que era cierto aquel dia.
  const w10antes = end(rr({ pcs: "si" }, { pcs: { 0: { so: "Windows 10" } } }, "2025-01-01"));
  es("el mismo parque en enero de 2025 estaba en soporte", w10antes.nota, 20);

  // Una respuesta explicita manda sobre la deduccion (clientes con ESU de pago).
  const esu = end(rr({ pcs: "si" }, { pcs: { 0: { so: "Windows 10", so_soporte: "En soporte" } } }, "2026-08-20"));
  es("contestar a mano gana a la deduccion (caso ESU)", esu.nota, 20);

  // Y lo que no se puede deducir sigue siendo un hueco.
  const mixto = end(rr({ pcs: "si" }, { pcs: { 0: { so: "Mixto" } } }, "2026-08-20"));
  es("un parque \"Mixto\" no se deduce: sigue sin evidencia", mixto.evidencia, 0);
}


// ── Que campos mueven la nota ───────────────────────────────────
// El formulario los marca con una regla a la izquierda. Si esta lista se
// quedara corta, el tecnico invertiria su tiempo en inventario -que fue
// exactamente lo que paso en el cliente Benbros: 46% de campos rellenos y 30%
// de evidencia.
console.log("\nCampos que mueven la nota");
{
  es("incluye el campo de cada criterio",
     CRITERIOS.every(c => CAMPOS_QUE_PUNTUAN.has(`${c.seccion}.${c.campo}`)), true);
  // Un campo padre no puntua por si mismo pero decide si puntuan otros: dejarlo
  // sin marcar diria que "AHay un repositorio dedicado?" es inventario.
  es("y tambien los padres de los que cuelga un criterio",
     CRITERIOS.filter(c => c.dep).every(c => CAMPOS_QUE_PUNTUAN.has(`${c.seccion}.${c.dep.field}`)), true);
  es("backup.repo_dedicado esta marcado aunque no puntue solo",
     CAMPOS_QUE_PUNTUAN.has("backup.repo_dedicado"), true);
  // Y no marca de mas: una seccion sin criterios no tiene ni un campo marcado.
  es("una seccion sin criterios no marca nada",
     [...CAMPOS_QUE_PUNTUAN].some(k => k.startsWith("telefonia.")), false);
}

console.log(`\n${ok} correctas, ${fallos} fallos\n`);
process.exit(fallos ? 1 : 0);
