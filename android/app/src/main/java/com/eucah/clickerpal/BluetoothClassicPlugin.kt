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
import androidx.activity.result.ActivityResult
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import java.io.BufferedReader
import java.io.IOException
import java.io.InputStream
import java.io.InputStreamReader
import java.io.OutputStream
import java.io.OutputStreamWriter
import java.nio.charset.StandardCharsets
import java.util.UUID
import java.util.concurrent.atomic.AtomicBoolean

@CapacitorPlugin(
    name = "BluetoothClassic",
    permissions = [
        Permission(
            alias = "bluetooth",
            strings = [
                Manifest.permission.BLUETOOTH_CONNECT,
                Manifest.permission.BLUETOOTH_SCAN
            ]
        )
    ]
)
class BluetoothClassicPlugin : Plugin() {

    companion object {
        private const val TAG = "BluetoothClassicPlugin"
        private const val SERVICE_NAME = "ClickerPalLink"
        private const val STATE_DISCONNECTED = "disconnected"
        private const val STATE_ADVERTISING = "advertising"
        private const val STATE_CONNECTED = "connected"
        private val SPP_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")
    }

    @Volatile
    private var bluetoothAdapter: BluetoothAdapter? = null

    @Volatile
    private var serverSocket: BluetoothServerSocket? = null

    @Volatile
    private var socket: BluetoothSocket? = null

    @Volatile
    private var reader: BufferedReader? = null

    @Volatile
    private var writer: OutputStreamWriter? = null

    @Volatile
    private var inputStream: InputStream? = null

    @Volatile
    private var outputStream: OutputStream? = null

    @Volatile
    private var currentState: String = STATE_DISCONNECTED

    @Volatile
    private var serverModeEnabled = false

    private val keepReading = AtomicBoolean(false)
    private val isStopping = AtomicBoolean(false)
    private val connectionLock = Any()

    private var serverThread: Thread? = null
    private var clientThread: Thread? = null
    private var readThread: Thread? = null

    override fun load() {
        super.load()
        val manager = context.getSystemService(Activity.BLUETOOTH_SERVICE) as BluetoothManager
        bluetoothAdapter = manager.adapter
        emitLog("Plugin loaded")
        notifyStatus(currentState)
    }

    @PluginMethod
    fun isBluetoothAvailable(call: PluginCall) {
        call.resolve(JSObject().putValue("available", bluetoothAdapter != null))
    }

    @PluginMethod
    fun isBluetoothEnabled(call: PluginCall) {
        call.resolve(JSObject().putValue("enabled", bluetoothAdapter?.isEnabled == true))
    }

