# App de Leasefy para iOS y Android

La plataforma de **leasefy.co** dentro de una app nativa (Capacitor 8). Las ~420 pantallas son las
mismas de la web: un cambio en el front llega a la app sin pasar por las tiendas. Lo nativo es poco y
vive aquí:

| Qué | Dónde |
|---|---|
| Entrar con Google (hoja segura del sistema) y con Apple | `ios/App/App/LeasefyNativoPlugin.swift`, `android/.../LeasefyNativoPlugin.java` |
| Avisos (notificaciones) | plugin `@capacitor/push-notifications` + `AppDelegate.swift` (FCM con Firebase) |
| Descargas (PDF/Excel → hoja de compartir) y enlaces externos | `@capacitor/filesystem`, `@capacitor/share`, `@capacitor/browser` |
| Botón atrás de Android, enlaces que abren la app | `@capacitor/app` |
| Sin internet | `plantillas/sin-conexion.html` |
| Ícono y pantalla de inicio | `scripts/generar-iconos.mjs` (desde `recursos/simbolo.svg`) |

Del lado del front, todo lo que habla con la app está en `src/lib/app-nativa/` y
`src/components/app-nativa/PuenteDeLaApp.tsx`. En el navegador nada de eso corre.

**Dónde vive:** repo `front`, rama `aplicacion`, carpeta `app-movil/` (este proyecto) junto al front.
Los comandos de abajo se corren dentro de `app-movil/`; el front no lo compila (está en el `exclude` del
`tsconfig.json`).

**Para qué aparatos:** iPhone, iPad y Android (teléfonos y tablets).
- iPhone y teléfonos Android: sólo en vertical.
- iPad (`TARGETED_DEVICE_FAMILY = "1,2"`): gira a las cuatro orientaciones (`UISupportedInterfaceOrientations~ipad`),
  como pide iPadOS para las ventanas que cambian de tamaño. La app pide la versión móvil de la página
  (`preferredContentMode: 'mobile'`), así que el front usa su diseño adaptable: barra de abajo en vertical y menú
  lateral desde 1024 px (iPad de 13" en vertical o cualquier iPad en horizontal).
- Tablets Android: con `targetSdk 36` (Android 16), en pantallas grandes el sistema ignora el bloqueo a vertical
  y la app gira igual que en iPad.

## Compilar

```bash
npm install
npm run sync                 # apunta a https://leasefy.co (lo de las tiendas)
LEASEFY_URL=http://localhost:3161 npm run sync   # un front local, sólo para probar
```

- **iOS:** `npm run ios` abre Xcode → elegir el equipo de la cuenta de Apple en *Signing & Capabilities* →
  *Product › Archive* → *Distribute App* (TestFlight / App Store). Sin cuenta se compila para el simulador:
  `xcodebuild -project ios/App/App.xcodeproj -scheme App -sdk iphonesimulator -derivedDataPath build CODE_SIGNING_ALLOWED=NO build`
- **Android:** `cd android && ./gradlew bundleRelease` → `app/build/outputs/bundle/release/app-release.aab`
  (se sube a Google Play). Necesita Java 21 (`JAVA_HOME`) y el SDK (`android/local.properties`).

## Lo que falta de afuera (cuentas y archivos que no viven en el repo)

1. **Apple Developer** (empresa, US$99/año; pide D-U-N-S). Con el Team ID:
   - en el front, la variable `APPLE_TEAM_ID` → `leasefy.co/.well-known/apple-app-site-association`
     (enlaces que abren la app y contraseñas guardadas);
   - en Supabase, proveedor **Apple** prendido con el identificador `co.leasefy.app` («Continuar con Apple»);
   - una llave de APNs (.p8) subida a Firebase (avisos en iPhone).
2. **Google Play** (empresa, US$25 una vez). Con la huella SHA-256 de la firma de Play (*Configuración ›
   Integridad de la app*): variable `ANDROID_SHA256_CERT_FINGERPRINTS` en el front →
   `leasefy.co/.well-known/assetlinks.json`.
3. **Firebase** (el mismo proyecto de los avisos de la web): registrar las apps `co.leasefy.app` de iOS y
   Android y descargar `GoogleService-Info.plist` → `ios/App/App/` y `google-services.json` →
   `android/app/`. Sin ellos la app funciona, sólo que sin avisos. En iOS además hay que agregar el
   paquete `FirebaseMessaging` (Swift Package Manager) al target App.
4. **Llave de subida de Android**: `~/.leasefy/llave-de-subida.properties` (fuera del repo) con
   `storeFile`, `storePassword`, `keyAlias`, `keyPassword`. Guardarla en un lugar seguro: sin ella no se
   pueden subir versiones nuevas (Google puede cambiarla, pero tarda días).
5. **Cuenta de demostración** en producción para los revisores de Apple y Google, con datos inventados.

## Versiones

Cada subida a las tiendas sube el número: iOS `MARKETING_VERSION` / `CURRENT_PROJECT_VERSION` en Xcode;
Android `versionName` / `versionCode` en `android/app/build.gradle`.
