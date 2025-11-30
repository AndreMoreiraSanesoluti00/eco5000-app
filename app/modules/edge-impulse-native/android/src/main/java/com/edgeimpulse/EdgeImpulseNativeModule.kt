package com.edgeimpulse

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class EdgeImpulseNativeModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("EdgeImpulseNative")

        OnCreate {
            System.loadLibrary("EdgeImpulseNative")
        }

        // Model 1 (MFE - Skeptic) functions
        AsyncFunction("initModel1") {
            initModel1()
        }

        AsyncFunction("runInferenceModel1") { audioData: FloatArray ->
            val result = runInferenceModel1(audioData)
            mapOf(
                "label" to result.label,
                "confidence" to result.confidence,
                "timing" to mapOf(
                    "dsp" to result.dspTime,
                    "classification" to result.classificationTime,
                    "anomaly" to result.anomalyTime
                )
            )
        }

        AsyncFunction("getModel1Info") {
            val info = getModel1Info()
            mapOf(
                "name" to info.name,
                "projectId" to info.projectId,
                "labels" to info.labels.toList(),
                "frequency" to info.frequency,
                "threshold" to info.threshold
            )
        }

        AsyncFunction("isModel1Initialized") {
            true  // Always initialized after initModel1
        }

        // Model 2 (Wavelet - Paranoid) functions
        AsyncFunction("initModel2") {
            initModel2()
        }

        AsyncFunction("runInferenceModel2") { audioData: FloatArray ->
            val result = runInferenceModel2(audioData)
            mapOf(
                "label" to result.label,
                "confidence" to result.confidence,
                "timing" to mapOf(
                    "dsp" to result.dspTime,
                    "classification" to result.classificationTime,
                    "anomaly" to result.anomalyTime
                )
            )
        }

        AsyncFunction("getModel2Info") {
            val info = getModel2Info()
            mapOf(
                "name" to info.name,
                "projectId" to info.projectId,
                "labels" to info.labels.toList(),
                "frequency" to info.frequency,
                "threshold" to info.threshold
            )
        }

        AsyncFunction("isModel2Initialized") {
            true  // Always initialized after initModel2
        }
    }

    // Native method declarations
    private external fun initModel1(): Boolean
    private external fun runInferenceModel1(audioData: FloatArray): EdgeImpulseResult
    private external fun getModel1Info(): EdgeImpulseModelInfo

    private external fun initModel2(): Boolean
    private external fun runInferenceModel2(audioData: FloatArray): EdgeImpulseResult
    private external fun getModel2Info(): EdgeImpulseModelInfo
}