    @PluginMethod
    fun enableBluetooth(call: PluginCall) {
        if (!ensureBluetoothPermissions(call)) {
            return
        }

        val adapter = bluetoothAdapter
        if (adapter == null) {
            call.reject("Bluetooth indisponible sur cet appareil")
            return
        }

        if (adapter.isEnabled) {
            emitLog("Bluetooth already enabled")
            call.resolve(JSObject().putValue("enabled", true))
            return
        }

        emitLog("Requesting Bluetooth enable")
        val intent = Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE)
        startActivityForResult(call, intent, "handleEnableBluetoothResult")
    }

    @ActivityCallback
    private fun handleEnableBluetoothResult(call: PluginCall?, result: ActivityResult?) {
        val enabled = bluetoothAdapter?.isEnabled == true && result?.resultCode == Activity.RESULT_OK
        emitLog("Bluetooth enable result: $enabled")

        if (call == null) {
            return
        }

        if (!enabled) {
            call.reject("Bluetooth non activé")
            return
        }

        call.resolve(JSObject().putValue("enabled", true))
    }

    @PluginMethod
    fun getBondedDevices(call: PluginCall) {
        if (!ensureBluetoothPermissions(call)) {
            return
        }

        val adapter = requireEnabledAdapter(call) ?: return
        val devices = JSArray()

        adapter.bondedDevices
            ?.sortedBy { it.name ?: it.address }
            ?.forEach { device ->
                val item = JSObject()
                item.put("deviceId", device.address)
                item.put("name", device.name ?: device.address)
                devices.put(item)
            }

        emitLog("Bonded devices listed: ${devices.length()}")
        val result = JSObject()
        result.put("devices", devices)
        call.resolve(result)
    }

    @PluginMethod
    fun startServer(call: PluginCall) {
        if (!ensureBluetoothPermissions(call)) {
            return
        }

        val adapter = requireEnabledAdapter(call) ?: return
        emitLog("Starting Bluetooth Classic server")

        synchronized(connectionLock) {
            serverModeEnabled = true
            closeClientThreadLocked()
            closeServerThreadLocked()
            closeCurrentSocketLocked(emitEvents = false)

            try {
                serverSocket = adapter.listenUsingRfcommWithServiceRecord(SERVICE_NAME, SPP_UUID)
            } catch (exception: IOException) {
                serverModeEnabled = false
                emitLog("Failed to create server socket: ${exception.message}")
                call.reject("Impossible de démarrer le serveur Bluetooth", exception)
                return
            }

            notifyStatus(STATE_ADVERTISING)

            serverThread = Thread({
                acceptIncomingConnection()
            }, "BtClassicServerThread").also { it.start() }
        }

        call.resolve()
    }

    @PluginMethod
    fun stopServer(call: PluginCall) {
        emitLog("Stopping Bluetooth Classic server")
        synchronized(connectionLock) {
            serverModeEnabled = false
            closeServerSocketLocked()
            closeServerThreadLocked()
            if (socket == null) {
                notifyStatus(STATE_DISCONNECTED)
            }
        }
        call.resolve()
    }

    @PluginMethod
    fun connect(call: PluginCall) {
        if (!ensureBluetoothPermissions(call)) {
            return
        }

        val adapter = requireEnabledAdapter(call) ?: return
        val deviceAddress = call.getString("deviceAddress")?.trim().orEmpty()
        if (deviceAddress.isBlank()) {
            call.reject("Adresse MAC Bluetooth manquante")
            return
        }

        val device = try {
            adapter.getRemoteDevice(deviceAddress)
        } catch (_: IllegalArgumentException) {
            null
        }

        if (device == null) {
            call.reject("Appareil Bluetooth introuvable")
            return
        }

        emitLog("Connecting to device $deviceAddress")

        synchronized(connectionLock) {
            serverModeEnabled = false
            closeServerSocketLocked()
            closeServerThreadLocked()
            closeClientThreadLocked()
            closeCurrentSocketLocked(emitEvents = false)

            clientThread = Thread({
                connectToRemoteDevice(device, call)
            }, "BtClassicClientThread").also { it.start() }
        }
    }

    @PluginMethod
    fun disconnect(call: PluginCall) {
        emitLog("Disconnect requested")
        synchronized(connectionLock) {
            terminateConnectionLocked(
                reason = "disconnect requested",
                resumeServerIfNeeded = serverModeEnabled
            )
            if (serverModeEnabled) {
                notifyStatus(STATE_ADVERTISING)
            }
        }
        call.resolve()
    }

    @PluginMethod
    fun sendMessage(call: PluginCall) {
        val message = call.getString("message")
        if (message == null) {
            call.reject("Message manquant")
            return
        }

        val writerSnapshot = writer
        if (writerSnapshot == null || socket?.isConnected != true) {
            call.reject("Aucune connexion Bluetooth active")
            return
        }

        val payload = if (message.endsWith("\n")) message else "$message\n"

        try {
            synchronized(writerSnapshot) {
                writerSnapshot.write(payload)
                writerSnapshot.flush()
            }
            emitLog("Message sent: ${message.take(200)}")
            call.resolve(JSObject().putValue("sent", true))
        } catch (exception: IOException) {
            emitLog("Send failed: ${exception.message}")
            handleConnectionClosed("send failed", resumeServerIfNeeded = serverModeEnabled)
            call.reject("Échec d'envoi Bluetooth", exception)
        }
    }

    @PluginMethod
    fun startListening(call: PluginCall) {
        val activeSocket = socket
        if (activeSocket == null || activeSocket.isConnected != true) {
            call.reject("Aucune connexion Bluetooth active")
            return
        }

        synchronized(connectionLock) {
            startReadLoopLocked(activeSocket)
        }
        emitLog("Listening started")
        call.resolve()
    }

    @PluginMethod
    fun stopListening(call: PluginCall) {
        emitLog("Listening stopped")
        synchronized(connectionLock) {
            stopReadLoopLocked()
        }
        call.resolve()
    }

    @PluginMethod
    fun getConnectionState(call: PluginCall) {
        val result = JSObject()
        result.put("state", currentState)
        call.resolve(result)
    }

    private fun acceptIncomingConnection() {
        val serverSocketSnapshot = serverSocket
        if (serverSocketSnapshot == null) {
            return
        }

        try {
            emitLog("Server waiting for incoming connection")
            val acceptedSocket = serverSocketSnapshot.accept()
            synchronized(connectionLock) {
                closeServerSocketLocked()
                handleConnectedSocketLocked(acceptedSocket, "incoming")
            }
        } catch (exception: IOException) {
            val shouldResume = synchronized(connectionLock) {
                serverModeEnabled && currentState != STATE_CONNECTED
            }
            emitLog("Server accept finished: ${exception.message}")
            if (shouldResume) {
                synchronized(connectionLock) {
                    closeServerSocketLocked()
                    notifyStatus(STATE_DISCONNECTED)
                    startAcceptThreadLocked()
                }
            }
        }
    }

    private fun connectToRemoteDevice(device: BluetoothDevice, call: PluginCall) {
        try {
            bluetoothAdapter?.cancelDiscovery()
            val clientSocket = device.createRfcommSocketToServiceRecord(SPP_UUID)
            clientSocket.connect()
            synchronized(connectionLock) {
                handleConnectedSocketLocked(clientSocket, "outgoing")
            }
            call.resolve()
        } catch (exception: IOException) {
            emitLog("Connection failed to ${device.address}: ${exception.message}")
            synchronized(connectionLock) {
                closeCurrentSocketLocked(emitEvents = false)
                notifyStatus(STATE_DISCONNECTED)
            }
            call.reject("Impossible de se connecter à ${device.name ?: device.address}", exception)
        }
    }

    private fun handleConnectedSocketLocked(newSocket: BluetoothSocket, origin: String) {
        terminateConnectionLocked(
            reason = "replace active socket",
            resumeServerIfNeeded = false
        )
        socket = newSocket
        inputStream = newSocket.inputStream
        outputStream = newSocket.outputStream
        reader = BufferedReader(InputStreamReader(inputStream, StandardCharsets.UTF_8))
        writer = OutputStreamWriter(outputStream, StandardCharsets.UTF_8)
        emitLog("Socket connected ($origin) to ${newSocket.remoteDevice?.address}")
        notifyStatus(STATE_CONNECTED)
        startReadLoopLocked(newSocket)
    }

    private fun startAcceptThreadLocked() {
        if (!serverModeEnabled) {
            return
        }

        val adapter = bluetoothAdapter
        if (adapter == null || adapter.isEnabled != true) {
            notifyStatus(STATE_DISCONNECTED)
            return
        }

        if (socket?.isConnected == true) {
            notifyStatus(STATE_CONNECTED)
            return
        }

        closeServerThreadLocked()
        closeServerSocketLocked()

        try {
            serverSocket = adapter.listenUsingRfcommWithServiceRecord(SERVICE_NAME, SPP_UUID)
            notifyStatus(STATE_ADVERTISING)
            serverThread = Thread({
                acceptIncomingConnection()
            }, "BtClassicServerThread").also { it.start() }
            emitLog("Server restarted and waiting for reconnection")
        } catch (exception: IOException) {
            emitLog("Unable to restart server: ${exception.message}")
            notifyStatus(STATE_DISCONNECTED)
        }
    }

    private fun startReadLoopLocked(activeSocket: BluetoothSocket) {
        if (readThread?.isAlive == true) {
            return
        }

        keepReading.set(true)
        readThread = Thread({
            emitLog("Read loop started")
            try {
                while (keepReading.get()) {
                    val line = reader?.readLine() ?: break
                    emitLog("Message received: ${line.take(200)}")
                    val payload = JSObject()
                    payload.put("message", line)
                    notifyListeners("btData", payload)
                }
            } catch (exception: IOException) {
                emitLog("Read loop stopped: ${exception.message}")
            } finally {
                val shouldHandleClose = synchronized(connectionLock) {
                    socket == activeSocket
                }
                if (shouldHandleClose) {
                    handleConnectionClosed("reader ended", resumeServerIfNeeded = serverModeEnabled)
                }
            }
        }, "BtClassicReadThread").also { it.start() }
    }

    private fun handleConnectionClosed(reason: String, resumeServerIfNeeded: Boolean) {
        synchronized(connectionLock) {
            emitLog("Connection closed: $reason")
            terminateConnectionLocked(reason, resumeServerIfNeeded)
        }
    }

    private fun stopReadLoopLocked() {
        keepReading.set(false)
        readThread?.interrupt()
        readThread = null
    }

    private fun closeCurrentSocketLocked(emitEvents: Boolean) {
        stopReadLoopLocked()

        try {
            socket?.close()
        } catch (_: IOException) {
        }
        socket = null

        try {
            inputStream?.close()
        } catch (_: IOException) {
        }
        inputStream = null

        try {
            outputStream?.close()
        } catch (_: IOException) {
        }
        outputStream = null

        try {
            reader?.close()
        } catch (_: IOException) {
        }
        reader = null

        try {
            writer?.close()
        } catch (_: IOException) {
        }
        writer = null

        if (emitEvents) {
            notifyStatus(if (serverModeEnabled) STATE_ADVERTISING else STATE_DISCONNECTED)
        }
    }

    private fun terminateConnectionLocked(reason: String, resumeServerIfNeeded: Boolean) {
        if (!isStopping.compareAndSet(false, true)) {
            emitLog("Terminate already in progress: $reason")
            return
        }

        try {
            emitLog("Terminating connection: $reason")
            closeCurrentSocketLocked(emitEvents = false)
            closeClientThreadLocked()

            if (resumeServerIfNeeded) {
                startAcceptThreadLocked()
            } else {
                notifyStatus(STATE_DISCONNECTED)
            }
        } finally {
            isStopping.set(false)
        }
    }

    private fun closeServerSocketLocked() {
        try {
            serverSocket?.close()
        } catch (_: IOException) {
        }
        serverSocket = null
    }

    private fun closeServerThreadLocked() {
        serverThread?.interrupt()
        serverThread = null
    }

    private fun closeClientThreadLocked() {
        clientThread?.interrupt()
        clientThread = null
    }

    private fun requireEnabledAdapter(call: PluginCall): BluetoothAdapter? {
        val adapter = bluetoothAdapter
        if (adapter == null) {
            call.reject("Bluetooth indisponible sur cet appareil")
            return null
        }
        if (!adapter.isEnabled) {
            call.reject("Bluetooth désactivé")
            return null
        }
        return adapter
    }

    private fun ensureBluetoothPermissions(call: PluginCall): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            return true
        }

        return if (getPermissionState("bluetooth") == PermissionState.GRANTED) {
            true
        } else {
            requestPermissionForAlias("bluetooth", call, "onBluetoothPermissionResult")
            false
        }
    }

    @PermissionCallback
    private fun onBluetoothPermissionResult(call: PluginCall) {
        if (getPermissionState("bluetooth") != PermissionState.GRANTED) {
            call.reject("Permissions Bluetooth refusées")
            return
        }

        when (call.methodName) {
            "enableBluetooth" -> enableBluetooth(call)
            "getBondedDevices" -> getBondedDevices(call)
            "startServer" -> startServer(call)
            "connect" -> connect(call)
            else -> call.resolve()
        }
    }

    private fun notifyStatus(state: String) {
        currentState = state
        val payload = JSObject()
        payload.put("state", state)
        notifyListeners("btStatus", payload)
    }

    private fun emitLog(message: String) {
        Log.d(TAG, message)
        val payload = JSObject()
        payload.put("message", message)
        notifyListeners("btLog", payload)
    }

    private fun JSObject.putValue(key: String, value: Boolean): JSObject {
        put(key, value)
        return this
    }
}
