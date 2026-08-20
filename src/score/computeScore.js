// Motor del CiberScore.
//
// Funcion pura: mismas respuestas y misma version del modelo dan siempre la
// misma nota. No lee estado de React ni la fecha; todo entra por parametros,
// asi que se puede probar y se puede recalcular una nota antigua.
//
// Las tres reglas del modelo:
//
//   1. Lo que no se ha comprobado no puntua. Un campo vacio o marcado como no
//      revisado SIGUE contando en el denominador de su dominio, y vale 0: la
//      nota mide cuanta proteccion se ha demostrado, no que tal pinta lo poco
//      que se llego a mirar. Lo unico que sale del denominador es lo que NO
//      APLICA a este cliente, que es una afirmacion sobre el cliente y no
//      sobre la visita. Un criterio puede declarar `computa` para forzar que
//      un literal concreto si entre valiendo lo que diga el mapa, cuando
//      desconocerlo es en si mismo el riesgo.
//
//      Antes salia de los dos lados del cociente, y eso no era neutro: quitar
//      algo del numerador Y del denominador equivale a imputarle la media de
//      lo que si se miro, que es el valor mas optimista disponible. Por eso un
//      dominio con un criterio bueno de diez daba 100.
//   2. Caps criticos. Hay hallazgos que ninguna suma de puntos maquilla: capan
//      su dominio, y algunos la nota global.
//   3. Multi-instancia. Con varios servidores o varias redes, cada criterio
//      dice si manda la peor instancia (`min`, para SO en soporte o RAID) o si
//      basta con una buena (`max`, para backup fuera de sede).

import { DOMINIOS, tramoDe, SCORE_MODEL_VERSION, EVIDENCIA_MINIMA } from "./dominios.js";
import { LITERALES_NO_APLICA, LITERALES_SIN_COMPROBAR } from "./criterios.js";
import { FIN_SOPORTE, soporteDe } from "./soporteSO.js";

const vacio = (v) => v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);

/**
 * Estado de un criterio en UNA instancia. Tres valores y no dos, porque el
 * motor tiene que distinguir dos cosas que hasta ahora salian igual del
 * cociente:
 *
 *   "noaplica"      el control no existe en este cliente. Fuera del
 *                   denominador: su superficie de riesgo es menor de verdad.
 *   "sincomprobar"  existe y nadie lo ha mirado. DENTRO del denominador
 *                   valiendo 0, porque no hay posicion neutra: sacarlo de los
 *                   dos lados del cociente le imputa la media de lo que si se
 *                   miro, que es siempre el valor mas optimista disponible.
 *   "valor"         comprobado, con lo que diga el mapa.
 */
