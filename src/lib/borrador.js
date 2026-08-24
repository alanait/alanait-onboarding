// Borrador local de la visita en curso.
//
// POR QUE EXISTE. Hasta ahora la visita entera vivia en memoria de React: un
// cierre de pestana, un cuelgue del navegador o una bateria agotada a mitad de
// una visita de dos horas se llevaba el trabajo completo. El aviso de
// `beforeunload` que se anadio antes convierte el cierre en una decision del
// tecnico, pero no salva nada cuando el navegador se muere solo. Esto si.
//
// POR QUE localStorage Y NO INDEXEDDB. localStorage es sincrono, asi que se
// puede escribir dentro de `pagehide` -el ultimo momento en que el navegador
// deja correr codigo- y en un cierre brusco eso es justo lo que hace falta.
// IndexedDB es asincrono y en ese instante no garantiza que la escritura llegue
// a completarse. El precio es el cupo: ~5 MB por origen, y una sola captura en
// base64 puede ocupar 2 MB. De ahi el aligerado por niveles de abajo.
//
// LO QUE NUNCA HACE. No se inventa que ha guardado lo que no cabia. Si hay que
// dejar capturas fuera lo dice contandolas, para que el tecnico sepa que le
// falta al recuperar en vez de descubrirlo al imprimir el informe.

export const CLAVE_BORRADOR = "alanait_borrador";

// Sube cuando cambie la FORMA de lo guardado. Un borrador de otra version se
// descarta en vez de intentar interpretarlo: recuperar mal una visita es peor
// que no recuperarla, porque el tecnico da por bueno lo que ve en pantalla.
export const VERSION_BORRADOR = 1;

const almacen = (s) => s ?? (typeof localStorage !== "undefined" ? localStorage : null);

/** Una captura pesa si su contenido va incrustado; una URL firmada no. */
const esIncrustada = (img) => typeof img?.src === "string" && img.src.startsWith("data:");

/**
 * Quita peso a las capturas en dos escalones, del menos al mas destructivo.
 *
 *   nivel 1  fuera las incrustadas (las que aun no estan en la nube). Las que
 *            ya se subieron conservan su URL firmada, que es texto corto y
 *            sigue sirviendo mientras no caduque.
 *   nivel 2  fuera todas.
 *
 * Devuelve las capturas que sobreviven y cuantas se han dejado fuera, porque
 * ese numero es la unica forma honesta de avisar al recuperar.
 */
function aligerar(sectionImages, nivel) {
  const resultado = {};
  let omitidas = 0;
  for (const [seccion, imagenes] of Object.entries(sectionImages || {})) {
    const quedan = (imagenes || []).filter(img => {
      if (nivel >= 2) return false;
      return !esIncrustada(img);
    });
    omitidas += (imagenes || []).length - quedan.length;
    if (quedan.length) resultado[seccion] = quedan;
  }
  return { sectionImages: resultado, omitidas };
}

/** Estado de la visita tal y como se guarda. `ahora` entra por parametro: sin reloj interno se puede probar. */
export function construirBorrador(estado, ahora) {
  return {
    version: VERSION_BORRADOR,
    guardadoEn: ahora,
    clienteId: estado.currentClientId ?? null,
    ficheroActual: estado.currentFilePath ?? null,
    empresa: estado.clientData?.empresa || "",
    capturasOmitidas: 0,
    clientData: estado.clientData || {},
    sectionEnabled: estado.sectionEnabled || {},
    formData: estado.formData || {},
    instanceCounts: estado.instanceCounts || {},
    sectionImages: estado.sectionImages || {},
  };
}

/**
 * Escribe el borrador, aligerando las capturas solo si no cabe.
 *
 * El cupo de localStorage no se puede consultar: la unica forma fiable de saber
 * si algo cabe es intentar escribirlo y ver si revienta. Por eso son tres
 * intentos y no un calculo de tamano.
 *
 * @returns {{guardado: boolean, capturasOmitidas: number, error?: string}}
 */
export function guardarBorrador(estado, ahora, storage) {
  const s = almacen(storage);
  if (!s) return { guardado: false, capturasOmitidas: 0, error: "sin almacenamiento" };

  const base = construirBorrador(estado, ahora);

  for (let nivel = 0; nivel <= 2; nivel++) {
    const { sectionImages, omitidas } = nivel === 0
      ? { sectionImages: base.sectionImages, omitidas: 0 }
      : aligerar(base.sectionImages, nivel);
    const candidato = { ...base, sectionImages, capturasOmitidas: omitidas };
    try {
      s.setItem(CLAVE_BORRADOR, JSON.stringify(candidato));
      return { guardado: true, capturasOmitidas: omitidas };
    } catch (err) {
      // Solo se reintenta aligerando si el problema es el cupo. Cualquier otro
      // fallo (modo privado que bloquea el almacen, permisos) no se arregla
      // quitando fotos y reintentar solo retrasa el aviso.
      const porCupo = err?.name === "QuotaExceededError"
        || err?.name === "NS_ERROR_DOM_QUOTA_REACHED"
        || err?.code === 22;
      if (!porCupo) return { guardado: false, capturasOmitidas: 0, error: String(err?.message || err) };
      if (nivel === 2) return { guardado: false, capturasOmitidas: omitidas, error: "no cabe en el navegador" };
    }
  }
  return { guardado: false, capturasOmitidas: 0, error: "no cabe en el navegador" };
}

/** Devuelve el borrador guardado, o null si no hay, esta corrupto o es de otra version. */
export function leerBorrador(storage) {
  const s = almacen(storage);
  if (!s) return null;
  let crudo;
  try { crudo = s.getItem(CLAVE_BORRADOR); } catch { return null; }
  if (!crudo) return null;
  try {
    const b = JSON.parse(crudo);
    if (!b || b.version !== VERSION_BORRADOR) return null;
    return b;
  } catch {
    return null;
  }
}

export function borrarBorrador(storage) {
  const s = almacen(storage);
  if (!s) return;
  try { s.removeItem(CLAVE_BORRADOR); } catch {}
}

/**
 * Un borrador solo merece ofrecerse si contiene trabajo de verdad. Recien
 * abierta la app, la ficha ya tiene la fecha de hoy puesta: ofrecer recuperar
 * eso ensena al tecnico a decir que no al aviso, y el dia que importe tambien
 * dira que no.
 */
export function borradorTieneContenido(b) {
  if (!b) return false;
  if (Object.keys(b.sectionEnabled || {}).length) return true;
  if (Object.keys(b.formData || {}).length) return true;
  const datos = b.clientData || {};
  return Object.entries(datos).some(([campo, v]) => campo !== "fecha" && String(v || "").trim() !== "");
}

/** "hace 3 minutos" para el aviso de recuperacion. Ambas fechas por parametro: probable sin reloj. */
export function haceCuanto(guardadoEn, ahora) {
  const t0 = Date.parse(guardadoEn), t1 = Date.parse(ahora);
  if (!Number.isFinite(t0) || !Number.isFinite(t1)) return "";
  const min = Math.max(0, Math.round((t1 - t0) / 60000));
  if (min < 1) return "hace unos segundos";
  if (min === 1) return "hace 1 minuto";
  if (min < 60) return `hace ${min} minutos`;
  const h = Math.round(min / 60);
  if (h === 1) return "hace 1 hora";
  if (h < 24) return `hace ${h} horas`;
  const d = Math.round(h / 24);
  return d === 1 ? "hace 1 día" : `hace ${d} días`;
}
