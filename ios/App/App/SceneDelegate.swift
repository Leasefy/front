import UIKit
import WebKit
import UserNotifications
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        let vista = VistaDeLeasefy()
        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = vista
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)

        #if DEBUG
        ControlDePrueba.shared.empezar { [weak vista] in vista?.webView }
        #endif
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }

    func sceneDidBecomeActive(_ scene: UIScene) {
        // El aviso de Leasefy pone el globito en 1; al abrir la app se borra.
        if #available(iOS 16.0, *) {
            UNUserNotificationCenter.current().setBadgeCount(0)
        } else {
            UIApplication.shared.applicationIconBadgeNumber = 0
        }
    }
}

/// La plataforma de Leasefy a pantalla completa. La web dibuja debajo de la hora y de la
/// isla y respeta el área segura en sus barras (env(safe-area-inset-*)).
final class VistaDeLeasefy: CAPBridgeViewController {
    private var filtroDeNavegacion: FiltroDeErroresDeNavegacion?

    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(LeasefyNativoPlugin())
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        // Capacitor muestra «Sin conexión» ante CUALQUIER carga fallida, también cuando una
        // carga se cancela porque empezó otra (tocar dos veces, una redirección). El filtro
        // deja pasar sólo los fallos de red de verdad.
        if let original = webView?.navigationDelegate as? (NSObject & WKNavigationDelegate) {
            let filtro = FiltroDeErroresDeNavegacion(original: original)
            filtroDeNavegacion = filtro
            webView?.navigationDelegate = filtro
        }
        // Deslizar desde el borde izquierdo vuelve a la pantalla anterior, como en Safari.
        webView?.allowsBackForwardNavigationGestures = true
        // Mientras la web carga se ve el fondo de la marca, no un gris.
        webView?.isOpaque = false
        webView?.backgroundColor = .systemBackground
        webView?.scrollView.backgroundColor = .systemBackground
    }
}

/// Se pone delante del manejador de navegación de Capacitor: le pasa todo igual, menos
/// los «fallos» que no son de red (carga cancelada por otra, interrumpida por una regla).
final class FiltroDeErroresDeNavegacion: NSObject, WKNavigationDelegate {
    private weak var original: (NSObject & WKNavigationDelegate)?

    init(original: NSObject & WKNavigationDelegate) {
        self.original = original
    }

    override func responds(to aSelector: Selector!) -> Bool {
        super.responds(to: aSelector) || (original?.responds(to: aSelector) ?? false)
    }

    override func forwardingTarget(for aSelector: Selector!) -> Any? {
        original
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        if Self.esUnaInterrupcion(error) { return }
        original?.webView?(webView, didFail: navigation, withError: error)
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        if Self.esUnaInterrupcion(error) { return }
        original?.webView?(webView, didFailProvisionalNavigation: navigation, withError: error)
    }

    static func esUnaInterrupcion(_ error: Error) -> Bool {
        let e = error as NSError
        if e.domain == NSURLErrorDomain && e.code == NSURLErrorCancelled { return true }
        // 101: dirección que la vista no muestra (la abre el sistema); 102: carga interrumpida
        // por una regla (se volvió descarga o la canceló la app).
        if e.domain == "WebKitErrorDomain" && (e.code == 101 || e.code == 102) { return true }
        return false
    }
}

#if DEBUG
/// SOLO en las compilaciones de prueba (no existe en la versión firmada para las tiendas):
/// cada segundo le pregunta a la Mac (127.0.0.1:3171) si hay una orden — abrir una pantalla
/// o correr código en la página — y le devuelve el resultado. Así se maneja la app desde la
/// terminal para el QA, sin tocar la pantalla. Si en la Mac no hay nadie escuchando, no pasa nada.
final class ControlDePrueba {
    static let shared = ControlDePrueba()
    private let base = URL(string: "http://127.0.0.1:3171")!
    private var webView: () -> WKWebView? = { nil }
    private var ocupado = false

    func empezar(webView: @escaping () -> WKWebView?) {
        self.webView = webView
        Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in self?.preguntar() }
    }

    private func preguntar() {
        guard !ocupado else { return }
        ocupado = true
        var pedido = URLRequest(url: base.appendingPathComponent("siguiente"))
        pedido.timeoutInterval = 2
        URLSession.shared.dataTask(with: pedido) { [weak self] datos, respuesta, _ in
            DispatchQueue.main.async {
                guard let self else { return }
                guard (respuesta as? HTTPURLResponse)?.statusCode == 200, let datos,
                      let orden = try? JSONSerialization.jsonObject(with: datos) as? [String: Any],
                      let id = orden["id"] as? Int else { self.ocupado = false; return }
                self.cumplir(id: id, tipo: orden["tipo"] as? String ?? "", valor: orden["valor"] as? String ?? "")
            }
        }.resume()
    }

    private func cumplir(id: Int, tipo: String, valor: String) {
        guard let webView = webView() else { responder(id, "sin webView"); return }
        switch tipo {
        case "ir":
            guard let base = webView.url, let destino = URL(string: valor, relativeTo: base) else {
                responder(id, "ruta inválida"); return
            }
            webView.load(URLRequest(url: destino))
            responder(id, "abriendo \(destino.absoluteString)")
        case "js":
            webView.callAsyncJavaScript(valor, arguments: [:], in: nil, in: .page) { [weak self] resultado in
                switch resultado {
                case .success(let r): self?.responder(id, String(describing: r))
                case .failure(let e): self?.responder(id, "ERROR: \(e.localizedDescription)")
                }
            }
        default:
            responder(id, "orden desconocida: \(tipo)")
        }
    }

    private func responder(_ id: Int, _ resultado: String) {
        var pedido = URLRequest(url: base.appendingPathComponent("resultado"))
        pedido.httpMethod = "POST"
        pedido.setValue("application/json", forHTTPHeaderField: "content-type")
        pedido.httpBody = try? JSONSerialization.data(withJSONObject: ["id": id, "resultado": resultado])
        URLSession.shared.dataTask(with: pedido) { [weak self] _, _, _ in
            DispatchQueue.main.async { self?.ocupado = false }
        }.resume()
    }
}
#endif
