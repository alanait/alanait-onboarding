// Manual del tecnico: como se usa la aplicacion durante una visita.
//
// POR QUE VIVE DENTRO DE LA APP Y NO EN UN PDF O UNA WIKI. Lo que aqui se
// explica -que solo 105 de los 280 campos mueven la nota, que "sin tocar" no es
// una respuesta, que los avisos y los hallazgos son cosas distintas- son
// justamente las dudas que le entran al tecnico CON EL CLIENTE DELANTE. Un
// manual que hay que ir a buscar a otro sitio no se abre en ese momento.
//
// LAS CIFRAS SE DERIVAN, NO SE ESCRIBEN A MANO. Las de secciones, campos y
// dominios salen de SECTIONS, CAMPOS_QUE_PUNTUAN y DOMINIOS, asi que el dia que
// se anada un criterio el manual no empieza a mentir en silencio. Es el mismo
// motivo por el que el informe se construye con los datos y no a mano.
//
// Estilos con un <style> propio y prefijo `mn-` en vez de estilos en linea:
// aqui hay texto largo con jerarquia de verdad, y hacerlo en linea seria
// ilegible. El prefijo evita que choque con nada.

import React from "react";
import { C, FUENTE } from "../theme.js";
import { SECTIONS } from "../sections.js";
import { CAMPOS_QUE_PUNTUAN, PRECONDICIONES, MOTIVOS_INEXISTENCIA, CRITERIOS } from "../score/criterios.js";
import { DOMINIOS, TRAMOS, EVIDENCIA_MINIMA, SCORE_MODEL_VERSION } from "../score/dominios.js";
import { HINTS, TIPOS_HINT } from "../hints.js";

const MONO = "ui-monospace, 'Cascadia Mono', 'Segoe UI Mono', Consolas, monospace";

/** Los tres tipos de seccion, derivados del modelo y no de una lista a mano. */
function clasificar() {
  const conPrecondicion = new Set(PRECONDICIONES.filter(p => p.cuando === "no").map(p => p.seccion));
  const filas = SECTIONS.map(s => {
    const campos = s.fields.filter(f => !f.soloSiNo);
    const puntuan = campos.filter(f => CAMPOS_QUE_PUNTUAN.has(`${s.id}.${f.id}`)).length;
    const tipo = conPrecondicion.has(s.id) ? "riesgo"
      : MOTIVOS_INEXISTENCIA[s.id] ? "declarar"
      : "inventario";
    return { id: s.id, label: s.label, icon: s.icon, campos: campos.length, puntuan, tipo };
  });
  // Orden del manual: primero lo que mas pesa entender, no el orden del menu.
  const rango = { riesgo: 0, declarar: 1, inventario: 2 };
  return filas.sort((a, b) => rango[a.tipo] - rango[b.tipo] || b.puntuan - a.puntuan);
}

const ETIQUETA_TIPO = {
  riesgo: "Hallazgo crítico",
  declarar: "Pide motivo",
  inventario: "Solo inventario",
};

