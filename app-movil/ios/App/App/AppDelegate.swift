import UIKit
import Capacitor
#if canImport(FirebaseCore)
import FirebaseCore
#endif
#if canImport(FirebaseMessaging)
import FirebaseMessaging
#endif

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        #if canImport(FirebaseCore)
        // El back manda los avisos por Firebase (FCM). Con el archivo de Firebase de la app
        // (GoogleService-Info.plist, se descarga de la consola de Firebase) el token que llega
        // al back es de FCM, el mismo tipo que ya usa la web.
        if Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") != nil {
            FirebaseApp.configure()
        }
        #endif
        return true
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        #if canImport(FirebaseMessaging)
        if FirebaseApp.app() != nil {
            Messaging.messaging().apnsToken = deviceToken
            Messaging.messaging().token { token, error in
                if let token {
                    NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: token)
                } else {
                    NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
                }
            }
            return
        }
        #endif
        // Sin Firebase llega el token de Apple (APNs). El front no se lo manda al back,
        // porque el back sólo sabe enviar a tokens de FCM.
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration",
                                          sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }
}