function estadoEnInstancia(criterio, leer, fecha) {
  // Un condicional que no se cumple ni siquiera aparece en pantalla. Con el
  // padre en blanco tampoco se puede exigir: no sabemos si el cliente tiene
  // eso, y contarlo como pendiente haria que contestar "No" al padre SUBIERA
  // la nota, que es el mismo fallo que se esta arreglando con el signo del
  // reves.
  if (criterio.dep && leer(criterio.dep.field) !== criterio.dep.value) return { tipo: "noaplica" };

  // El mismo hecho no puede puntuar dos veces. "El SO esta en soporte" se
  // deduce de la version, y la version YA tiene su propio criterio, con mas
  // matiz ademas (Windows Server 2016 vale 0.5, no 0 ni 1). Contar las dos
  // cosas sumaba 5 puntos de peso al mismo dominio por un unico dato y hacia
  // saltar el mismo tope por duplicado: el informe listaba "servidor fuera de
  // soporte" y "Windows Server sin parches desde hace anos" como dos hallazgos.
  //
  // Cuando la version no decide -macOS, "Otro", o una distribucion de Linux
  // cuya version menor no recoge el desplegable- la pregunta sigue haciendo
  // falta y el criterio se comporta como cualquier otro.
  if (criterio.redundanteSi?.some(c => FIN_SOPORTE[leer(c)] !== undefined)) return { tipo: "noaplica" };

  const v = leer(criterio.campo);

  // Si el campo esta en blanco pero otro ya lo determina, no es un hueco: es un
  // dato que la aplicacion puede deducir. Preguntar "esta en soporte?" a quien
  // acaba de contestar "Windows 10" es trabajo de mas y una ocasion de
  // equivocarse. Una respuesta explicita siempre manda sobre la deduccion: hay
  // clientes con soporte extendido de pago (ESU) que son la excepcion legitima.
  if (vacio(v) && criterio.deducibleDe) {
    const deducido = soporteDe(leer(criterio.deducibleDe), fecha);
    if (deducido !== null && criterio.mapa && deducido in criterio.mapa) {
      return { tipo: "valor", valor: criterio.mapa[deducido], deducido };
    }
  }

  if (vacio(v)) return { tipo: "sincomprobar" };
  if (Array.isArray(v)) return { tipo: "noaplica" }; // los checks no se resuelven con un mapa literal
  if (LITERALES_NO_APLICA.includes(v)) return { tipo: "noaplica" };

  // `computa` es la excepcion documentada: para estos criterios reconocer que
  // nadie lo ha mirado ES el hallazgo, asi que puntua lo que diga el mapa en
  // vez de contar como hueco.
  if (criterio.computa?.includes(v) && criterio.mapa && v in criterio.mapa) return { tipo: "valor", valor: criterio.mapa[v] };
  if (LITERALES_SIN_COMPROBAR.includes(v)) return { tipo: "sincomprobar" };

  // Literal que el modelo no conoce: no se inventa valor, pero tampoco se
  // regala. check-score.mjs impide que esto ocurra por descuido.
  if (!(criterio.mapa && v in criterio.mapa)) return { tipo: "sincomprobar" };

  return { tipo: "valor", valor: criterio.mapa[v] };
}


/**
 * Valor literal de un campo respetando su condicional, sin pasar por el mapa.
 * Lo usa el disparo de caps, que compara contra los literales criticos.
 */
function valorCrudoEfectivo(criterio, leer) {
  if (criterio.dep && leer(criterio.dep.field) !== criterio.dep.value) return null;
  const v = leer(criterio.campo);
  return vacio(v) ? null : v;
}

/** Agrega las instancias de una seccion segun diga el criterio. */
function agregar(valores, modo) {
  const v = valores.filter(x => x !== null);
  if (!v.length) return null;
  return modo === "max" ? Math.max(...v) : Math.min(...v);
}

/**
 * @param {object} p
 * @param {object} p.formData        respuestas del formulario
 * @param {object} p.sectionEnabled  { seccion: "si" | "no" | undefined }
 * @param {object} p.instanceCounts  { seccion: n }
 * @param {Array}  p.criterios       reglas del modelo
 * @param {Array}  p.precondiciones  reglas de seccion entera (p.ej. no hay backup)
 */
