const fs = require('fs');
const es = JSON.parse(fs.readFileSync('src/lib/i18n/locales/es.json','utf8'));
const en = JSON.parse(fs.readFileSync('src/lib/i18n/locales/en.json','utf8'));

const keys = [
  'inmobiliaria.propietarios.toasts.updated',
  'inmobiliaria.propietarios.toasts.exporting',
  'inmobiliaria.common.title',
  'inmobiliaria.propietarios.title',
  'inmobiliaria.propietarios.subtitle',
  'inmobiliaria.propietarios.addOwner',
  'inmobiliaria.propietarios.properties',
  'inmobiliaria.propietarios.monthlyRevenue',
  'inmobiliaria.propietarios.upToDate',
  'inmobiliaria.propietarios.noPending',
  'inmobiliaria.common.cancel',
  'inmobiliaria.common.delete',
  'inmobiliaria.portafolio.status.available',
  'inmobiliaria.portafolio.status.rented',
  'inmobiliaria.portafolio.status.maintenance',
  'inmobiliaria.dispersiones.status.pending',
  'inmobiliaria.dispersiones.status.processed',
  'inmobiliaria.config.billing.plans.starter.description',
  'inmobiliaria.config.billing.features.properties',
  'inmobiliaria.config.billing.features.unlimitedFem',
  'inmobiliaria.reportes.stats.never',
  'inmobiliaria.reportes.toasts.removedFromFavorites',
  'inmobiliaria.reportes.toasts.reportGenerated',
  'inmobiliaria.agentes.commission',
  'inmobiliaria.operaciones.title',
];

function resolve(obj, path) {
  return path.split('.').reduce(function(o, k) { return o && o[k]; }, obj);
}

var missingEs = 0;
var missingEn = 0;
keys.forEach(function(k) {
  var esVal = resolve(es, k);
  var enVal = resolve(en, k);
  var esOk = esVal !== undefined;
  var enOk = enVal !== undefined;
  if (!esOk || !enOk) {
    console.log('[FAIL] ' + k + '  es:' + (esOk ? 'OK' : 'MISSING') + '  en:' + (enOk ? 'OK' : 'MISSING'));
    if (!esOk) missingEs++;
    if (!enOk) missingEn++;
  } else {
    console.log('[PASS] ' + k);
  }
});
console.log('');
console.log('Summary: ' + keys.length + ' keys checked, ' + missingEs + ' missing in es.json, ' + missingEn + ' missing in en.json');
