// Pruebas del motor del CiberScore. Sin dependencias: node scripts/test-score.mjs
//
// No comprueban que el modelo sea "justo" (eso es criterio de auditor), sino
// que el motor respeta sus tres reglas: la ignorancia no puntua, los caps no se
// pueden maquillar, y en multi-instancia manda quien diga la agregacion.

import { computeScore } from "../src/score/computeScore.js";

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
es("...y no puntua como bueno",
   dom(r({ red: "si" }, { red: { 0: { rdp_expuesto: "No revisado", utm: "Sí" } } }), "perimetro").nota, 100);
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
es("max: basta una buena",
   dom(r({ red: "si" }, { red: { 0: { utm: "No" }, 1: { utm: "Sí" } } }, { red: 2 }), "perimetro").nota, 100);
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
es("la cobertura dice cuanto peso se ha podido evaluar",
   r({ red: "si" }, { red: { 0: { rdp_expuesto: "No" } } }).cobertura, 18);

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

console.log(`\n${ok} correctas, ${fallos} fallos\n`);
process.exit(fallos ? 1 : 0);
