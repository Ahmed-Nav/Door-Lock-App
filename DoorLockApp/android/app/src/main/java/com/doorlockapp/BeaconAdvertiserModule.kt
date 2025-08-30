package com.doorlockapp

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.bluetooth.le.BluetoothLeAdvertiser
import android.content.Context
import android.util.Base64
import com.facebook.react.bridge.*

class BeaconAdvertiserModule(private val reactContext: ReactApplicationContext)
  : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "BeaconAdvertiser"

  private var advertiser: BluetoothLeAdvertiser? = null

  @Volatile private var running = false
  @Volatile private var pendingStart: Promise? = null

  // SINGLE, reusable callback (critical!)
  private val advCallback = object : AdvertiseCallback() {
    override fun onStartSuccess(settingsInEffect: AdvertiseSettings) {
      running = true
      pendingStart?.resolve(true)
      pendingStart = null
    }
    override fun onStartFailure(errorCode: Int) {
      running = false
      val reason = when (errorCode) {
        ADVERTISE_FAILED_DATA_TOO_LARGE -> "DATA_TOO_LARGE"
        ADVERTISE_FAILED_TOO_MANY_ADVERTISERS -> "TOO_MANY_ADVERTISERS"
        ADVERTISE_FAILED_ALREADY_STARTED -> "ALREADY_STARTED"
        ADVERTISE_FAILED_INTERNAL_ERROR -> "INTERNAL_ERROR"
        ADVERTISE_FAILED_FEATURE_UNSUPPORTED -> "FEATURE_UNSUPPORTED"
        else -> "UNKNOWN"
      }
      pendingStart?.reject("ADVERTISE_FAILED", "code=$errorCode ($reason)")
      pendingStart = null
    }
  }

  @Synchronized
  @ReactMethod
  fun startAdvertising(base64Payload: String, manufacturerId: Int, promise: Promise) {
    try {
      val btMgr = reactContext.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
      val adapter: BluetoothAdapter = btMgr.adapter
        ?: return promise.reject("BT_NULL", "Bluetooth adapter is null")
      if (!adapter.isEnabled) return promise.reject("BT_OFF", "Bluetooth is off")
      if (!adapter.isMultipleAdvertisementSupported) {
        return promise.reject("NO_ADV_SUPPORT", "BLE Advertising not supported")
      }

      val adv = adapter.bluetoothLeAdvertiser
        ?: return promise.reject("NO_ADVERTISER", "BluetoothLeAdvertiser is null")
      advertiser = adv

      // STOP any previous advertiser using the SAME callback
      if (running) {
        adv.stopAdvertising(advCallback)
        running = false
      }

      val payload = Base64.decode(base64Payload, Base64.DEFAULT)

      val settings = AdvertiseSettings.Builder()
        .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
        .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
        .setConnectable(false)
        .build()

      val data = AdvertiseData.Builder()
        .addManufacturerData(manufacturerId, payload)
        .setIncludeDeviceName(false)
        .setIncludeTxPowerLevel(false)
        .build()

      pendingStart = promise
      adv.startAdvertising(settings, data, advCallback)

    } catch (e: Exception) {
      running = false
      pendingStart = null
      promise.reject("ERR", e.message)
    }
  }

  @Synchronized
  @ReactMethod
  fun stopAdvertising(promise: Promise) {
    try {
      advertiser?.stopAdvertising(advCallback)
      running = false
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("ERR", e.message)
    }
  }

  @Synchronized
  @ReactMethod
  fun isAdvertising(promise: Promise) {
    promise.resolve(running)
  }
}
