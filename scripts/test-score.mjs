// Pruebas del motor del CiberScore. Sin dependencias: node scripts/test-score.mjs
//
// No comprueban que el modelo sea "justo" (eso es criterio de auditor), sino
// que el motor respeta sus tres reglas: la ignorancia no puntua, los caps no se
// pueden maquillar, y en multi-instancia manda quien diga la agregacion.

import { computeScore } from "../src/score/computeScore.js";
// El grueso de las pruebas usa modelos sinteticos para aislar el motor. El
// bloque de deduccion del soporte necesita el modelo REAL: depende de ids
// concretos y de la tabla de fin de soporte.
import { CRITERIOS, PRECONDICIONES, CAMPOS_QUE_PUNTUAN, LITERALES_NO_APLICA, LITERALES_SIN_COMPROBAR, CONTRADICCIONES, MOTIVOS_INEXISTENCIA, MOTIVO_OTRO } from "../src/score/criterios.js";
import { SECTIONS } from "../src/sections.js";

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
  { id: "so", dominio: "servidores", seccion: "servidores", campo: "so_soporte", peso: 3,
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
   dom(r({ servidores: "si" }, { servidores: { 0: { so_soporte: "En soporte" }, 1: { so_soporte: "Fuera de soporte (EOL)" } } }, { servidores: 2 }), "servidores").nota, 0);
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
  const unoDeTres = dom(r({ servidores: "si" }, { servidores: { 0: { so_soporte: "En soporte" } } }, { servidores: 3 }), "servidores");
  es("tres servidores con uno contestado no dan evidencia plena", unoDeTres.evidencia, 33);
  // ...salvo que el valor ya no pueda cambiar mirando las demas instancias.
  const resuelto = dom(r({ servidores: "si" }, { servidores: { 0: { so_soporte: "Fuera de soporte (EOL)" } } }, { servidores: 3 }), "servidores");
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
// hacia que el MISMO HECHO puntuara dos veces en el mismo dominio.
console.log("\nDeduccion del soporte del sistema operativo");
{
  const rr = (se, fd, fecha) => computeScore({ criterios: CRITERIOS, precondiciones: PRECONDICIONES, sectionEnabled: se, formData: fd, instanceCounts: {}, fecha });
  // Desde 2.4.0 el antiguo dominio "endpoint" esta partido: el parque de PCs
  // vive en "puestos" y las maquinas servidoras en "servidores".
  const pcs = (r) => r.dominios.find(d => d.id === "puestos");

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
  const w10 = pcs(rr({ pcs: "si" }, { pcs: { 0: { so: "Windows 10" } } }, "2026-08-20"));
  es("Windows 10 hoy se deduce fuera de soporte", w10.nota, 0);
  es("y cuenta como evidencia, no como hueco", w10.evidencia > 0, true);

  // La deduccion depende de la fecha de la VISITA, no del reloj de hoy: un
  // informe de hace un ano tiene que seguir diciendo lo que era cierto aquel dia.
  //
  // Se comparan notas entre si en vez de fijar un numero: el valor exacto
  // depende del peso del criterio dentro de su dominio, y clavarlo aqui
  // obligaria a reescribir la prueba cada vez que se repondera algo, que es
  // justo lo que paso al partir "endpoint" en 2.4.0. Lo que la prueba tiene
  // que fijar es el comportamiento, no la aritmetica.
  const w10antes = pcs(rr({ pcs: "si" }, { pcs: { 0: { so: "Windows 10" } } }, "2025-01-01"));
  es("el mismo parque en enero de 2025 estaba en soporte", w10antes.nota > w10.nota, true);

  // Una respuesta explicita manda sobre la deduccion (clientes con ESU de pago).
  const esu = pcs(rr({ pcs: "si" }, { pcs: { 0: { so: "Windows 10", so_soporte: "En soporte" } } }, "2026-08-20"));
  es("contestar a mano gana a la deduccion (caso ESU)", esu.nota, w10antes.nota);

  // Y lo que no se puede deducir sigue siendo un hueco.
  const mixto = pcs(rr({ pcs: "si" }, { pcs: { 0: { so: "Mixto" } } }, "2026-08-20"));
  es("un parque \"Mixto\" no se deduce: sigue sin evidencia", mixto.evidencia, 0);
}


