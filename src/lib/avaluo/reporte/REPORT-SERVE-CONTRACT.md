# Contrato `GET {MICRO}/api/avaluo/report/[slug]?token=<capability>` — report-serve v1

Objetivo: que el sello de la landing sea VERDAD. La landing del front (`/avaluo/reporte/[slug]`) deja de leer una fixture y consume esta respuesta. El sello (`sello-verificacion`) tiene que mostrar EXACTAMENTE el mismo veredicto que el verificador público `/verify/<slug>` del micro — mismo resolutor (`resolveVerifyState` + `verifyCertificate`), no una reimplementación.

## Auth y postura (idénticas a `src/app/api/avaluo/[id]/certificate/route.ts` del micro)
- `token` = capability token del dueño (`verifyCapabilityToken(cert.submissionId, token)`), viaja en `?token=` (precedente: certificate/memoria).
- Rechazo SIMÉTRICO: slug inexistente, token ausente/inválido/de otra submission, `submissionId` null ⇒ el MISMO `404 {"error":"report not found"}`. Nunca 403.
- Stub mode (`!prisma`) ⇒ `503 {"error":"database unavailable"}`.
- Throttle por IP como `/verify` (`resolveClientIpFromHeaders` + `checkRateLimit`, bucket public) ⇒ `429` neutro ANTES de tocar la DB.
- `runtime = 'nodejs'`. Headers: `Cache-Control: no-store`, `X-Robots-Tag: noindex, nofollow`.
- El pago lo decide el servidor: `paid = hasApprovedPayment(certId)` (misma regla que certificate route: approved + amountCop === AMOUNT_COP). Las secciones `visibility:'paid'` se PROYECTAN server-side (degradadas con CTA) cuando `paid === false` — nunca viaja el dato de pago al cliente sin pagar. Usar `src/avaluo/report/audience.ts` del micro (`toPaidProjection` o equivalente).
- `audience` = `'owner'` siempre en v1 (el enlace compartido revocable es una migración aparte y NO entra acá; el campo existe para el día que exista la tabla).

## Secciones (certificado de `develop`, HEAD `4a622f1`)
`order` = `SECTION_ORDER` del micro (`src/avaluo/report/section-ids.ts`), 39 ids en el orden EXACTO del JSX del certificado. Cambió respecto a la versión de junio y **el front tiene que actualizar su copia literal de `SECTION_ORDER`** (la fixture compartida ya trae la nueva):

```
doc-header · tabla-contenido · resumen-ejecutivo · identificacion-predio · aspectos-legales ·
descripcion-inmueble · anexo-fotografico · descripcion-sector · aspectos-complementarios ·
metodologia · avm-legitimacion · prudencia-redondeo · nivel-confianza · regimen-mercado ·
indicativo-venta · divergencia-referencia · reconciliacion-indicaciones · valor-estimado ·
valorizantes-desvalorizantes · valor-terreno-construccion · homogenizacion-igac ·
conciliacion-metodos · tiempo-exposicion · niif13 · vigencia · alcance-limitaciones ·
naturaleza-documento · consideraciones-limitantes · sin-visita · participacion-automatizada ·
constancias-supuestos · principios-d422 · usos-documento · valor-realizacion · independencia ·
emisor · constancia-firma · sello-verificacion · doc-footer
```

- **NUEVAS (canon, decisión de producto):** `tabla-contenido` (owner; `bulletList` con los 12 capítulos numerados «N. Título»), `aspectos-legales` (paid, mismo criterio que la identificación; `keyValues` con procedencia — matrícula / código catastral (CHIP) / estudio de títulos — y la nota «no constituye un estudio de títulos» como `legalNote`), `constancia-firma` (owner; `keyValues` firmante/cargo/fecha/ID de firma/código/URL + `prose` con la instrucción del QR; la nota Ley 527 como `legalNote`; sin firma llega `degraded` con «Pendiente de firma.» y conserva la `legalNote`).
- **ELIMINADAS (el PDF las quitó, la web no muestra lo que el PDF quitó):** `comparables-ajustes`, `comparables-descartados`, `procedencia-datos`. Los ids de comparables ya NO viajan en ninguna sección. La nota Habeas Data (Ley 1581) que vivía en «Procedencia» viaja ahora como `legalNote` de `doc-footer`.
- **MOVIDA:** `anexo-fotografico` va inmediatamente después de `descripcion-inmueble`. Sus bloques son `[prose (procedencia), media, prose? (línea de soporte), prose? (notas)]`; el `media` lleva `count` + items con URL presignada, y su `caption` compone «Foto N de M · pie · detalle» cuando el PDF incrustó la foto.
- `resumen-ejecutivo` suma las filas «Solicitado por» (agencia) y «Firmado electrónicamente por» (procedencia = «Portofino S.A.S. — Revisor(a) — el AAAA-MM-DD») o «Firma: Pendiente de firma.».
- Ahora TODA sección titulada es canónica salvo `sello-verificacion` (web-only). `visibility:'paid'` son 11: resumen-ejecutivo, identificacion-predio, aspectos-legales, descripcion-inmueble, anexo-fotografico, aspectos-complementarios, indicativo-venta, valor-estimado, valor-terreno-construccion, homogenizacion-igac, conciliacion-metodos.