export default function Manual({ onClose }) {
  const filas = clasificar();
  const totalCampos = filas.reduce((n, f) => n + f.campos, 0);
  const totalPuntuan = CAMPOS_QUE_PUNTUAN.size;
  const soloInventario = totalCampos - totalPuntuan;
  const porTipo = (t) => filas.filter(f => f.tipo === t);

  const dominios = Object.entries(DOMINIOS)
    .map(([id, d]) => ({ id, ...d }))
    .sort((a, b) => b.peso - a.peso);
  const pesoMayor = dominios[0].peso;

  const avisos = Object.values(HINTS).flat();
  const cuentaAviso = (tipo) => avisos.filter(h => h.tipo === tipo).length;

  // Los tramos del semaforo, con el rango escrito a partir del anterior.
  const tramos = TRAMOS.map((t, i) => ({
    ...t,
    desde: i === 0 ? 0 : TRAMOS[i - 1].hasta + 1,
    color: t.nivel === "bajo" ? C.green : t.nivel === "medio" ? C.amber : C.red,
  }));

  return (
    <div className="mn-fondo" role="dialog" aria-modal="true" aria-label="Manual del técnico">
      <style>{`
        .mn-fondo {
          position: fixed; inset: 0; z-index: 99999;
          background: rgba(15, 22, 40, 0.55);
          display: flex; align-items: flex-start; justify-content: center;
          padding: 28px 16px;
          font-family: ${FUENTE};
          overflow-y: auto;
        }
        .mn-hoja {
          background: #fff; width: 100%; max-width: 1040px;
          border-radius: 14px; box-shadow: 0 24px 70px rgba(0,0,0,0.32);
          overflow: hidden;
        }

        .mn-portada {
          background: ${C.blueLight};
          border-bottom: 1px solid ${C.blueBorder};
          padding: 34px 40px 32px;
          position: relative;
        }
        .mn-marca {
          font-size: 11px; font-weight: 500; letter-spacing: 0.18em;
          text-transform: uppercase; color: ${C.blue}; margin: 0 0 12px;
        }
        .mn-portada h1 {
          font-size: 30px; font-weight: 300; line-height: 1.1; letter-spacing: -0.015em;
          color: ${C.navy}; margin: 0 0 14px; max-width: 20ch;
        }
        .mn-entradilla { margin: 0; max-width: 62ch; font-size: 15px; line-height: 1.6; color: ${C.text}; }
        .mn-cerrar {
          position: absolute; top: 20px; right: 22px;
          background: rgba(255,255,255,0.75); border: 1px solid ${C.blueBorder};
          color: ${C.navy}; width: 32px; height: 32px; border-radius: 8px;
          font-size: 17px; line-height: 1; cursor: pointer; font-family: inherit;
        }
        .mn-cerrar:hover { background: #fff; }

        .mn-cuerpo { padding: 8px 40px 44px; }
        .mn-bloque { margin-top: 44px; }
        .mn-rotulo {
          font-size: 10.5px; font-weight: 500; letter-spacing: 0.16em;
          text-transform: uppercase; color: ${C.textLight}; margin: 0 0 8px;
        }
        .mn-hoja h2 {
          font-size: 22px; font-weight: 400; line-height: 1.2; letter-spacing: -0.01em;
          color: ${C.navy}; margin: 0 0 6px;
        }
        .mn-hoja h3 { font-size: 15px; font-weight: 500; color: ${C.navy}; margin: 0 0 6px; line-height: 1.3; }
        .mn-bajada { color: ${C.textLight}; max-width: 64ch; margin: 0 0 22px; font-size: 14.5px; line-height: 1.6; }
        .mn-cuerpo p { font-size: 14.5px; line-height: 1.65; margin: 0 0 14px; }
        .mn-columna { max-width: 66ch; }
        .mn-cuerpo b, .mn-cuerpo strong { font-weight: 600; }
        .mn-num { font-variant-numeric: tabular-nums; }

        /* Fases de la visita */
        .mn-fases {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(198px, 1fr));
          gap: 1px; background: ${C.border}; border: 1px solid ${C.border};
          border-radius: 10px; overflow: hidden;
        }
        .mn-fase { background: #fff; padding: 18px 18px 20px; }
        .mn-fase .mn-orden {
          font-family: ${MONO}; font-size: 10.5px; font-weight: 500; color: ${C.green};
          letter-spacing: 0.08em; display: block; margin-bottom: 8px;
        }
        .mn-fase p { font-size: 13px; color: ${C.textLight}; margin: 0; line-height: 1.55; }

        /* Proporcion de campos */
        .mn-proporcion { border: 1px solid ${C.border}; border-radius: 10px; padding: 22px; }
        .mn-barra { display: flex; height: 30px; border-radius: 6px; overflow: hidden; border: 1px solid ${C.border}; margin-bottom: 12px; }
        .mn-leyenda { display: flex; flex-wrap: wrap; gap: 20px; font-size: 13.5px; }
        .mn-leyenda > div { display: flex; align-items: baseline; gap: 8px; }
        .mn-punto { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; transform: translateY(1px); }

        /* Tarjetas */
        .mn-rejilla { display: grid; grid-template-columns: repeat(auto-fit, minmax(255px, 1fr)); gap: 14px; }
        .mn-tarjeta { border: 1px solid ${C.border}; border-radius: 10px; padding: 18px 18px 20px; border-top-width: 3px; border-top-style: solid; }
        .mn-tarjeta .mn-cuantas { font-size: 32px; font-weight: 300; line-height: 1; font-variant-numeric: tabular-nums; }
        .mn-tarjeta .mn-cuantas span { font-size: 13px; color: ${C.textLight}; margin-left: 6px; }
        .mn-tarjeta h3 { margin: 10px 0 6px; }
        .mn-tarjeta p { font-size: 13px; color: ${C.textLight}; margin: 0 0 12px; line-height: 1.55; }
        .mn-fichas { margin: 0; padding: 0; list-style: none; display: flex; flex-wrap: wrap; gap: 5px; }
        .mn-fichas li { font-size: 11.5px; background: ${C.grayLight}; border: 1px solid ${C.border}; border-radius: 20px; padding: 3px 10px; color: ${C.text}; }

        /* Destacados */
        .mn-nota { border-left: 3px solid ${C.green}; background: ${C.greenLight}; border-radius: 0 10px 10px 0; padding: 16px 20px; }
        .mn-nota .mn-titular { font-weight: 500; color: ${C.green}; font-size: 14.5px; margin-bottom: 4px; }
        .mn-nota p { margin: 0; }
        .mn-alto { border-left: 3px solid ${C.red}; background: ${C.redLight}; border-radius: 0 10px 10px 0; padding: 16px 20px; }
        .mn-alto .mn-titular { font-weight: 500; color: ${C.red}; font-size: 14.5px; margin-bottom: 4px; }
        .mn-alto p { margin: 0; }

        /* Botones de ejemplo */
        .mn-boton {
          font-weight: 500; font-size: 13px; border-radius: 7px; padding: 6px 14px;
          align-self: flex-start; border: 1px solid ${C.border}; color: ${C.textLight}; background: ${C.grayLight};
        }
        .mn-caja { border: 1px solid ${C.border}; border-radius: 10px; padding: 18px; display: flex; flex-direction: column; gap: 9px; }
        .mn-caja p { margin: 0; font-size: 13px; color: ${C.textLight}; line-height: 1.55; }
        .mn-caja p.mn-que { color: ${C.text}; font-size: 14px; }

        /* Panel */
        .mn-cifra { font-size: 34px; font-weight: 300; line-height: 1; font-variant-numeric: tabular-nums; }
        .mn-cifra small { font-size: 14px; color: ${C.textLight}; font-weight: 400; }
        .mn-etiqueta-cifra { font-size: 12px; color: ${C.textLight}; margin: 4px 0 12px; }

        /* Dominios */
        .mn-dominios { display: flex; flex-direction: column; gap: 8px; }
        .mn-dominio { display: grid; grid-template-columns: minmax(140px, 190px) 1fr auto; gap: 12px; align-items: center; }
        .mn-dominio .mn-nombre { font-size: 13.5px; }
        .mn-pista { height: 11px; background: ${C.grayLight}; border: 1px solid ${C.border}; border-radius: 3px; overflow: hidden; }
        .mn-relleno { height: 100%; background: ${C.blue}; }
        .mn-dominio .mn-peso { font-family: ${MONO}; font-size: 12px; color: ${C.textLight}; font-variant-numeric: tabular-nums; min-width: 34px; text-align: right; }

        /* Semaforo */
        .mn-semaforo { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1px; background: ${C.border}; border: 1px solid ${C.border}; border-radius: 10px; overflow: hidden; }
        .mn-tramo { background: #fff; padding: 14px 16px 16px; border-top: 4px solid; }
        .mn-tramo .mn-rango { font-family: ${MONO}; font-size: 12.5px; color: ${C.textLight}; font-variant-numeric: tabular-nums; }
        .mn-tramo .mn-nivel { font-weight: 500; font-size: 14.5px; margin-top: 2px; }

        /* Contraste hallazgos / avisos */
        .mn-lado { border: 1px solid ${C.border}; border-radius: 10px; overflow: hidden; }
        .mn-lado .mn-cabeza { padding: 13px 18px; border-bottom: 1px solid ${C.border}; }
        .mn-lado .mn-cabeza h3 { margin: 0 0 2px; }
        .mn-lado .mn-cabeza p { margin: 0; font-size: 12.5px; color: ${C.textLight}; }
        .mn-lado .mn-dentro { padding: 15px 18px 18px; }
        .mn-lista { margin: 0; padding-left: 17px; font-size: 13.5px; line-height: 1.55; }
        .mn-lista li { margin-bottom: 6px; }
        .mn-lista li:last-child { margin-bottom: 0; }
        .mn-avisos { display: flex; flex-direction: column; gap: 8px; margin-top: 14px; }
        .mn-aviso { display: grid; grid-template-columns: auto 1fr auto; gap: 10px; align-items: baseline; font-size: 13px; }
        .mn-aviso .mn-nom { font-weight: 500; white-space: nowrap; }
        .mn-aviso .mn-desc { color: ${C.textLight}; }
        .mn-aviso .mn-cuenta { font-family: ${MONO}; font-size: 12px; color: ${C.textLight}; font-variant-numeric: tabular-nums; }

        /* Errores */
        .mn-errores { display: flex; flex-direction: column; gap: 1px; background: ${C.border}; border: 1px solid ${C.border}; border-radius: 10px; overflow: hidden; }
        .mn-error { background: #fff; padding: 15px 20px; }
        .mn-error .mn-mal { font-weight: 500; color: ${C.red}; font-size: 14.5px; display: block; margin-bottom: 3px; }
        .mn-error .mn-bien { font-size: 13.5px; color: ${C.textLight}; line-height: 1.6; }
        .mn-error .mn-bien b { color: ${C.text}; }

        /* Tabla */
        .mn-tabla-caja { overflow-x: auto; border: 1px solid ${C.border}; border-radius: 10px; }
        .mn-tabla { border-collapse: collapse; width: 100%; font-size: 13.5px; }
        .mn-tabla th, .mn-tabla td { text-align: left; padding: 9px 14px; border-bottom: 1px solid ${C.border}; }
        .mn-tabla thead th {
          font-weight: 500; font-size: 10.5px; letter-spacing: 0.11em; text-transform: uppercase;
          color: ${C.textLight}; background: ${C.grayLight}; white-space: nowrap;
        }
        .mn-tabla tbody tr:last-child td { border-bottom: none; }
        .mn-tabla td.mn-n { text-align: right; font-family: ${MONO}; font-size: 12.5px; font-variant-numeric: tabular-nums; }
        .mn-chip { font-size: 11px; padding: 2px 9px; border-radius: 20px; white-space: nowrap; display: inline-block; }

        .mn-pie { margin-top: 40px; padding-top: 18px; border-top: 1px solid ${C.border};
          display: flex; flex-wrap: wrap; gap: 6px 22px; font-family: ${MONO}; font-size: 11.5px; color: ${C.textLight}; }

        @media (max-width: 700px) {
          .mn-portada { padding: 26px 22px 24px; }
          .mn-portada h1 { font-size: 24px; }
          .mn-cuerpo { padding: 4px 22px 34px; }
          .mn-bloque { margin-top: 34px; }
          .mn-dominio { grid-template-columns: 1fr auto; }
          .mn-dominio .mn-pista { grid-column: 1 / -1; }
        }
      `}</style>

      <div className="mn-hoja">

        {/* ── Portada ────────────────────────────────────────────────── */}
        <div className="mn-portada">
          <button className="mn-cerrar" onClick={onClose} title="Cerrar" aria-label="Cerrar el manual">✕</button>
          <p className="mn-marca">ALANA IT · Onboarding técnico</p>
          <h1>Manual del técnico</h1>
          <p className="mn-entradilla">
            Cómo documentar la auditoría de un cliente nuevo <b>durante la visita</b>, qué mueve
            el CiberScore y qué no, y cómo dejar la ficha en condiciones de generar el informe
            antes de salir por la puerta.
          </p>
        </div>

        <div className="mn-cuerpo">

          {/* ── Para qué sirve ───────────────────────────────────────── */}
          <div className="mn-bloque">
            <p className="mn-rotulo">Para qué sirve</p>
            <h2>Una foto técnica del cliente, tomada el día que entra</h2>
            <div className="mn-columna">
              <p>
                Sustituye al checklist en papel y a las notas sueltas. Recoge la infraestructura
                del cliente en <b>{SECTIONS.length} secciones</b>, calcula un <b>CiberScore de 0 a 100</b> con
                lo que se haya comprobado de verdad, y genera un <b>informe PDF</b> con el
                diagnóstico, los hallazgos críticos, el plan de acción y el inventario.
              </p>
              <p>
                Está pensada para rellenarse <b>delante del cliente</b>, no para pasarla a limpio
                luego. Todo lo que apuntes se refleja en el panel de la derecha en el momento,
                así que puedes enseñar el porqué de cada cosa mientras la anotas.
              </p>
            </div>
            <div className="mn-alto mn-columna" style={{ marginTop: 20 }}>
              <div className="mn-titular">El PDF es interno</div>
              <p>
                Lleva oportunidades comerciales, notas del técnico y capturas que pueden incluir
                consolas del proveedor saliente. <b>No se entrega al cliente.</b>
              </p>
            </div>
          </div>

          {/* ── El recorrido ─────────────────────────────────────────── */}
          <div className="mn-bloque">
            <p className="mn-rotulo">El recorrido</p>
            <h2>Una visita, cuatro momentos</h2>
            <p className="mn-bajada">
              El orden importa: decidir primero qué tiene el cliente y rellenar después evita
              recorrer secciones que no le aplican.
            </p>
            <div className="mn-fases">
              <div className="mn-fase">
                <span className="mn-orden">PRIMERO</span>
                <h3>Datos del cliente</h3>
                <p>Empresa, contacto, trabajadores y sedes. La fecha de la visita decide si los
                sistemas están en soporte: déjala correcta.</p>
              </div>
              <div className="mn-fase">
                <span className="mn-orden">DESPUÉS</span>
                <h3>Sí o no a las {SECTIONS.length} secciones</h3>
                <p>Recorre la lista y decide qué tiene el cliente. Es lo que abre cada formulario
                y lo que define el alcance de la auditoría.</p>
              </div>
              <div className="mn-fase">
                <span className="mn-orden">EL GRUESO</span>
                <h3>Rellenar lo que puntúa</h3>
                <p>Sección por sección, empezando por los campos con la marca lateral. Añade
                capturas de todo lo que valga la pena documentar.</p>
              </div>
              <div className="mn-fase">
                <span className="mn-orden">AL CERRAR</span>
                <h3>Guardar y generar el PDF</h3>
                <p>Que no quede ninguna sección sin decidir, guarda, y genera el informe. Revisa
                que la nota no salga como «Provisional».</p>
              </div>
            </div>
          </div>

          {/* ── Lo que puntúa ────────────────────────────────────────── */}
          <div className="mn-bloque">
            <p className="mn-rotulo">Lo primero que hay que saber</p>
            <h2>De {totalCampos} campos, solo {totalPuntuan} mueven la nota</h2>
            <p className="mn-bajada">
              El resto es inventario: marcas, modelos, números de serie, direcciones. Hace falta
              para documentar al cliente, pero no cambia el CiberScore ni un punto.
            </p>
            <div className="mn-proporcion">
              <div className="mn-barra" role="img" aria-label={`${totalPuntuan} de ${totalCampos} campos mueven la nota`}>
                <div style={{ background: C.green, flex: totalPuntuan }} />
                <div style={{ background: C.grayLight, flex: soloInventario }} />
              </div>
              <div className="mn-leyenda">
                <div>
                  <span className="mn-punto" style={{ background: C.green }} />
                  <span><b className="mn-num">{totalPuntuan}</b> campos mueven la nota</span>
                </div>
                <div>
                  <span className="mn-punto" style={{ background: C.grayLight, border: `1px solid ${C.border}` }} />
                  <span><b className="mn-num">{soloInventario}</b> campos de inventario</span>
                </div>
              </div>
            </div>
            <div className="mn-nota mn-columna" style={{ marginTop: 20 }}>
              <div className="mn-titular">Búscate la marca lateral</div>
              <p>
                Los campos que puntúan llevan una marca a la izquierda, y cada grupo tiene <b>dos
                contadores</b>: el primero es el de campos que deciden la nota. Si vas justo de
                tiempo, ésos son los que no puedes dejarte.
              </p>
            </div>
          </div>

          {/* ── Tres tipos de sección ────────────────────────────────── */}
          <div className="mn-bloque">
            <p className="mn-rotulo">El mapa mental</p>
            <h2>Las {SECTIONS.length} secciones son de tres tipos</h2>
            <p className="mn-bajada">Saber en cuál estás te dice qué significa decir que no.</p>
            <div className="mn-rejilla">
              <div className="mn-tarjeta" style={{ borderTopColor: C.red }}>
                <div className="mn-cuantas" style={{ color: C.red }}>
                  {porTipo("riesgo").length}<span>secciones</span>
                </div>
                <h3>Todo cliente las tiene</h3>
                <p>Decir que no las tiene <b>es un hallazgo crítico</b> y limita la nota. Ningún
                cliente real carece de red, equipos, correo, antivirus o copias.</p>
                <ul className="mn-fichas">
                  {porTipo("riesgo").map(f => <li key={f.id}>{f.label.split(" (")[0]}</li>)}
                </ul>
              </div>
              <div className="mn-tarjeta" style={{ borderTopColor: C.amber }}>
                <div className="mn-cuantas" style={{ color: C.amber }}>
                  {porTipo("declarar").length}<span>secciones</span>
                </div>
                <h3>Puede no tenerlas</h3>
                <p>El «no» es legítimo, pero <b>hay que decir por qué</b>. Se elige un motivo de la
                lista y queda escrito en el informe.</p>
                <ul className="mn-fichas">
                  {porTipo("declarar").map(f => <li key={f.id}>{f.label.split(" (")[0]}</li>)}
                </ul>
              </div>
              <div className="mn-tarjeta" style={{ borderTopColor: C.gray }}>
                <div className="mn-cuantas" style={{ color: C.gray }}>
                  {porTipo("inventario").length}<span>secciones</span>
                </div>
                <h3>Solo inventario</h3>
                <p>No tienen ningún criterio de puntuación. Se rellenan para documentar al
                cliente, pero <b>no tocan la nota</b>.</p>
                <ul className="mn-fichas">
                  {porTipo("inventario").map(f => <li key={f.id}>{f.label.split(" / ")[0]}</li>)}
                </ul>
              </div>
            </div>
          </div>

          {/* ── Sí / No / sin tocar ──────────────────────────────────── */}
          <div className="mn-bloque">
            <p className="mn-rotulo">La confusión más cara</p>
            <h2>Sí, No y «sin tocar» no son lo mismo</h2>
            <p className="mn-bajada">
              Cada sección tiene tres estados posibles, y solo dos de ellos son una respuesta.
            </p>
            <div className="mn-rejilla">
              <div className="mn-caja">
                <span className="mn-boton" style={{ borderColor: C.greenBorder, color: C.green, background: C.greenLight }}>✓ SÍ</span>
                <p className="mn-que">El cliente <b>tiene</b> ese servicio.</p>
                <p>Se abre el formulario. Todo lo que no compruebes cuenta como no demostrado y
                vale cero: rellenar a medias baja la nota, y es correcto que la baje.</p>
              </div>
              <div className="mn-caja">
                <span className="mn-boton" style={{ borderColor: C.redBorder, color: C.red, background: C.redLight }}>✗ NO</span>
                <p className="mn-que">El cliente <b>no tiene</b> ese servicio.</p>
                <p>En las secciones que todo cliente tiene, genera un hallazgo crítico. En las
                declarables, pide el motivo. Es una afirmación sobre el cliente y queda escrita
                en el informe con tu nombre.</p>
              </div>
              <div className="mn-caja">
                <span className="mn-boton">sin tocar</span>
                <p className="mn-que">Todavía <b>no lo has mirado</b>.</p>
                <p>No es una respuesta. Mientras quede una sección sin decidir, el informe no
                imprime nota. Decídelas todas antes de cerrar la visita.</p>
              </div>
            </div>
          </div>

          {/* ── El panel ─────────────────────────────────────────────── */}
          <div className="mn-bloque">
            <p className="mn-rotulo">El panel de la derecha</p>
            <h2>Cómo se lee mientras trabajas</h2>
            <p className="mn-bajada">
              Se actualiza con cada respuesta. Cuatro cifras, y conviene no confundirlas.
            </p>
            <div className="mn-rejilla">
              <div className="mn-tarjeta" style={{ borderTopColor: C.green }}>
                <div className="mn-cifra" style={{ color: C.green }}>72<small> / 100</small></div>
                <div className="mn-etiqueta-cifra">CiberScore</div>
                <h3>La nota</h3>
                <p>Mide cuánta protección se ha <i>demostrado</i>, no qué tal pinta lo poco que se
                miró.</p>
              </div>
              <div className="mn-tarjeta" style={{ borderTopColor: C.gray }}>
                <div className="mn-cifra" style={{ color: C.gray, fontSize: 20, paddingTop: 12 }}>Provisional</div>
                <div className="mn-etiqueta-cifra">Sello de la nota</div>
                <h3>Si aparece, no hay informe</h3>
                <p>El PDF <b>no imprime la nota</b>. Justo debajo pone qué falta para quitarlo.</p>
              </div>
              <div className="mn-tarjeta" style={{ borderTopColor: C.blue }}>
                <div className="mn-cifra" style={{ color: C.blue }}>99<small>%</small></div>
                <div className="mn-etiqueta-cifra">Comprobado</div>
                <h3>Cuánto has demostrado</h3>
                <p>Del modelo que le aplica a este cliente. Hace falta <b>{EVIDENCIA_MINIMA} %</b> para
                que la nota se pueda publicar.</p>
              </div>
              <div className="mn-tarjeta" style={{ borderTopColor: C.blue }}>
                <div className="mn-cifra" style={{ color: C.blue }}>5<small>/{SECTIONS.length}</small></div>
                <div className="mn-etiqueta-cifra">Secciones decididas</div>
                <h3>Cuántas has contestado</h3>
                <p>Sí o no, da igual cuál. Tiene que llegar a <b>{SECTIONS.length}/{SECTIONS.length}</b> antes
                de cerrar la visita.</p>
              </div>
            </div>
          </div>

          {/* ── Hallazgos vs avisos ──────────────────────────────────── */}
          <div className="mn-bloque">
            <p className="mn-rotulo">Dos listas distintas</p>
            <h2>Hallazgos del CiberScore y avisos</h2>
            <p className="mn-bajada">
              Se parecen en pantalla y no son lo mismo. Los primeros bajan la nota; los segundos
              son trabajo por hacer.
            </p>
            <div className="mn-rejilla">
              <div className="mn-lado">
                <div className="mn-cabeza" style={{ background: C.redLight }}>
                  <h3 style={{ color: C.red }}>Hallazgos del CiberScore</h3>
                  <p>Limitan la nota por sí solos</p>
                </div>
                <div className="mn-dentro">
                  <p style={{ fontSize: 13.5 }}>
                    Salen de lo que has contestado. Ninguna mejora en otro apartado los compensa.
                  </p>
                  <ul className="mn-lista">
                    <li>«Sin copias de seguridad» limita la nota global entera.</li>
                    <li>«RDP publicado a internet» hunde el dominio de red.</li>
                    <li>«Solo antivirus de firmas» limita el dominio de puestos.</li>
                  </ul>
                </div>
              </div>
              <div className="mn-lado">
                <div className="mn-cabeza" style={{ background: C.amberLight }}>
                  <h3 style={{ color: C.amber }}>Avisos y oportunidades</h3>
                  <p>{avisos.length} en total · no tocan la nota</p>
                </div>
                <div className="mn-dentro">
                  <p style={{ fontSize: 13.5 }}>
                    Aparecen según lo que contestas. Los marcables se dejan en <b>Hecho</b>,
                    <b> Pendiente</b> o <b>N/A</b>, y los pendientes forman el plan de acción.
                  </p>
                  <div className="mn-avisos">
                    <div className="mn-aviso">
                      <span className="mn-nom">{TIPOS_HINT.seguridad.icono} Seguridad</span>
                      <span className="mn-desc">Riesgo activo que hay que cerrar</span>
                      <span className="mn-cuenta">{cuentaAviso("seguridad")}</span>
                    </div>
                    <div className="mn-aviso">
                      <span className="mn-nom">{TIPOS_HINT.legado.icono} Legado</span>
                      <span className="mn-desc">Accesos del proveedor anterior</span>
                      <span className="mn-cuenta">{cuentaAviso("legado")}</span>
                    </div>
                    <div className="mn-aviso">
                      <span className="mn-nom">{TIPOS_HINT.doc.icono} Documentar</span>
                      <span className="mn-desc">Recordatorio de qué apuntar</span>
                      <span className="mn-cuenta">{cuentaAviso("doc")}</span>
                    </div>
                    <div className="mn-aviso">
                      <span className="mn-nom">{TIPOS_HINT.comercial.icono} Oportunidad</span>
                      <span className="mn-desc">Uso interno · nunca sale al cliente</span>
                      <span className="mn-cuenta">{cuentaAviso("comercial")}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Errores ──────────────────────────────────────────────── */}
          <div className="mn-bloque">
            <p className="mn-rotulo">Lo que sale mal a menudo</p>
            <h2>Cuatro costumbres que estropean la ficha</h2>
            <div className="mn-errores">
              <div className="mn-error">
                <span className="mn-mal">Rellenar el inventario y dejar los desplegables</span>
                <span className="mn-bien">Marca, modelo y número de serie no mueven la nota. <b>Los
                desplegables de configuración sí.</b> Un cliente con el 46 % de campos rellenos puede
                tener solo el 30 % comprobado si lo relleno era casi todo inventario.</span>
              </div>
              <div className="mn-error">
                <span className="mn-mal">Poner «No revisado» para salir del paso</span>
                <span className="mn-bien">Vale exactamente lo mismo que dejarlo en blanco: <b>cero</b>.
                No es un atajo, es dejar constancia de que no se miró.</span>
              </div>
              <div className="mn-error">
                <span className="mn-mal">Salir de la visita con secciones sin decidir</span>
                <span className="mn-bien">El informe no imprime nota mientras quede una. <b>Es lo
                último que hay que repasar</b> antes de guardar.</span>
              </div>
              <div className="mn-error">
                <span className="mn-mal">Confiar en el borrador automático</span>
                <span className="mn-bien">El borrador salva la visita si se cierra el navegador, pero
                <b> vive en ese portátil</b>. Hasta que no pulses Guardar, la ficha no está en la nube
                y nadie más la ve.</span>
              </div>
            </div>
          </div>

          {/* ── Guardado ─────────────────────────────────────────────── */}
          <div className="mn-bloque">
            <p className="mn-rotulo">No perder el trabajo</p>
            <h2>Tres cosas distintas que parecen la misma</h2>
            <div className="mn-rejilla">
              <div className="mn-caja">
                <span className="mn-boton" style={{ borderColor: C.blueBorder, color: C.blue, background: C.blueLight }}>borrador 10:29</span>
                <p className="mn-que">Copia local <b>automática</b>.</p>
                <p>Se escribe sola mientras trabajas y al cerrar la pestaña. Si el navegador se
                cae, al volver te ofrece recuperar la visita. No sustituye a guardar.</p>
              </div>
              <div className="mn-caja">
                <span className="mn-boton" style={{ borderColor: C.greenBorder, color: C.green, background: C.greenLight }}>Guardar</span>
                <p className="mn-que">Sube la ficha <b>a la nube</b>.</p>
                <p>Es lo único que la deja accesible para el resto del equipo y lo que crea una
                versión en el historial. El punto turquesa junto al nombre significa que hay
                cambios sin guardar.</p>
              </div>
              <div className="mn-caja">
                <span className="mn-boton">Exportar</span>
                <p className="mn-que">Descarga un fichero <b>.alanait</b>.</p>
                <p>Copia completa con capturas incluidas, para llevártela o archivarla. Es siempre
                lo que hay en pantalla, no lo último guardado.</p>
              </div>
            </div>
          </div>

          {/* ── Cómo se calcula ──────────────────────────────────────── */}
          <div className="mn-bloque">
            <p className="mn-rotulo">Cómo se calcula la nota</p>
            <h2>{dominios.length} dominios ponderados</h2>
            <p className="mn-bajada">
              El peso sale de dónde más daño hace un fallo en una pyme, no de repartir a partes
              iguales. Suman 100.
            </p>
            <div className="mn-dominios">
              {dominios.map(d => (
                <div className="mn-dominio" key={d.id}>
                  <span className="mn-nombre">{d.nombre}</span>
                  <span className="mn-pista">
                    <span className="mn-relleno" style={{ width: `${Math.round((d.peso / pesoMayor) * 100)}%` }} />
                  </span>
                  <span className="mn-peso">{d.peso} %</span>
                </div>
              ))}
            </div>

            <h3 style={{ marginTop: 30 }}>El semáforo</h3>
            <div className="mn-semaforo" style={{ marginTop: 10 }}>
              {tramos.map(t => (
                <div className="mn-tramo" key={t.nivel} style={{ borderTopColor: t.color }}>
                  <div className="mn-rango">{t.desde} – {t.hasta}</div>
                  <div className="mn-nivel" style={{ color: t.color }}>{t.etiqueta}</div>
                </div>
              ))}
            </div>

            <div className="mn-nota mn-columna" style={{ marginTop: 24 }}>
              <div className="mn-titular">La regla que explica casi todo</div>
              <p>
                <b>Lo que no se ha comprobado no puntúa.</b> Cuenta en el denominador y vale cero.
                Lo único que sale del cálculo es lo que <i>no le aplica</i> al cliente — y eso es
                una afirmación sobre el cliente, no sobre la visita.
              </p>
            </div>
          </div>

          {/* ── Tabla de referencia ──────────────────────────────────── */}
          <div className="mn-bloque">
            <p className="mn-rotulo">Referencia</p>
            <h2>Las {SECTIONS.length} secciones, de un vistazo</h2>
            <p className="mn-bajada">
              Todas admiten varias instancias: tres servidores, dos redes, cuatro cuentas de
              correo. Cada instancia se comprueba por separado.
            </p>
            <div className="mn-tabla-caja">
              <table className="mn-tabla">
                <thead>
                  <tr>
                    <th>Sección</th>
                    <th>Qué significa el «no»</th>
                    <th style={{ textAlign: "right" }}>Campos</th>
                    <th style={{ textAlign: "right" }}>Puntúan</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map(f => (
                    <tr key={f.id}>
                      <td style={{ fontWeight: 500 }}>{f.icon} {f.label}</td>
                      <td>
                        <span className="mn-chip" style={
                          f.tipo === "riesgo" ? { background: C.redLight, color: C.red, border: `1px solid ${C.redBorder}` }
                          : f.tipo === "declarar" ? { background: C.amberLight, color: C.amber, border: `1px solid ${C.amberBorder}` }
                          : { background: C.grayLight, color: C.gray, border: `1px solid ${C.border}` }
                        }>{ETIQUETA_TIPO[f.tipo]}</span>
                      </td>
                      <td className="mn-n">{f.campos}</td>
                      <td className="mn-n">{f.puntuan}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mn-pie">
            <span>Modelo CiberScore {SCORE_MODEL_VERSION}</span>
            <span>{SECTIONS.length} secciones · {totalCampos} campos · {totalPuntuan} puntúan · {CRITERIOS.length} criterios</span>
            <span>Uso interno de ALANA IT</span>
          </div>

        </div>
      </div>
    </div>
  );
}
