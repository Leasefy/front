/**
 * 🔴 El contrato que firma el inquilino está escrito en español.
 *
 * ── De dónde sale esta prueba ───────────────────────────────────────────────
 *
 * 20-09, abriendo pantallas: las dieciocho cláusulas de `contract-templates.ts`
 * —las que se le muestran al inquilino en `/inquilino/contratos/[id]/firmar`,
 * la página donde FIRMA— estaban escritas sin una sola tilde: «CLAUSULA
 * PRIMERA», «titulo de arrendamiento», «cedula catastral», «nucleo familiar»,
 * «Articulo 8», «senalan como domicilio». Y de forma inconsistente: dos
 * títulos sí tenían («Duración y Prórroga»), lo que prueba que era un olvido y
 * no una decisión.
 *
 * Es el documento más importante que produce el producto y lleva el nombre de
 * la inmobiliaria. Una cláusula sin tildes no cambia lo que dice, pero sí
 * cambia quién parece haberla escrito.
 *
 * ── Por qué la lista es cerrada y no un corrector ───────────────────────────
 *
 * No se puede escribir «ninguna palabra sin tilde» porque muchas palabras del
 * español no la llevan. Lo que sí se puede es fijar las formas que ya
 * aparecieron mal escritas: si vuelven, vuelven por la misma puerta (alguien
 * copia y pega texto legal de un PDF viejo, que es de donde salió esto).
 */

import { describe, expect, it } from 'vitest';

import { CONTRACT_TEMPLATES } from './contract-templates';

/** Formas sin tilde que ya aparecieron en el contrato. */
const SIN_TILDE = [
  'CLAUSULA', 'Clausula', 'Articulo', 'Articulos', 'PARAGRAFO',
  'titulo', 'direccion', 'matricula', 'cedula', 'nucleo', 'autorizacion',
  'consignacion', 'terminacion', 'administracion', 'facturacion',
  'celebracion', 'ejecucion', 'antelacion', 'indemnizacion', 'cancelacion',
  'notificacion', 'informacion',
  'documentacion', 'prevencion', 'proteccion', 'verificacion', 'evaluacion',
  'resolucion', 'solucion', 'conciliacion', 'jurisdiccion', 'Legislacion',
  'reparacion', 'reposicion', 'conservacion', 'restitucion', 'devolucion',
  'identificacion', 'habitacion', 'prohibicion', 'destinacion', 'realizacion',
  'suspension', 'desconexion', 'prestacion', 'incursion', 'cesion', 'accion',
  'dias', 'podra', 'podran', 'debera', 'seran', 'sera', 'demas', 'asi',
  'segun', 'ningun', 'ultima', 'aqui', 'despues', 'areas', 'senalan',
  'compania', 'avaluo', 'Poliza', 'Codigo', 'Indice', 'regimen', 'termino',
  'terminos', 'limite', 'maximo', 'publicos', 'energia', 'electrica',
  'telefono', 'economica', 'juridica', 'juridicos', 'electronico',
  'electronicos', 'electronicas', 'prorroga', 'prorrogas', 'deposito',
  'depositos', 'garantias', 'perdida', 'perdidas', 'legitimo', 'pacifico',
  'habiles', 'razon', 'basico', 'basicos', 'estandar', 'vacio', 'politica',
  'gestion', 'financiacion', 'licitas', 'ilicita', 'Estadistica', 'Policia',
  'electrodomesticos', 'fisicas', 'canones', 'pagara', 'hara', 'servira',
  'realizara', 'consideraran', 'responderan', 'entendera', 'constituira',
  'automaticamente', 'dirigiendose', 'Descripcion', 'Declaracion',
];

/** Todo el texto que el inquilino puede llegar a leer. */
function textoVisible(): { donde: string; texto: string }[] {
  const piezas: { donde: string; texto: string }[] = [];
  for (const plantilla of CONTRACT_TEMPLATES) {
    piezas.push({ donde: `${plantilla.id}.name`, texto: plantilla.name });
    piezas.push({ donde: `${plantilla.id}.description`, texto: plantilla.description });
    for (const c of plantilla.clauses) {
      piezas.push({ donde: `${c.id}.title`, texto: c.title });
      piezas.push({ donde: `${c.id}.content`, texto: c.content });
    }
  }
  return piezas;
}

describe('el contrato que firma el inquilino', () => {
  it('🔴 no tiene palabras sin tilde', () => {
    const culpables: string[] = [];
    for (const { donde, texto } of textoVisible()) {
      for (const palabra of SIN_TILDE) {
        const re = new RegExp(`(?<![A-Za-zÁÉÍÓÚáéíóúñÑ])${palabra}(?![A-Za-zÁÉÍÓÚáéíóúñÑ])`);
        if (re.test(texto)) culpables.push(`${donde}: «${palabra}»`);
      }
    }
    expect(culpables).toEqual([]);
  });

  it('mide algo: hay dieciocho cláusulas comunes y tres plantillas', () => {
    expect(CONTRACT_TEMPLATES).toHaveLength(3);
    const basico = CONTRACT_TEMPLATES.find((t) => t.id === 'template-basico');
    expect(basico?.clauses.length).toBeGreaterThanOrEqual(18);
  });

  it('🔴 los ids NO se tocaron: son llaves que viven en los contratos guardados', () => {
    /*
     * `contract.templateId` apunta a estos ids. Arreglar la ortografía de
     * «basico» dentro de `template-basico` habría dejado sin plantilla a todo
     * contrato ya firmado — el inquilino abre la página a firmar y no ve nada.
     */
    expect(CONTRACT_TEMPLATES.map((t) => t.id)).toEqual([
      'template-basico',
      'template-amoblado',
      'template-compartido',
    ]);
  });
});