## Respuesta 200 — `application/json`
La respuesta ES un `ReportWebView` (el tipo del front, `front-report-model.ts` en esta carpeta — es el contrato de bloques, 11 kinds) más un objeto `render` con lo impuro:

```ts
interface ReportServeResponse extends ReportWebView {
  // ReportWebView (front-report-model.ts): schema:'report-v1', meta, audience:'owner',
  // paid, sample:false, shareNotice:null, order (SECTION_ORDER), sections: Record<SectionId, ReportSectionNode>
  // ⚠️ meta.verifyUrl = publicVerifyUrl(slug) del micro (PUBLIC_BASE_URL — la MISMA URL horneada en el QR del PDF);
  //    meta.verifyUrlEnabled = true; meta.paywallCtaHref = null SIEMPRE desde el micro (ver render.submissionId).
  // ⚠️ El bloque 'seal' de sections['sello-verificacion'] lleva certContentHashCorto REAL (12 hex), verifyUrl REAL,
  //    verifyUrlEnabled:true, note:null (o la nota del estado, ver abajo).
  render: {
    nowIso: string                       // reloj del servidor, leído en el borde de la ruta (único sitio)
    certificateId: string                // AvaluoCertificate.id: el front arma `${micro}/api/avaluo/${certificateId}/certificate?token=` (descarga real del PDF)
    submissionId: string                 // la solicitud del dueño (atada al capability token). El FRONT construye con esto
                                         // su CTA de pago (`/avaluo/estado/<submissionId>`); el micro manda meta.paywallCtaHref = null
                                         // (su endpoint de pago es un POST, no un enlace).
    seal: {
      // === lo que /verify/<slug> renderiza, del MISMO resolutor. Espejo de resolveVerifyState (verify-result.tsx).
      state: 'valid' | 'altered' | 'not_found' | 'unavailable'
      tamperVerdict: 'valido' | 'alterado' | 'desconocido'
      chainStatus: 'VIGENTE' | 'VENCIDO' | 'REEMPLAZADO' | null
      supersededBy: string | null        // slug del cert que reemplaza a éste
      certContentHash: string | null     // sha256 hex COMPLETO (64) — no es PII; el corto (12) va en el bloque
      issuer: string                     // 'Portofino'
      signedAtIso: string | null
      expiresAtIso: string | null
      signedBy: string | null            // PII del revisor: sólo audience 'owner'
      methods: string[]
      verifyUrl: string                  // = meta.verifyUrl
    }
    qr: { size: number; rows: string[] } // matriz del QR de verifyUrl: rows[y][x] === '1' ⇒ módulo oscuro.
                                         // Producida con `qrcode` (QRCode.create(verifyUrl, {errorCorrectionLevel:'M'}).modules)
                                         // — el MISMO payload que el QR del PDF (stamp-qr.ts). Determinística. El front la dibuja
                                         // con <rect> (nunca inyecta SVG del servidor).
    photos: { key: string; url: string; expiresAtIso: string }[]  // URLs presignadas de S3 del anexo (TTL corto). [] si no hay.
  }
}
```

Errores: `404 {"error":"report not found"}` · `429 {"error":"unavailable"}` · `503 {"error":"database unavailable"}`. Nunca 500 con stack.

## Determinismo / invariantes
- El modelo sale de `buildReportV1(ctx)` con `ctx` armado desde la DB por el MISMO ensamblado que la ruta del certificado (`toDocumentProps(args)` → `fromDocumentProps(props)`), para que web == PDF servido (INV-02). NO se toca `renderCertificate` ni nada que mueva bytes del PDF; los goldens de `tests/golden/` tienen que seguir verdes.
- Nada de reloj/RNG dentro de `src/avaluo/report/` (los grep-gates lo prohíben): `nowIso`, presign, tamper y chainStatus viven en `src/avaluo/report/serve/` (nuevo dir) o en la ruta, nunca en builders/toBlocks.
- PII: `signedBy` sólo para owner; el resto de PII del propietario (dirección, fotos) va porque la audiencia es el dueño autenticado por capability token.

## Fixture compartida
El micro escribe `report-serve.sample.json` (`npx tsx scripts/write-report-serve-sample.ts <ruta>`; la copia canónica vive junto a este contrato en `src/avaluo/report-serve/report-serve.sample.json`) generado desde `src/avaluo/report/fixtures/sample-report.ts` + `toWebView` + un `render` sintético (state 'valid', chain 'VIGENTE', qr real de la verifyUrl de la fixture, photos []). El front lo copia tal cual y lo usa como fixture de su test de adaptación/validación. Trae las 39 secciones del orden de arriba.
