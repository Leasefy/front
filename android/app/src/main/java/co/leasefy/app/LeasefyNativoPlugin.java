package co.leasefy.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;

import androidx.browser.customtabs.CustomTabsIntent;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Lo nativo de Leasefy que no trae ningún plugin oficial.
 *
 * - estado(): si la app tiene Firebase (google-services.json). Sin Firebase, pedir el token
 *   de los avisos tumba la app, así que el front pregunta antes.
 * - abrir({ url }): abre el inicio de sesión de Google en una pestaña segura de Chrome
 *   (Google no deja entrar desde la vista web de la app) y devuelve la dirección de regreso
 *   co.leasefy.app://auth/callback?code=… para que el front canjee el código.
 */
@CapacitorPlugin(name = "LeasefyNativo")
public class LeasefyNativoPlugin extends Plugin {

    private static final String ESQUEMA = "co.leasefy.app";
    private PluginCall llamadaDeSesion;
    private final Handler hilo = new Handler(Looper.getMainLooper());

    @PluginMethod
    public void estado(PluginCall call) {
        int idDeFirebase = getContext().getResources()
            .getIdentifier("google_app_id", "string", getContext().getPackageName());
        JSObject respuesta = new JSObject();
        respuesta.put("firebase", idDeFirebase != 0);
        respuesta.put("plataforma", "android");
        call.resolve(respuesta);
    }

    @PluginMethod
    public void abrir(PluginCall call) {
        String url = call.getString("url");
        if (url == null || !url.startsWith("https://")) {
            call.reject("La dirección para entrar no es válida.", "URL_INVALIDA");
            return;
        }
        if (llamadaDeSesion != null) {
            llamadaDeSesion.reject("Se abrió otro inicio de sesión.", "REEMPLAZADO");
            soltar();
        }
        call.setKeepAlive(true);
        getBridge().saveCall(call);
        llamadaDeSesion = call;

        CustomTabsIntent pestana = new CustomTabsIntent.Builder().setShowTitle(true).build();
        getActivity().runOnUiThread(() -> pestana.launchUrl(getActivity(), Uri.parse(url)));
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        Uri regreso = intent != null ? intent.getData() : null;
        if (llamadaDeSesion == null || regreso == null || !ESQUEMA.equals(regreso.getScheme())) {
            return;
        }
        JSObject respuesta = new JSObject();
        respuesta.put("url", regreso.toString());
        llamadaDeSesion.resolve(respuesta);
        soltar();
    }

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        if (llamadaDeSesion == null) {
            return;
        }
        // Al volver con el código, Android entrega primero el enlace (handleOnNewIntent) y
        // después reanuda. Si la llamada sigue abierta un momento después, la persona cerró
        // la pestaña sin entrar.
        final PluginCall pendiente = llamadaDeSesion;
        hilo.postDelayed(() -> {
            if (llamadaDeSesion == pendiente) {
                pendiente.reject("La persona cerró la ventana sin entrar.", "CANCELADO");
                soltar();
            }
        }, 600);
    }

    private void soltar() {
        if (llamadaDeSesion != null) {
            getBridge().releaseCall(llamadaDeSesion);
        }
        llamadaDeSesion = null;
    }
}
