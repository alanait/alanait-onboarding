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
import { LITERALES_NO_APLICA, LITERALES_SIN_COMPROBAR, CAMPOS_PADRE_SIN_CRITERIO, MOTIVO_OTRO, CONTRADICCIONES } from "./criterios.js";
import { FIN_SOPORTE, soporteDe } from "./soporteSO.js";

const vacio = (v) => v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);

/**
 * Un campo PADRE que nadie ha decidido todavia. No es lo mismo que `vacio`:
 * contestar "No revisado" es exactamente el mismo estado de conocimiento que
 * dejarlo en blanco -no lo he mirado- y el modelo ya declara en
 * LITERALES_SIN_COMPROBAR que los dos tienen que valer igual, "porque si
 * valieran distinto el tecnico aprenderia a no tocar el desplegable".
 *
 * En un padre no valian igual, y la diferencia iba en el sentido peor. Medido
 * sobre un cliente perfecto que declara su NAS y reconoce no haberlo mirado:
 *
 *   "Si" + los 4 hijos sin mirar (honesto)   nota  94, fiable, 2 capadores pendientes
 *   padre en blanco                          nota 100, NO fiable
 *   padre "No revisado" (el mismo saber)     nota 100, FIABLE, 0 pendientes
 *
 * O sea: tocar el desplegable para decir que no lo has mirado cerraba el `dep`
 * de los hijos, los sacaba del denominador con sus dos capadores dentro, y
 * ademas devolvia el sello de fiable que el blanco si retiene. Salia mas a
 * cuenta que decir la verdad.
 */
