import Foundation
import AuthenticationServices
import Capacitor
#if canImport(FirebaseCore)
import FirebaseCore
#endif

/// Lo nativo de Leasefy en el iPhone que no trae ningún plugin oficial.
///
/// - `estado`: si la app tiene Firebase para los avisos.
/// - `abrir`: abre el inicio de sesión de Google (o cualquier OAuth) en la hoja segura del
///   sistema (ASWebAuthenticationSession). Google no deja entrar desde una vista web embebida;
///   esta hoja sí, y comparte la sesión de Safari. Devuelve la dirección de regreso
///   (`co.leasefy.app://auth/callback?code=…`) para que el front canjee el código.
/// - `entrarConApple`: «Continuar con Apple» nativo. Devuelve el token de identidad que el
///   front le pasa a Supabase (`signInWithIdToken`). Apple lo exige cuando hay Google.
@objc(LeasefyNativoPlugin)
public class LeasefyNativoPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LeasefyNativoPlugin"
    public let jsName = "LeasefyNativo"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "estado", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "abrir", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "entrarConApple", returnType: CAPPluginReturnPromise),
    ]

    private var sesionWeb: ASWebAuthenticationSession?
    private var llamadaDeApple: CAPPluginCall?
    private let proveedorDeVentana = ProveedorDeVentana()

    /// Si la app tiene Firebase (GoogleService-Info.plist): sin él, el token de los avisos es
    /// de Apple y el back no sabe usarlo, así que el front no lo registra.
    @objc func estado(_ call: CAPPluginCall) {
        #if canImport(FirebaseCore)
        let conFirebase = FirebaseApp.app() != nil
        #else
        let conFirebase = false
        #endif
        call.resolve(["firebase": conFirebase, "plataforma": "ios"])
    }

    @objc func abrir(_ call: CAPPluginCall) {
        guard let texto = call.getString("url"), let url = URL(string: texto),
              url.scheme == "https" else {
            call.reject("La dirección para entrar no es válida.", "URL_INVALIDA")
            return
        }
        let esquema = call.getString("esquema") ?? "co.leasefy.app"

        DispatchQueue.main.async {
            self.proveedorDeVentana.ventana = self.bridge?.viewController?.view.window
            let sesion = ASWebAuthenticationSession(url: url, callbackURLScheme: esquema) { [weak self] regreso, error in
                self?.sesionWeb = nil
                if let regreso {
                    call.resolve(["url": regreso.absoluteString])
                    return
                }
                if let error = error as? ASWebAuthenticationSessionError, error.code == .canceledLogin {
                    call.reject("La persona cerró la ventana sin entrar.", "CANCELADO")
                    return
                }
                call.reject(error?.localizedDescription ?? "No se pudo abrir el inicio de sesión.", "FALLO")
            }
            sesion.presentationContextProvider = self.proveedorDeVentana
            // false: Google recuerda la cuenta que ya está abierta en Safari.
            sesion.prefersEphemeralWebBrowserSession = false
            self.sesionWeb = sesion
            if !sesion.start() {
                self.sesionWeb = nil
                call.reject("No se pudo abrir el inicio de sesión.", "FALLO")
            }
        }
    }

    @objc func entrarConApple(_ call: CAPPluginCall) {
        guard let nonce = call.getString("nonce"), !nonce.isEmpty else {
            call.reject("Falta el nonce.", "SIN_NONCE")
            return
        }
        DispatchQueue.main.async {
            self.proveedorDeVentana.ventana = self.bridge?.viewController?.view.window
            let pedido = ASAuthorizationAppleIDProvider().createRequest()
            pedido.requestedScopes = [.fullName, .email]
            // Supabase espera el SHA-256 del nonce en el pedido a Apple y el nonce crudo al canjear.
            pedido.nonce = nonce
            let controlador = ASAuthorizationController(authorizationRequests: [pedido])
            controlador.delegate = self
            controlador.presentationContextProvider = self.proveedorDeVentana
            self.llamadaDeApple = call
            controlador.performRequests()
        }
    }
}

extension LeasefyNativoPlugin: ASAuthorizationControllerDelegate {
    public func authorizationController(controller: ASAuthorizationController,
                                        didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let call = llamadaDeApple else { return }
        llamadaDeApple = nil
        guard let credencial = authorization.credential as? ASAuthorizationAppleIDCredential,
              let tokenEnDatos = credencial.identityToken,
              let token = String(data: tokenEnDatos, encoding: .utf8) else {
            call.reject("Apple no devolvió el token de identidad.", "SIN_TOKEN")
            return
        }
        var respuesta: [String: Any] = [
            "identityToken": token,
            "usuario": credencial.user,
        ]
        if let codigo = credencial.authorizationCode, let texto = String(data: codigo, encoding: .utf8) {
            respuesta["authorizationCode"] = texto
        }
        // Apple manda nombre y correo SÓLO la primera vez que la persona entra.
        if let nombre = credencial.fullName?.givenName { respuesta["nombre"] = nombre }
        if let apellido = credencial.fullName?.familyName { respuesta["apellido"] = apellido }
        if let correo = credencial.email { respuesta["correo"] = correo }
        call.resolve(respuesta)
    }

    public func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        guard let call = llamadaDeApple else { return }
        llamadaDeApple = nil
        if let error = error as? ASAuthorizationError, error.code == .canceled {
            call.reject("La persona cerró la ventana sin entrar.", "CANCELADO")
            return
        }
        call.reject(error.localizedDescription, "FALLO")
    }
}

/// La ventana sobre la que se muestran la hoja de Google y la de Apple.
final class ProveedorDeVentana: NSObject, ASWebAuthenticationPresentationContextProviding,
                                ASAuthorizationControllerPresentationContextProviding {
    weak var ventana: UIWindow?

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        ventana ?? ASPresentationAnchor()
    }

    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        ventana ?? ASPresentationAnchor()
    }
}