// ── Precondiciones nuevas (modelo 2.2.0) ─────────────────────────────────
// Medido antes de este cambio: negar las 8 secciones sin precondicion hacia
// desaparecer el 73% del peso de la nota sin un solo hallazgo (KNOWN_ISSUES
// A1). email, red y pcs pasan a exigir hallazgo siempre; sai lo exige salvo
// que el cliente declare que no tiene servidores. Las demas secciones
// negables (servidores, wifi, licenciamiento, vpn) se dejan fuera a proposito:
// su "no" puede ser una respuesta real y decidir lo contrario es una decision
// de negocio pendiente, no un bug.
console.log("\nPrecondiciones nuevas: email, red, pcs y sai (con salvoSi)");
{
  const rr = (se, fd, ic, fecha) => computeScore({ criterios: CRITERIOS, precondiciones: PRECONDICIONES, sectionEnabled: se, formData: fd || {}, instanceCounts: ic || {}, fecha: fecha || "" });

  es("negar email genera hallazgo", rr({ email: "no" }).hallazgos.some(h => h.id === "sin_email"), true);
  es("y capa el dominio correo a 0", rr({ email: "no" }).dominios.find(d => d.id === "correo").nota, 0);
  es("negar red genera hallazgo", rr({ red: "no" }).hallazgos.some(h => h.id === "sin_red"), true);
  es("negar pcs genera hallazgo", rr({ pcs: "no" }).hallazgos.some(h => h.id === "sin_pcs"), true);

  // sai se probo como precondicion y se revirtio el mismo dia: probado contra
  // un cliente real, tener armario/rack es una recomendacion, no un hallazgo
  // que deba capar un dominio. Fija la decision de negocio, no un olvido.
  es("negar sai NO genera hallazgo (decision de negocio, revertido tras probarlo)",
     rr({ sai: "no", servidores: "si" }).hallazgos.length, 0);

  // Documenta la decision pendiente, no la esconde: servidores sigue siendo
  // negable gratis hasta que el dueno decida su precondicion.
  es("servidores sigue sin precondicion (decision de negocio pendiente)",
     rr({ servidores: "no" }).hallazgos.length, 0);
}

// ── Un valor fosil no puede silenciar un capador ─────────────────────────
// redundanteSi comparaba el campo de version SIN comprobar que su propio dep
// se cumpliera todavia. Cambiar so_familia de "Windows Server" a "Linux" deja
// un valor fosil en so_windows_server; leerlo sin mirar el dep colaba ese
// fosil como si decidiera y silenciaba srv_so_soporte entero.
console.log("\nUn valor fosil no puede silenciar el capador srv_so_soporte");
{
  const rr = (se, fd, ic, fecha) => computeScore({ criterios: CRITERIOS, precondiciones: PRECONDICIONES, sectionEnabled: se, formData: fd || {}, instanceCounts: ic || {}, fecha: fecha || "" });
  const fosil = rr({ servidores: "si" },
    { servidores: { 0: { so_familia: "Linux", so_windows_server: "Windows Server 2012", so_soporte: "" } } },
    {}, "2026-08-20");
  es("con so_familia en Linux, so_soporte sigue pendiente pese al fosil de Windows Server",
     fosil.capadoresPendientes.some(p => p.id === "srv_so_soporte"), true);
}

// ── El disparo de un cap sigue su propia agregacion ──────────────────────
// sai_existe agrega por "max" a proposito -"basta un armario bueno"- pero el
// cap se disparaba con CUALQUIER instancia mala, contradiciendo su propio
// porQue: un armario secundario sin SAI no puede capar el dominio si el
// principal si lo tiene.
console.log("\nUn cap con agregacion 'max' exige que TODAS las instancias esten mal");
{
  const rr = (se, fd, ic) => computeScore({ criterios: CRITERIOS, precondiciones: PRECONDICIONES, sectionEnabled: se, formData: fd, instanceCounts: ic });
  const conBueno = rr({ sai: "si" }, { sai: { 0: { sai_existe: "Sí" }, 1: { sai_existe: "No" } } }, { sai: 2 });
  es("un armario secundario sin SAI no capa si el principal si tiene",
     conBueno.hallazgos.some(h => h.id === "sai_existe"), false);
  const ningunoBueno = rr({ sai: "si" }, { sai: { 0: { sai_existe: "No" }, 1: { sai_existe: "No" } } }, { sai: 2 });
  es("si NINGUN armario tiene SAI, si capa",
     ningunoBueno.hallazgos.some(h => h.id === "sai_existe"), true);
}

