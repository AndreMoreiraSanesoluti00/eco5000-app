package com.sanesoluti.eco5000

import android.util.Log
import com.facebook.react.bridge.*

class EdgeImpulseModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val TAG = "EdgeImpulseModule"

        init {
            try {
                System.loadLibrary("EdgeImpulseModule")
                Log.d(TAG, "EdgeImpulseModule native library loaded successfully")
            } catch (e: UnsatisfiedLinkError) {
                Log.e(TAG, "Failed to load EdgeImpulseModule native library: ${e.message}")
            }
        }

        @JvmStatic
        external fun runInferenceModel1Native(audioData: FloatArray): String

        @JvmStatic
        external fun runInferenceModel2Native(audioData: FloatArray): String

        @JvmStatic
        external fun getModel1InfoNative(): String
    }

    override fun getName(): String {
        return "EdgeImpulseModule"
    }

    @ReactMethod
    fun runInferenceModel1(audioData: ReadableArray, promise: Promise) {
        try {
            Log.d(TAG, "[Modelo1] Received audio array with ${audioData.size()} samples")

            val audioFloatArray = FloatArray(audioData.size())
            for (i in 0 until audioData.size()) {
                audioFloatArray[i] = audioData.getDouble(i).toFloat()
            }

            Log.d(TAG, "[Modelo1] Calling native inference...")
            val result = runInferenceModel1Native(audioFloatArray)
            Log.d(TAG, "[Modelo1] Native inference result: $result")

            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "[Modelo1] Error: ${e.message}", e)
            promise.reject("INFERENCE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun runInferenceModel2(audioData: ReadableArray, promise: Promise) {
        try {
            Log.d(TAG, "[Modelo2] Received audio array with ${audioData.size()} samples")

            val audioFloatArray = FloatArray(audioData.size())
            for (i in 0 until audioData.size()) {
                audioFloatArray[i] = audioData.getDouble(i).toFloat()
            }

            Log.d(TAG, "[Modelo2] Calling native inference...")
            val result = runInferenceModel2Native(audioFloatArray)
            Log.d(TAG, "[Modelo2] Native inference result: $result")

            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "[Modelo2] Error: ${e.message}", e)
            promise.reject("INFERENCE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getModel1Info(promise: Promise) {
        try {
            val info = getModel1InfoNative()
            promise.resolve(info)
        } catch (e: Exception) {
            Log.e(TAG, "[Model1Info] Error: ${e.message}", e)
            promise.reject("INFO_ERROR", e.message, e)
        }
    }
}
