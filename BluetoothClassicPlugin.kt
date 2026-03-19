package com.eucah.clickerpal

import android.Manifest
import android.app.Activity
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothServerSocket
import android.bluetooth.BluetoothSocket
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.activity.result.contract.ActivityResultContracts
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.util.UUID
import java.util.concurrent.atomic.AtomicBoolean

@CapacitorPlugin(
    name = "BluetoothClassic",
    permissions = [
        Permission(
            strings = [
                Manifest.permission.BLUETOOTH_CONNECT,
                Manifest.permission.BLUETOOTH_SCAN
            ],
            alias = "bluetooth"
        ),
        Permission(
            strings = [
                Manifest.permission.ACCESS_FINE_LOCATION
            ],
            alias = "location"
        )
    ]
)
class BluetoothClassicPlugin : Plugin() {

    companion object {
        private const val TAG = "BluetoothClassicPlugin"
        private const val SERVICE_NAME = "ClickerPalLink"
        private val SPP_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")
    }

    private var bluetoothAdapter: BluetoothAdapter? = null
    private var serverSocket: BluetoothServerSocket? = null
    private var socket: BluetoothSocket? = null
    private var reader: BufferedReader? = null
    private var writer: OutputStreamWriter? = null

    private var serverThread: Thread? = null
    private var readThread: Thread? = null
    private val keepReading = AtomicBoolean(false)

    private var currentState: String = "disconnected"

    override fun load() {
        super.load()
        val manager = context.getSystemService(Activity.BLUETOOTH_SERVICE) as BluetoothManager
        bluetoothAdapter = manager.adapter
        logAndNotify("Plugin loaded")
    }

    private fun hasConnectPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            getPermissionState("bluetooth") == PermissionState.GRANTED
        } else {
            true
        }
    }

    private fun hasScanPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            getPermissionState("bluetooth") == PermissionState.GRANTED
        } else {
            true
        }
    }

    private fun ensurePermissions(call: PluginCall): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (!hasConnectPermission() || !hasScanPermission()) {
                requestPermissionForAlias("bluetooth", call, "permissionsCallback")
                return false
            }
        }
        return true
    }

    @Suppress("unused")
    private fun permissionsCallback(call: PluginCall) {
        val ret = JSObject()
        ret.put("granted", true)
        call.resolve(ret)
    }

    @PluginMethod
    fun isBluetoothAvailable(call: PluginCall) {
        val ret = JSObject()
        ret.put("available", bluetoothAdapter != null)
        call.resolve(ret)
    }

    @PluginMethod
    fun isBluetoothEnabled(call: PluginCall) {
        val ret = JSObject()
        ret.put("enabled", bluetoothAdapter?.isEnabled == true)
        call.resolve(ret)
    }

    @PluginMethod
    fun enableBluetooth(call: PluginCall) {
        val adapter = bluetoothAdapter
        if (adapter == null) {
            call.reject("Bluetooth indisponible")
            return
        }

        if (adapter.isEnabled) {
            val ret = JSObject()
            ret.put("enabled", true)
            call.resolve(ret)
            return
        }

        try {
            val