// ── Campos padre sin decidir retrasan el sello de fiable ─────────────────
// backup.repo_dedicado no puntua por si mismo, solo decide si puntuan otros
// tres campos. Dejarlo en blanco no debe mover la nota -el orden de
// incentivos del campo hijo ya es el correcto, ver KNOWN_ISSUES A2- pero
// tampoco puede ser gratis del todo.
console.log("\nUn campo padre en blanco retrasa 'fiable' sin tocar la nota");
{
  const rr = (se, fd) => computeScore({ criterios: CRITERIOS, precondiciones: PRECONDICIONES, sectionEnabled: se, formData: fd, instanceCounts: {} });
  const blanco = rr({ backup: "si" }, { backup: { 0: { frecuencia: "Continuo" } } });
  const contestado = rr({ backup: "si" }, { backup: { 0: { frecuencia: "Continuo", repo_dedicado: "No (solo cloud)" } } });
  es("backup.repo_dedicado en blanco cuenta como padre sin decidir", blanco.padresSinDecidir.length > 0, true);
  es("y dice cual es", blanco.padresSinDecidir[0], { seccion: "backup", campo: "repo_dedicado", instancia: null });
  es("contestado ya no cuenta", contestado.padresSinDecidir.length, 0);
  es("y no mueve la nota del dominio", blanco.dominios.find(d => d.id === "backup").nota,
     contestado.dominios.find(d => d.id === "backup").nota);

  // "No revisado" en un PADRE es el mismo estado de conocimiento que el blanco,
  // y valia mejor: cerraba el `dep` de los hijos -sacando del denominador dos
  // capadores- y encima devolvia el sello de fiable que el blanco retiene.
  // Medido sobre un cliente perfecto: declarar el NAS y reconocer no haberlo
  // mirado daba 94; contestar "No revisado" en el padre daba 100 y fiable.
  const noRevisado = rr({ backup: "si" }, { backup: { 0: { frecuencia: "Continuo", repo_dedicado: "No revisado" } } });
  es("'No revisado' en un padre cuenta igual que el blanco", noRevisado.padresSinDecidir.length, blanco.padresSinDecidir.length);
  es("y por tanto tampoco da el sello de fiable", noRevisado.fiable, blanco.fiable);
  es("y sigue sin mover la nota", noRevisado.nota, blanco.nota);
}


