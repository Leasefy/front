package co.leasefy.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(LeasefyNativoPlugin.class);
        super.onCreate(savedInstanceState);
        crearCanalDeAvisos();
    }

    /**
     * Los avisos de Leasefy llegan por el canal «avisos» (lo nombra el manifiesto como canal
     * por defecto de Firebase). Prioridad alta: suenan y se asoman arriba de la pantalla.
     */
    private void crearCanalDeAvisos() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }
        NotificationManager gestor = getSystemService(NotificationManager.class);
        if (gestor == null || gestor.getNotificationChannel("avisos") != null) {
            return;
        }
        NotificationChannel canal = new NotificationChannel(
            "avisos",
            getString(R.string.canal_de_avisos),
            NotificationManager.IMPORTANCE_HIGH
        );
        canal.setDescription(getString(R.string.canal_de_avisos_descripcion));
        gestor.createNotificationChannel(canal);
    }
}
