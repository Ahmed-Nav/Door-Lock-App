package com.doorlockapp

import android.bluetooth.BluetoothManager
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.content.Context
import android.util.Base64
import com.facebook.react.bridge.*

class BeaconAdvertiserModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private var advertiserCallback: AdvertiseCallback? = null
  private var advertiser: android.bluetooth.le.BluetoothLeAdvertiser? = null

  override fun getName(): String = "BeaconAdvertiser"

  @ReactMethod
  fun startAdvertising(base64Payload: String, manufacturerId: Int, promise: Promise) {
    try {
      val ctx = reactContext
      val btManager = ctx.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
      val adapter = btManager.adapter
      if (adapter == null || !adapter.isEnabled) {
        promise.reject("BT_OFF", "Bluetooth adapter is null or turned off")
        return
      }
      if (!adapter.isMultipleAdvertisementSupported) {
        promise.reject("NO_ADV_SUPPORT", "Device does not support BLE Advertising")
        return
      }
      advertiser = adapter.bluetoothLeAdvertiser
      if (advertiser == null) {
        promise.reject("NO_ADVERTISER", "BluetoothLeAdvertiser is null")
        return
      }

      val payloadBytes = Base64.decode(base64Payload, Base64.DEFAULT)

      val settings = AdvertiseSettings.Builder()
        .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
        .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
        .setConnectable(false)
        .build()

      val dataBuilder = AdvertiseData.Builder()
      dataBuilder.addManufacturerData(manufacturerId, payloadBytes)
      val advertiseData = dataBuilder.build()

      advertiserCallback = object : AdvertiseCallback() {
        override fun onStartSuccess(settingsInEffect: AdvertiseSettings) {
          super.onStartSuccess(settingsInEffect)
          promise.resolve("ADVERTISING_STARTED")
        }
        override fun onStartFailure(errorCode: Int) {
          super.onStartFailure(errorCode)
          promise.reject("ADVERTISE_FAILED", "Advertise failed, code: $errorCode")
        }
      }

      advertiser!!.startAdvertising(settings, advertiseData, advertiserCallback)
    } catch (e: Exception) {
      promise.reject("ERR", e.message)
    }
  }

  @ReactMethod
  fun stopAdvertising(promise: Promise) {
    try {
      advertiser?.stopAdvertising(advertiserCallback)
      advertiserCallback = null
      advertiser = null
      promise.resolve("ADVERTISING_STOPPED")
    } catch (e: Exception) {
      promise.reject("ERR", e.message)
    }
  }
}