// ── La calidad de la respuesta se gradua (modelo 2.3.0) ──────────────────
// Reportado por el dueno: "no puede valer igual de nota un antivirus normal,
// que edr, xdr, mdr gestionado". Estas pruebas fijan los escalones para que
// nadie los vuelva a aplanar, y sobre todo fijan las dos reglas que hacen que
// graduar sea seguro.
console.log("\nLa calidad de la respuesta se gradua, no se aplana");
{
  const mapaDe = (id) => CRITERIOS.find(c => c.id === id).mapa;

  // El caso que lo motivo, con su escalon completo.
  const av = mapaDe("av_tipo_solucion");
  es("MDR > XDR > EDR > antivirus basico",
     av["MDR gestionado"] > av["XDR"] && av["XDR"] > av["EDR"] && av["EDR"] > av["Antivirus básico"], true);
  // El antivirus de firmas no es "media proteccion": no ve el ransomware
  // moderno, que es de lo que va este criterio.
  es("y el antivirus de firmas puntua cero", av["Antivirus básico"], 0);

  // Y CAPA el dominio. Es la unica forma de que la eleccion de solucion se
  // note en la nota global: el peso de cualquier criterio esta acotado por el
  // de su dominio -puestos entero vale 13 puntos- asi que subir el peso no
  // podia hacer que MDR frente a firmas moviera ni dos puntos. Medido: con el
  // cap la diferencia global pasa de 3 a 5 puntos, y la del dominio a 35.
  const avCrit = CRITERIOS.find(c => c.id === "av_tipo_solucion").critico;
  es("el antivirus de firmas capa el dominio de puestos", avCrit?.capDominio, 65);
  es("y solo lo dispara el antivirus de firmas", avCrit?.cuando, ["Antivirus básico"]);

  const bk = mapaDe("backup_frecuencia");
  es("copia continua puntua mas que diaria", bk["Continuo"] > bk["Diario"], true);
  const ret = mapaDe("backup_retencion");
  es("tres meses de retencion puntuan mas que treinta dias", ret["3 a 12 meses"] > ret["15 a 30 días"], true);
  const wifi = mapaDe("wifi_cifrado");
  es("WPA3 puntua mas que WPA2-PSK", wifi["WPA3"] > wifi["WPA2-PSK"], true);
  const ws = mapaDe("srv_so_version_windows_server");
  es("Windows Server 2022 puntua mas que 2019", ws["Windows Server 2022"] > ws["Windows Server 2019"], true);

  // REGLA 1: ninguna respuesta real puede quedar por debajo de callarse.
  // Callar vale 0, asi que graduar a la baja nunca puede cruzar ese suelo: si
  // lo cruzara, el tecnico aprenderia a no tocar el desplegable.
  const sinComprobar = new Set([...LITERALES_NO_APLICA, ...LITERALES_SIN_COMPROBAR]);
  const bajoCero = [];
  const regalados = [];
  for (const c of CRITERIOS) {
    for (const [k, v] of Object.entries(c.mapa ?? {})) {
      if (v < 0) bajoCero.push(`${c.id}.${k}`);
      // Un literal de "no lo he mirado" no puede valer mas que cero: declarar
      // la ignorancia y callarla son el mismo estado de conocimiento.
      if (sinComprobar.has(k) && v > 0) regalados.push(`${c.id}.${k}`);
    }
  }
  es("ninguna respuesta puntua por debajo de callarse", bajoCero, []);
  es("y ningun literal de 'sin comprobar' puntua por encima de cero", regalados, []);

  // REGLA 2: hay empates que son CORRECTOS y no se pueden "arreglar". Confundir
  // "valen lo mismo porque el riesgo es el mismo" con "se nos olvido graduar"
  // meteria ruido: no hay VPNs que auditar, no hay accesos que revocar.
  es("'No hay VPNs' sigue valiendo lo mismo que 'Auditadas'",
     mapaDe("red_vpns")["No hay VPNs"], mapaDe("red_vpns")["Auditadas"]);
  es("'No existían' sigue valiendo lo mismo que 'Revocados'",
     mapaDe("san_red_accesos")["No existían"], mapaDe("san_red_accesos")["Revocados"]);
  es("los tres tipos de rack siguen valiendo igual (el tipo no cambia el riesgo)",
     mapaDe("sai_rack_tipo")["Rack de pie 19\""], mapaDe("sai_rack_tipo")["Rack mural"]);
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


// ═══════════════════════════════════════════════════════════════════════════
// 2.6.0 — Declarar que el cliente no tiene algo
// ═══════════════════════════════════════════════════════════════════════════

// Modelo sintetico minimo: una seccion declarable (`wifi`) y otra que no lo es.
// Sintetico y no el real para que estas pruebas fijen el MECANISMO y no las
// cifras del catalogo, que cambian cada vez que se anade un criterio (C8).
//
// `red` lleva varios criterios a proposito: con uno solo, retirar el peso de
// `wifi` hunde la evidencia por debajo del 60% y el motor devuelve el motivo
// "evidencia" en vez de "sin_motivo" —correctamente, porque la evidencia manda
// siempre que sea ella la que no llega (C6)—. Para probar el motivo hace falta
// que el resto del modelo siga por encima del umbral.
const MOD_DECL = {
  criterios: [
    { id: "t_wifi", dominio: "perimetro", seccion: "wifi", campo: "cifrado", peso: 3,
      mapa: { "WPA3": 1, "WPA2-Enterprise": 1, "WPA2-PSK": 0.5, "Abierta": 0 }, agregacion: "min",
      porQue: "prueba" },
    { id: "t_red", dominio: "perimetro", seccion: "red", campo: "firewall", peso: 3,
      mapa: { "Sí": 1, No: 0 }, agregacion: "min", porQue: "prueba" },
    { id: "t_red2", dominio: "perimetro", seccion: "red", campo: "utm", peso: 3,
      mapa: { "Sí": 1, No: 0 }, agregacion: "min", porQue: "prueba" },
    { id: "t_red3", dominio: "perimetro", seccion: "red", campo: "vlans", peso: 3,
      mapa: { "Sí": 1, No: 0 }, agregacion: "min", porQue: "prueba" },
    { id: "t_red4", dominio: "perimetro", seccion: "red", campo: "monitorizacion", peso: 3,
      mapa: { "Sí": 1, No: 0 }, agregacion: "min", porQue: "prueba" },
  ],
  precondiciones: [],
  contradiccionesDef: [],
};
const RED_OK = { firewall: "Sí", utm: "Sí", vlans: "Sí", monitorizacion: "Sí" };
const decl = (sectionEnabled, formData, extra = {}) =>
  computeScore({ ...MOD_DECL, sectionEnabled, formData, instanceCounts: {}, ...extra });

const MOTIVO_WIFI = MOTIVOS_INEXISTENCIA.wifi[0];

console.log("\nNegar una seccion: el peso sale de la nota, pero no de la evidencia");
{
  const abierta = decl({ wifi: "si", red: "si" }, { wifi: { 0: { cifrado: "WPA3" } }, red: { 0: RED_OK } });
  const conMotivo = decl({ wifi: "no", red: "si" }, { wifi: { 0: { sin_servicio_motivo: MOTIVO_WIFI } }, red: { 0: RED_OK } });
  const sinMotivo = decl({ wifi: "no", red: "si" }, { red: { 0: RED_OK } });
  const vacia = decl({ wifi: "si", red: "si" }, { red: { 0: RED_OK } });

  // Con motivo el tecnico ha declarado algo sobre el cliente y queda escrito:
  // es evidencia aportada, igual que comprobar la seccion entera.
  es("negar con motivo no baja la evidencia", conMotivo.evidencia, abierta.evidencia);
  es("y se publica", conMotivo.fiable, true);

  // Sin motivo no queda nada escrito, asi que no puede valer como comprobacion.
  es("negar sin motivo baja la evidencia", sinMotivo.evidencia < conMotivo.evidencia, true);
  es("y no se publica", sinMotivo.fiable, false);
  es("diciendo por que", sinMotivo.motivoNoFiable, "sin_motivo");

  // El incentivo, que es lo que de verdad hay que fijar: el clic del "no" a
  // secas no puede comprar nada frente a dejar la seccion abierta sin mirar.
  es("negar sin motivo no puntua mejor que dejarla abierta y vacia",
     sinMotivo.evidencia <= vacia.evidencia, true);

  // "Otro" sin escribir el detalle no es una declaracion: es un desplegable
  // tocado. Si valiera, seria el atajo mas barato de todos.
  const otroPelado = decl({ wifi: "no", red: "si" }, { wifi: { 0: { sin_servicio_motivo: MOTIVO_OTRO } }, red: { 0: RED_OK } });
  es("'Otro' sin detalle cuenta como sin motivo", otroPelado.motivoNoFiable, "sin_motivo");
  const otroEscrito = decl({ wifi: "no", red: "si" }, { wifi: { 0: { sin_servicio_motivo: MOTIVO_OTRO, sin_servicio_detalle: "El wifi lo pone el arrendador" } }, red: { 0: RED_OK } });
  es("'Otro' con detalle si cuenta", otroEscrito.fiable, true);

  // Y negar algo que no tiene peso en el modelo no puede cambiar nada.
  const sinCriterios = decl({ wifi: "si", red: "si", telefonia: "no" }, { wifi: { 0: { cifrado: "WPA3" } }, red: { 0: RED_OK } });
  es("negar una seccion sin criterios no cambia la nota", sinCriterios.nota, abierta.nota);
  es("ni pide motivo", sinCriterios.negadasSinMotivo.length, 0);
}

console.log("\nContradicciones: el formulario que se desmiente a si mismo");
{
  const REGLA = [{
    id: "t_contra", seccion: "wifi",
    senal: { seccion: "impresion", campo: "conectividad", valores: ["WiFi"] },
    texto: "prueba",
  }];
  const base = { wifi: { 0: { sin_servicio_motivo: MOTIVO_WIFI } }, red: { 0: RED_OK } };
  const limpio = decl({ wifi: "no", red: "si", impresion: "si" },
    { ...base, impresion: { 0: { conectividad: "Ethernet" } } }, { contradiccionesDef: REGLA });
  const roto = decl({ wifi: "no", red: "si", impresion: "si" },
    { ...base, impresion: { 0: { conectividad: "WiFi" } } }, { contradiccionesDef: REGLA });

  es("una senal de otra seccion bloquea el sello", roto.fiable, false);
  es("y el motor dice por que", roto.motivoNoFiable, "contradicciones");
  es("nombrando la regla", roto.contradicciones.length, 1);
  // No es un hallazgo sobre el cliente: no se afirma que tenga wifi, se afirma
  // que el formulario dice dos cosas incompatibles (D6).
  es("no genera hallazgo", roto.hallazgos.length, limpio.hallazgos.length);
  es("ni mueve la nota", roto.nota, limpio.nota);
  es("sin la senal no salta nada", limpio.contradicciones.length, 0);

  // La senal solo cuenta si su seccion esta activa: leerla de una seccion
  // negada seria leer un valor fosil (la trampa de lectorEfectivo).
  const senalApagada = decl({ wifi: "no", red: "si", impresion: "no" },
    { ...base, impresion: { 0: { conectividad: "WiFi" } } }, { contradiccionesDef: REGLA });
  es("una senal de una seccion negada no cuenta", senalApagada.contradicciones.length, 0);

  // Y con `dep`: un campo tapado por su condicional no puede disparar nada.
  const CON_DEP = [{
    id: "t_dep", seccion: "wifi",
    senal: { seccion: "backup", campo: "repo_expuesto", dep: { field: "repo_dedicado", value: "Sí" }, valores: ["Sí, únicamente por VPN"] },
    texto: "prueba",
  }];
  const tapada = decl({ wifi: "no", red: "si", backup: "si" },
    { ...base, backup: { 0: { repo_dedicado: "No (solo cloud)", repo_expuesto: "Sí, únicamente por VPN" } } },
    { contradiccionesDef: CON_DEP });
  es("una senal tapada por su dep no dispara", tapada.contradicciones.length, 0);
}

console.log("\nLa regla simetrica de VPN existe (si no, mentir en la senal sale gratis)");
{
  // Sin la mitad simetrica, la salida barata de una contradiccion seria mentir
  // en la senal en vez de arreglar la respuesta. "No hay VPNs" ya valia lo
  // mismo que "Auditadas" (D14), asi que silenciarlo no costaba nada.
  es("hay al menos una regla que se dispara con la seccion en 'si'",
     CONTRADICCIONES.some(k => k.cuando === "si"), true);
  const inversa = computeScore({
    criterios: CRITERIOS, precondiciones: PRECONDICIONES,
    sectionEnabled: { vpn: "si", red: "si" },
    formData: { red: { 0: { vpns_auditadas: "No hay VPNs" } } },
    instanceCounts: {},
  });
  es("documentar una VPN que el perimetro niega es contradiccion",
     inversa.contradicciones.some(k => k.id === "contra_vpn_inversa"), true);
}

console.log("\nUn criterio que cuelga de otra seccion (depSeccion)");
{
  const MOD_DEP = {
    criterios: [
      { id: "t_av_srv", dominio: "servidores", seccion: "antivirus", campo: "servidores_av", peso: 3,
        mapa: { "Sí": 1, No: 0 }, agregacion: "max", depSeccion: { seccion: "servidores" }, porQue: "prueba" },
      { id: "t_red", dominio: "perimetro", seccion: "red", campo: "firewall", peso: 3,
        mapa: { "Sí": 1, No: 0 }, agregacion: "min", porQue: "prueba" },
    ],
    precondiciones: [], contradiccionesDef: [],
  };
  const conSrv = (av) => computeScore({ ...MOD_DEP, sectionEnabled: { servidores: "si", antivirus: "si", red: "si" },
    formData: { antivirus: { 0: { servidores_av: av } }, red: { 0: RED_OK } }, instanceCounts: {} });
  const sinSrv = (av) => computeScore({ ...MOD_DEP, sectionEnabled: { servidores: "no", antivirus: "si", red: "si" },
    formData: { servidores: { 0: { sin_servicio_motivo: MOTIVOS_INEXISTENCIA.servidores[0] } }, antivirus: { 0: { servidores_av: av } }, red: { 0: RED_OK } },
    instanceCounts: {} });

  const dom = (r) => r.dominios.find(d => d.id === "servidores");
  es("con servidores, el criterio aplica", dom(conSrv("No")).evaluable, true);
  es("sin servidores, sale del denominador", dom(sinSrv("No")).evaluable, false);

  // El agujero que cerraba: el todo-cloud que contestaba la verdad ("el
  // antivirus no cubre servidores, porque no hay servidores") se llevaba el
  // dominio entero a 0 y perdia su peso en la nota global. Mentir lo devolvia.
  es("y contestar la verdad ya no cuesta nota", sinSrv("No").nota, sinSrv("Sí").nota);
  es("ni la cuesta dejarlo en blanco", sinSrv(undefined).nota, sinSrv("No").nota);
}

console.log("\nUn literal declarado sin comprobar no cierra el capador");
{
  // `computa` existe para que "No revisado" en red_rdp puntue 0 en vez de salir
  // del denominador: ahi desconocerlo ES el riesgo. Pero contestarlo no es
  // haberlo comprobado, asi que no puede vaciar la lista de comprobaciones
  // criticas pendientes. Las fichas 03 y 04 salian con CERO pendientes
  // teniendo el RDP y el panel de licencias sin mirar.
  const conCriterios = CRITERIOS.filter(c => c.critico && c.computa?.some(v => LITERALES_SIN_COMPROBAR.includes(v)));
  es("hay capadores con un literal de 'no comprobado' que computa", conCriterios.length > 0, true);

  const r = (valor) => computeScore({
    criterios: CRITERIOS, precondiciones: PRECONDICIONES,
    sectionEnabled: { red: "si" },
    formData: { red: { 0: { firewall: "Sí", ...(valor === undefined ? {} : { rdp_expuesto: valor }) } } },
    instanceCounts: {},
  });
  const blanco = r(undefined), declarado = r("No revisado");
  const pend = (x) => x.capadoresPendientes.filter(p => p.campo === "rdp_expuesto").length;

  es("declararlo deja el capador pendiente igual que el blanco", pend(declarado), pend(blanco));
  // Y la excepcion acordada con el dueno sigue en pie: el literal PUNTUA.
  es("pero el literal sigue puntuando (no sale del denominador)",
     declarado.dominios.find(d => d.id === "perimetro").criteriosEvaluados >
     blanco.dominios.find(d => d.id === "perimetro").criteriosEvaluados, true);
}

console.log("\nInvariantes duros del modelo REAL");
{
  // El dueno lo puso como restriccion explicita: "si fuera perfecto deberia dar
  // 100". Se construye a partir de los propios CRITERIOS -el mejor literal de
  // cada mapa- y no de una ficha con numeros a mano, para que la prueba siga
  // valiendo cuando se anadan criterios.
  const mejorLiteral = (c) => {
    if (!c.mapa) return null;
    let mejor = null, valor = -1;
    for (const [lit, v] of Object.entries(c.mapa)) if (v > valor) { valor = v; mejor = lit; }
    return mejor;
  };
  const perfecto = () => {
    const sectionEnabled = {}, formData = {};
    for (const s of SECTIONS) sectionEnabled[s.id] = "si";
    for (const c of CRITERIOS) {
      const lit = mejorLiteral(c);
      if (lit === null) continue;
      (formData[c.seccion] ??= { 0: {} });
      formData[c.seccion][0][c.campo] = lit;
      // Los campos padre tienen que abrir el `dep` de sus hijos.
      if (c.dep) formData[c.seccion][0][c.dep.field] = c.dep.value;
    }
    return { sectionEnabled, formData };
  };
  const cliente = perfecto();
  const r = computeScore({ ...cliente, criterios: CRITERIOS, precondiciones: PRECONDICIONES, instanceCounts: {}, fecha: "2026-08-24" });
  es("un cliente perfecto da EXACTAMENTE 100", r.nota, 100);
  es("con evidencia 100", r.evidencia, 100);
  es("y sin un solo hallazgo", r.hallazgos.length, 0);
  es("los 8 dominios a 100", r.dominios.filter(d => d.nota === 100).length, 8);
}

console.log(`\n${ok} correctas, ${fallos} fallos\n`);
process.exit(fallos ? 1 : 0);
