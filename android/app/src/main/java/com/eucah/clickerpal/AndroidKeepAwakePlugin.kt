package com.eucah.clickerpal

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

        activity?.runOnUiThread {
            if (enabled) {
                activity.window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            } else {
                activity.window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            }
            call.resolve()
        } ?: call.reject("Activity unavailable")
    }
}