const sinDecidir = (v) => vacio(v) || (!Array.isArray(v) && LITERALES_SIN_COMPROBAR.includes(v));

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
  // Cada entrada exige TAMBIEN que su propio dep se cumpla ahora mismo, no solo
  // que el campo tenga un valor. Sin eso, un tecnico que cambia so_familia de
  // "Windows Server" a "Linux" deja un valor fosil en so_windows_server; leerlo
  // sin comprobar el dep colaba ese fosil como si decidiera, y silenciaba
  // srv_so_soporte por un dato que ya no aplica.
  //
  // Cuando la version no decide -macOS, "Otro", o una distribucion de Linux
  // cuya version menor no recoge el desplegable- la pregunta sigue haciendo
  // falta y el criterio se comporta como cualquier otro.
  if (criterio.redundanteSi?.some(r => leer(r.dep.field) === r.dep.value && FIN_SOPORTE[leer(r.campo)] !== undefined)) return { tipo: "noaplica" };

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
  // `declaradoSinComprobar` distingue las dos formas de entrar por `computa`.
  // "No revisado" en red_rdp puntua 0 -esa es la excepcion acordada y no se
  // toca- pero NO es una comprobacion hecha, asi que no puede cerrar el
  // capador pendiente. Sin esta marca, las fichas 03 y 04 salian con CERO
  // comprobaciones criticas pendientes teniendo el RDP y el panel de licencias
  // sin mirar, y el informe podia imprimirlo por encima.
  if (criterio.computa?.includes(v) && criterio.mapa && v in criterio.mapa) return { tipo: "valor", valor: criterio.mapa[v], declaradoSinComprobar: LITERALES_SIN_COMPROBAR.includes(v) };
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
export function computeScore({ formData = {}, sectionEnabled = {}, instanceCounts = {}, criterios = [], precondiciones = [], contradiccionesDef = CONTRADICCIONES, fecha = "" }) {
  const porDominio = {};
  // `pesoAplicable` (el denominador de la nota) es el peso de los criterios que
  // le tocaban a este cliente, contestados o no. `pesoEvaluado` es el de los
  // que ademas se comprobaron. La distancia entre ambos es la evidencia que
  // falta, y es justo lo que antes desaparecia del cociente.
  for (const d of Object.keys(DOMINIOS)) {
    porDominio[d] = { suma: 0, pesoEvaluado: 0, pesoAplicable: 0, cap: 100, evaluados: 0, aplicables: 0, pesoRetirado: 0, pesoRetiradoDeclarado: 0 };
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

  // ── Declaracion de inexistencia ──────────────────────────────────────────
  // Marcar "no" una seccion retira su peso del modelo. Eso es CORRECTO cuando
  // el "no" es verdad -un cliente todo-cloud no tiene servidores- y por eso
  // estas secciones no llevan precondicion (D13). Lo que no puede pasar es que
  // el clic valga por si solo como comprobacion: hasta 2.5.0 negar una seccion
  // SUBIA la evidencia, que es lo que abre el sello de fiable, asi que el atajo
  // hacia que el informe pareciera MAS fiable, no menos. Medido sobre una
  // visita a medias, negar las cuatro movia `fiable` de false a true en las
  // cinco fichas de ejemplo.
  //
  // La regla nueva es la regla 1 aplicada un piso mas arriba: la evidencia mide
  // lo que queda ESCRITO, no lo que sale del denominador. Un "no" con motivo es
  // una declaracion que se imprime en el informe y cuenta como evidencia
  // aportada; un "no" a secas no deja nada escrito, asi que cuenta en el
  // denominador de la evidencia valiendo 0, igual que un campo en blanco.
  const motivoDe = (s) => ({
    motivo: String(formData[s]?.[0]?.sin_servicio_motivo ?? "").trim(),
    detalle: String(formData[s]?.[0]?.sin_servicio_detalle ?? "").trim(),
  });
  const estaDeclarada = (s) => {
    const { motivo, detalle } = motivoDe(s);
    return !!motivo && (motivo !== MOTIVO_OTRO || detalle.length > 0);
  };

  // Secciones cuyo "no" retira peso del modelo y no produce por si solo ningun
  // texto en el informe. Las que tienen precondicion quedan fuera: su "no" ya
  // es un hallazgo escrito, que es exactamente la evidencia que se les pide.
  //
  // Se deriva de los `criterios` y `precondiciones` QUE LA FUNCION RECIBE, no
  // del modelo real: los modelos sinteticos de las pruebas darian incoherencias
  // si se mirara el catalogo global.
  const conPrecondicion = new Set(precondiciones.filter(p => p.cuando === "no").map(p => p.seccion));
  const declarables = [...new Set(criterios.flatMap(c => [c.seccion, c.depSeccion?.seccion]).filter(Boolean))]
    .filter(s => !conPrecondicion.has(s)).sort();

  // Peso NOMINAL de cada seccion declarable, por dominio: lo que se retira del
  // modelo al marcarla "no". Se cuenta sin mirar los dep de instancia, porque
  // al negar la seccion no hay respuestas que leer. Es una constante del
  // modelo: no depende de lo contestado, asi que no se puede mover contestando.
  const pesoNominal = {};
  for (const c of criterios) {
    for (const s of new Set([c.seccion, c.depSeccion?.seccion].filter(Boolean))) {
      ((pesoNominal[s] ??= {})[c.dominio] ??= 0);
      pesoNominal[s][c.dominio] += c.peso;
    }
  }

  const declaradas = [], negadasSinMotivo = [];
  for (const s of declarables) {
    if (sectionEnabled[s] !== "no") continue;
    (estaDeclarada(s) ? declaradas : negadasSinMotivo).push(s);
  }
  for (const s of [...declaradas, ...negadasSinMotivo]) {
    const cuenta = declaradas.includes(s);
    for (const [dom, peso] of Object.entries(pesoNominal[s] ?? {})) {
      porDominio[dom].pesoRetirado += peso;
      if (cuenta) porDominio[dom].pesoRetiradoDeclarado += peso;
    }
  }

  // ── Contradicciones ──────────────────────────────────────────────────────
  // Una seccion declarada inexistente contra una respuesta de OTRA seccion que
  // dice lo contrario. No se afirma nada sobre el cliente -no se dice "este
  // cliente tiene servidores"-: se dice que el formulario se contradice a si
  // mismo, que es un hecho del formulario y no una acusacion (D6). Por eso no
  // generan hallazgo ni tocan la nota: solo retienen el sello hasta que alguien
  // decida cual de las dos respuestas es la buena.
  const contradicciones = [];
  for (const k of contradiccionesDef) {
    // Las reglas son simetricas a proposito: tambien se comprueba el caso
    // contrario ("hay VPN" contra "no hay VPNs" en el firewall). Sin esa mitad,
    // la salida barata de una contradiccion seria mentir en la senal, que es
    // justo el patron que este proyecto lleva cuatro veces corrigiendo.
    if (sectionEnabled[k.seccion] !== (k.cuando ?? "no")) continue;
    if (sectionEnabled[k.senal.seccion] !== "si") continue;
    const nSenal = Math.max(1, instanceCounts[k.senal.seccion] || 1);
    for (let i = 0; i < nSenal; i++) {
      const leer = (campo) => formData[k.senal.seccion]?.[i]?.[campo] ?? "";
      if (k.senal.dep && leer(k.senal.dep.field) !== k.senal.dep.value) continue;
      if (k.senal.valores.includes(leer(k.senal.campo))) {
        contradicciones.push({ id: k.id, seccion: k.seccion, senal: k.senal.seccion, campo: k.senal.campo, texto: k.texto });
        break;
      }
    }
  }

  // ── Precondiciones de seccion ────────────────────────────────────────────
  // "No tiene backup" no es un dato que falte: es el hallazgo.
  for (const p of precondiciones) {
    if (sectionEnabled[p.seccion] !== p.cuando) continue;
    // Una precondicion se puede eximir si OTRA respuesta hace que el "no" sea
    // legitimo en vez de una carencia: sin servidores ni NAS que proteger, no
    // tener SAI no es un hallazgo (ver sin_sai). Sin esta salida, "sin SAI"
    // pesaria igual para la nave con un rack lleno que para la oficina 100%
    // cloud, y el proyecto ya penalizo una vez de mas a ese segundo caso.
    if (p.salvoSi && sectionEnabled[p.salvoSi.seccion] === p.salvoSi.cuando) continue;
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
    // Un criterio puede colgar de OTRA seccion: av_servidores mide el antivirus
    // pero solo tiene sentido si hay servidores que cubrir. Sin esto, negar
    // "servidores" dejaba un dominio de 11 puntos decidido por un unico campo
    // que ya no tenia forma honesta de contestarse: "No" (la verdad) daba 0 y
    // "Si" (mentira) daba 100. El todo-cloud honesto pagaba 11 puntos.
    if (c.depSeccion && sectionEnabled[c.depSeccion.seccion] !== "si") continue;

    const n = Math.max(1, instanceCounts[c.seccion] || 1);
    const d = porDominio[c.dominio];
    const valores = [];
    let aplicables = 0, evaluadas = 0, declaradasSinMirar = 0;

    for (let i = 0; i < n; i++) {
      const leer = (campo) => formData[c.seccion]?.[i]?.[campo] ?? "";
      const e = estadoEnInstancia(c, leer, fecha);
      if (e.tipo === "noaplica") { valores.push(null); continue; }
      aplicables++;
      if (e.tipo === "valor") { evaluadas++; if (e.declaradoSinComprobar) declaradasSinMirar++; valores.push(e.valor); }
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

    // El disparo del cap sigue la MISMA logica de agregacion que la nota, no
    // "cualquier instancia" a secas. Con `min` (peor manda) basta una instancia
    // critica: sai_existe agrega por `max` a proposito -"basta un armario
    // bueno"- y antes CUALQUIER instancia en "No" capaba el dominio igual que
    // con `min`, contradiciendo su propio porQue: un armario secundario sin SAI
    // no puede capar el dominio si el principal si lo tiene.
    // Se lee con el mismo filtro que el resto: un valor fosil de un campo
    // oculto por su `dep` no puede capar un dominio entero.
    if (c.critico) {
      const crudos = Array.from({ length: n }, (_, i) => valorCrudoEfectivo(c, (campo) => formData[c.seccion]?.[i]?.[campo] ?? ""))
        .filter(v => v !== null);
      const disparado = crudos.length > 0 && (c.agregacion === "max"
        ? crudos.every(v => c.critico.cuando.includes(v))
        : crudos.some(v => c.critico.cuando.includes(v)));
      if (disparado) {
        hallazgos.push({ id: c.id, dominio: c.dominio, gravedad: "critico", texto: c.porQue });
        if (c.critico.capDominio !== undefined) d.cap = Math.min(d.cap, c.critico.capDominio);
        if (c.critico.capGlobal !== undefined) capGlobal = Math.min(capGlobal, c.critico.capGlobal);
      } else if (evaluadas - declaradasSinMirar < aplicables) {
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
    // El denominador de la evidencia incluye el peso retirado del modelo por
    // declarar una seccion inexistente, y el numerador solo lo suma si esa
    // declaracion lleva motivo. Con motivo la evidencia sale igual que antes
    // -el todo-cloud honesto no paga nada-; sin motivo sale igual que si la
    // seccion estuviera abierta y en blanco, que es lo que de verdad es.
    const denomEvid = d.pesoAplicable + d.pesoRetirado;
    const numEvid = d.pesoEvaluado + d.pesoRetiradoDeclarado;
    const evidencia = denomEvid > 0 ? Math.round((numEvid / denomEvid) * 100) : null;

    dominios.push({
      id, nombre: DOMINIOS[id].nombre, peso: DOMINIOS[id].peso,
      nota, evaluable, capado: evaluable && bruto > d.cap,
      criteriosEvaluados: d.evaluados, criteriosAplicables: d.aplicables,
      evidencia, pesoEvaluado: d.pesoEvaluado, pesoAplicable: d.pesoAplicable,
      pesoRetirado: d.pesoRetirado, pesoRetiradoDeclarado: d.pesoRetiradoDeclarado,
      tramo: evaluable ? tramoDe(nota) : null,
    });

    if (evaluable) { numerador += nota * DOMINIOS[id].peso; pesoTotal += DOMINIOS[id].peso; }
    if (denomEvid > 0) {
      evidPond += DOMINIOS[id].peso * (numEvid / denomEvid);
      pesoEvid += DOMINIOS[id].peso;
    }
  }

  // ── Campos padre sin decidir ─────────────────────────────────────────────
  // backup.repo_dedicado, servidores.so_familia, licenciamiento.tipo_servicio,
  // servidores.tipo, email.proveedor y pcs.moviles no puntuan por si mismos
  // -solo deciden si puntuan otros campos-, asi que dejarlos en blanco no
  // tocaba ni la nota ni la fiabilidad: quedaba igual que contestarlos. No se
  // toca la nota aqui -el orden de incentivos de los campos hijos ya es el
  // correcto, ver KNOWN_ISSUES A2- pero silencio en el padre deja de ser
  // gratis del todo: retrasa el sello de fiable igual que una seccion sin
  // decidir.
  //
  // Lista, no contador: sin saber CUALES faltan, ni el informe ni el panel
  // pueden explicar por que no hay nota cuando la evidencia ya llega al 100%.
  const padresSinDecidir = [];
  for (const clave of CAMPOS_PADRE_SIN_CRITERIO) {
    const [seccion, campo] = clave.split(".");
    if (sectionEnabled[seccion] !== "si") continue;
    const n = Math.max(1, instanceCounts[seccion] || 1);
    for (let i = 0; i < n; i++) {
      if (sinDecidir(formData[seccion]?.[i]?.[campo] ?? "")) padresSinDecidir.push({ seccion, campo, instancia: n > 1 ? i + 1 : null });
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
  // Dos bloqueos nuevos, del mismo tipo que los que ya habia: no son hallazgos
  // sobre el cliente, son estados del FORMULARIO que impiden publicar la nota.
  // Negar una seccion sin decir por que deja de ser gratis; y un formulario que
  // se contradice no se sella hasta que alguien decida cual respuesta es buena.
  const fiable = global !== null && evidencia >= EVIDENCIA_MINIMA
    && sinResponder.length === 0 && padresSinDecidir.length === 0
    && negadasSinMotivo.length === 0 && contradicciones.length === 0;

  // POR QUE no es fiable, decidido UNA sola vez y aqui.
  //
  // El orden es parte del diseno, no un detalle de implementacion. Ya costo un
  // error real: al anadir `padresSinDecidir` se le dio prioridad sobre la
  // evidencia y el PDF de un cliente con el 13% comprobado decia "faltan 4
  // campos", dando a entender que contestarlos bastaba, cuando el problema era
  // el 87% sin mirar. La evidencia manda siempre que sea ella la que no llega.
  //
  // Se calcula en el motor y no en cada consumidor porque `informe.js` y
  // `ReportPanel.jsx` ya rederivaban esta cascada por separado y ya diferian.
  // Con los motivos nuevos serian cinco copias de la misma regla.
  const motivoNoFiable = fiable ? null
    : global === null ? "sin_nota"
    : sinResponder.length ? "secciones"
    : evidencia < EVIDENCIA_MINIMA ? "evidencia"
    : contradicciones.length ? "contradicciones"
    : negadasSinMotivo.length ? "sin_motivo"
    : padresSinDecidir.length ? "padres"
    : null;

  return {
    version: SCORE_MODEL_VERSION,
    nota: global,
    fiable,
    motivoNoFiable,
    sinResponder,
    padresSinDecidir,
    // Secciones que el tecnico declara inexistentes, con su motivo escrito y el
    // peso de modelo que retiran. El informe las imprime SIEMPRE y de forma
    // visible: aunque no cuesten nota, el lector tiene que poder ver que parte
    // del modelo se ha retirado por declaracion y no por comprobacion.
    seccionesDeclaradas: declaradas.map(s => ({
      seccion: s, ...motivoDe(s),
      peso: Object.values(pesoNominal[s] ?? {}).reduce((a, v) => a + v, 0),
    })),
    negadasSinMotivo,
    contradicciones,
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
