package com.sncf.androidenterprise.internal.essaiscontinuite

import android.view.WindowManager
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "AndroidKeepAwake")
class AndroidKeepAwakePlugin : Plugin() {

    @PluginMethod
    fun setKeepAwake(call: PluginCall) {
        val enabled = call.getBoolean("enabled", false) ?: false

        val activity = activity
        if (activity == null) {
            call.reject("Activity unavailable")
            return
        }

        activity.runOnUiThread {
            try {
                if (enabled) {
                    activity.window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                } else {
                    activity.window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                }
                call.resolve()
            } catch (e: Exception) {
                call.reject("Failed to set keep awake", e)
            }
        }
    }
}