export function computeScore({ formData = {}, sectionEnabled = {}, instanceCounts = {}, criterios = [], precondiciones = [], fecha = "" }) {
  const porDominio = {};
  // `pesoAplicable` (el denominador de la nota) es el peso de los criterios que
  // le tocaban a este cliente, contestados o no. `pesoEvaluado` es el de los
  // que ademas se comprobaron. La distancia entre ambos es la evidencia que
  // falta, y es justo lo que antes desaparecia del cociente.
  for (const d of Object.keys(DOMINIOS)) {
    porDominio[d] = { suma: 0, pesoEvaluado: 0, pesoAplicable: 0, cap: 100, evaluados: 0, aplicables: 0 };
  }

  const hallazgos = [];
  let capGlobal = 100;

  // Dejar una seccion sin decidir deja de ser gratis. No cambia la nota —sus
  // criterios siguen fuera— pero invalida la fiabilidad, y con eso desaparece
  // el premio por marcar "no" una seccion que si existe: silencio y "no" dan la
  // misma nota, y el "no" al menos es una declaracion que queda escrita y se
  // puede leer en el informe.
  const sinResponder = [...new Set([
    ...criterios.map(c => c.seccion),
    ...precondiciones.filter(p => p.exigida).map(p => p.seccion),
  ])].filter(s => sectionEnabled[s] === undefined).sort();

  // ── Precondiciones de seccion ────────────────────────────────────────────
  // "No tiene backup" no es un dato que falte: es el hallazgo.
  for (const p of precondiciones) {
    if (sectionEnabled[p.seccion] !== p.cuando) continue;
    hallazgos.push({ id: p.id, dominio: p.dominio, gravedad: "critico", texto: p.texto });
    if (p.capDominio !== undefined) porDominio[p.dominio].cap = Math.min(porDominio[p.dominio].cap, p.capDominio);
    if (p.capGlobal !== undefined) capGlobal = Math.min(capGlobal, p.capGlobal);
  }

  // ── Criterios ────────────────────────────────────────────────────────────
  const capadoresPendientes = [];

  for (const c of criterios) {
    // Seccion sin responder, o marcada como que no aplica: fuera del
    // denominador. Las secciones cuyo "no" es un hallazgo van en precondiciones.
    if (sectionEnabled[c.seccion] !== "si") continue;

    const n = Math.max(1, instanceCounts[c.seccion] || 1);
    const d = porDominio[c.dominio];
    const valores = [];
    let aplicables = 0, evaluadas = 0;

    for (let i = 0; i < n; i++) {
      const leer = (campo) => formData[c.seccion]?.[i]?.[campo] ?? "";
      const e = estadoEnInstancia(c, leer, fecha);
      if (e.tipo === "noaplica") { valores.push(null); continue; }
      aplicables++;
      if (e.tipo === "valor") { evaluadas++; valores.push(e.valor); }
      else valores.push(null);
    }

    // Si no aplica en ninguna instancia, no es evidencia que falte.
    if (aplicables === 0) continue;

    d.pesoAplicable += c.peso;
    d.aplicables++;

    const valor = agregar(valores, c.agregacion);

    // Fraccion demostrada del criterio. Tres servidores son tres
    // comprobaciones y documentar uno no demuestra los otros dos. Con la
    // excepcion que la propia regla 3 obliga: cuando el valor ya no puede
    // cambiar mirando las demas instancias —un 0 con `min`, un 1 con `max`— el
    // criterio esta resuelto y no hay nada mas que comprobar.
    if (valor !== null) {
      const resuelto = (c.agregacion === "min" && valor === 0) || (c.agregacion === "max" && valor === 1);
      const fraccion = resuelto ? 1 : evaluadas / aplicables;
      d.suma += c.peso * valor * fraccion;
      d.pesoEvaluado += c.peso * fraccion;
      d.evaluados++;
    }

    // Un cap se dispara si CUALQUIER instancia esta en el estado critico.
    // Se lee con el mismo filtro que el resto: un valor fosil de un campo
    // oculto por su `dep` no puede capar un dominio entero.
    if (c.critico) {
      const disparado = Array.from({ length: n }, (_, i) => valorCrudoEfectivo(c, (campo) => formData[c.seccion]?.[i]?.[campo] ?? ""))
        .some(v => v !== null && c.critico.cuando.includes(v));
      if (disparado) {
        hallazgos.push({ id: c.id, dominio: c.dominio, gravedad: "critico", texto: c.porQue });
        if (c.critico.capDominio !== undefined) d.cap = Math.min(d.cap, c.critico.capDominio);
        if (c.critico.capGlobal !== undefined) capGlobal = Math.min(capGlobal, c.critico.capGlobal);
      } else if (evaluadas < aplicables) {
        // Comprobacion critica que aplicaba y nadie hizo. No toca la nota
        // —afirmar el peor caso sin haberlo visto seria fabricar un hallazgo—
        // pero el informe no puede seguir imprimiendo "sin hallazgos criticos
        // abiertos" por encima de ella.
        capadoresPendientes.push({
          id: c.id, dominio: c.dominio, seccion: c.seccion, campo: c.campo,
          titular: c.titular, capDominio: c.critico.capDominio, capGlobal: c.critico.capGlobal,
        });
      }
    }
  }

  // ── Nota por dominio y global ────────────────────────────────────────────
  const dominios = [];
  let numerador = 0, pesoTotal = 0, evidPond = 0, pesoEvid = 0;

  for (const [id, d] of Object.entries(porDominio)) {
    // Un dominio con criterios que le aplican NO puede salir del reparto por
    // estar en blanco. Si saliera, su peso se repartiria entre los que si
    // tienen datos —que son justo los que salieron bien— y borrar respuestas
    // subiria la nota. Y si no le aplica nada pero hay un hallazgo critico
    // confirmado, tampoco: "no tiene copias" es un dato del cliente, no un
    // hueco de la visita.
    const evaluable = d.pesoAplicable > 0 || d.cap < 100;
    const bruto = d.pesoAplicable > 0 ? (d.suma / d.pesoAplicable) * 100 : 0;
    const nota = evaluable ? Math.round(Math.min(bruto, d.cap)) : null;

    // Cuanto de lo que habia que mirar en este dominio se ha mirado de verdad.
    const evidencia = d.pesoAplicable > 0 ? Math.round((d.pesoEvaluado / d.pesoAplicable) * 100) : null;

    dominios.push({
      id, nombre: DOMINIOS[id].nombre, peso: DOMINIOS[id].peso,
      nota, evaluable, capado: evaluable && bruto > d.cap,
      criteriosEvaluados: d.evaluados, criteriosAplicables: d.aplicables,
      evidencia, pesoEvaluado: d.pesoEvaluado, pesoAplicable: d.pesoAplicable,
      tramo: evaluable ? tramoDe(nota) : null,
    });

    if (evaluable) { numerador += nota * DOMINIOS[id].peso; pesoTotal += DOMINIOS[id].peso; }
    if (d.pesoAplicable > 0) {
      evidPond += DOMINIOS[id].peso * (d.pesoEvaluado / d.pesoAplicable);
      pesoEvid += DOMINIOS[id].peso;
    }
  }

  const global = pesoTotal ? Math.round(Math.min(numerador / pesoTotal, capGlobal)) : null;

  // Evidencia global: que parte del modelo aplicable se ha comprobado de
  // verdad, ponderada por el peso de cada dominio.
  //
  // Sustituye a la `cobertura` anterior, que contaba el peso de los dominios
  // con ALGUN criterio evaluado: un dominio con un criterio de diez contaba
  // ahi por su peso entero, y por eso un cliente del que apenas se sabia nada
  // salia con cobertura 92% y nota 100. Esta no se deja enganar: ese mismo
  // cliente sale por debajo del 10%.
  const evidencia = pesoEvid ? Math.round((evidPond / pesoEvid) * 100) : 0;

  // La nota se devuelve siempre —durante la visita sirve de progreso, y sube
  // segun se completa— pero solo es fiable con evidencia suficiente y sin
  // secciones sin decidir. La interfaz decide como presentarla; el motor solo
  // lo declara.
  const fiable = global !== null && evidencia >= EVIDENCIA_MINIMA && sinResponder.length === 0;

  return {
    version: SCORE_MODEL_VERSION,
    nota: global,
    fiable,
    sinResponder,
    evidenciaMinima: EVIDENCIA_MINIMA,
    tramo: global === null ? null : tramoDe(global),
    capadaGlobal: global !== null && capGlobal < 100,
    evidencia,
    dominios: dominios.sort((a, b) => b.peso - a.peso),
    hallazgos,
    // Comprobaciones criticas que aplicaban y nadie hizo. No tocan la nota,
    // pero impiden decir "sin hallazgos criticos" sobre lo que no se ha mirado.
    capadoresPendientes,
  };
}
