// Registro de auditoria: quien hizo que y cuando.
//
// QUE PARTE HACE ESTE FICHERO, Y QUE PARTE NO. Todo lo que toca la base de
// datos -crear, modificar y borrar fichas, subir y borrar capturas- lo registra
// la PROPIA BASE con triggers (supabase-auditoria.sql). Eso no se puede omitir
// ni falsear desde el navegador, y por eso son los asientos que valen como
// prueba: van marcados `origin = 'base'`.
//
// Aqui solo se declaran los eventos que ningun trigger puede ver, porque no
// mutan nada: abrir una ficha, generar el PDF, exportar un .alanait y restaurar
// una version. Van marcados `origin = 'app'`, y la politica de la tabla impide
// que el navegador escriba otra cosa. Es la misma disciplina que el resto del
// proyecto: no presentar como comprobado lo que solo esta declarado.
//
// NUNCA LANZA. Un fallo del registro no puede tumbar un guardado: el trabajo
// del tecnico vale mas que su traza. Esto NO contradice la decision de que un
// fallo al subir una captura si es un error visible (DECISIONS D19): alli lo
// que se perdia era la captura del cliente; aqui lo autoritativo lo escriben
// los triggers y esto es el complemento declarado.
//
// TAMPOCO GUARDA CONTENIDO DEL FORMULARIO. Ni valores, ni notas, ni nombres de
// campo: solo ids de seccion, numero de version y contadores. Las respuestas y
// las capturas llevan credenciales y datos bancarios de los clientes, y un
// registro que los copia multiplica el problema que vigila.

import { supabase, isSupabaseConfigured } from './supabase.js';

/** Eventos que la aplicacion puede declarar. La base rechaza cualquier otro. */
export const EVENTOS = ['ficha_abierta', 'pdf_generado', 'fichero_exportado', 'version_restaurada'];

/**
 * Deja constancia de un evento. No se espera al resultado en la interfaz: el
 * tecnico no tiene por que esperar a que se escriba una traza.
 *
 * @param {string} accion  uno de EVENTOS
 * @param {{clientId?: string, empresa?: string, detalle?: object}} datos
 */
export async function registrarEvento(accion, { clientId = null, empresa = '', detalle = {} } = {}) {
  if (!isSupabaseConfigured()) return;
  if (!EVENTOS.includes(accion)) {
    console.error('registrarEvento: accion no declarable', accion);
    return;
  }
  try {
    const { error } = await supabase.from('audit_log').insert({
      action: accion,
      client_id: clientId,
      client_empresa: empresa || '',
      details: detalle || {},
    });
    // Mientras el SQL no este ejecutado, la tabla no existe y esto falla. Es
    // esperado y no rompe nada: se anota en consola y se sigue.
    if (error) console.error('auditoria:', error.message);
  } catch (err) {
    console.error('auditoria:', err?.message || err);
  }
}
