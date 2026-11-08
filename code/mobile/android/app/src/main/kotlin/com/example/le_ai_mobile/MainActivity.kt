package com.example.le_ai_mobile

import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        criarCanalDeNotificacoes()
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CANAL_DE_AJUSTES)
            .setMethodCallHandler { chamada, resultado ->
                if (chamada.method == METODO_ABRIR_AJUSTES_DE_NOTIFICACAO) {
                    abrirAjustesDeNotificacao()
                    resultado.success(null)
                } else {
                    resultado.notImplemented()
                }
            }
    }

    private fun abrirAjustesDeNotificacao() {
        val intencao = Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
            .putExtra(Settings.EXTRA_APP_PACKAGE, packageName)
        startActivity(intencao)
    }

    private fun criarCanalDeNotificacoes() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return
        }
        val canal = NotificationChannel(
            CANAL_DE_NOTIFICACOES,
            NOME_DO_CANAL,
            NotificationManager.IMPORTANCE_HIGH,
        )
        getSystemService(NotificationManager::class.java).createNotificationChannel(canal)
    }

    private companion object {
        const val CANAL_DE_NOTIFICACOES = "leai_notificacoes"
        const val NOME_DO_CANAL = "Notificações"
        const val CANAL_DE_AJUSTES = "leai/ajustes"
        const val METODO_ABRIR_AJUSTES_DE_NOTIFICACAO = "abrirAjustesDeNotificacao"
    }
}
