#include <jni.h>
#include <android/log.h>
#include <vector>
#include <string>
#include <cstring>

// Modelo 1 - MFE
#define EI_CLASSIFIER_ALLOCATION_STATIC
#include "edge-impulse-sdk/classifier/ei_run_classifier.h"
#include "edge-impulse-sdk/classifier/ei_classifier_types.h"
#include "model-parameters/model_metadata.h"

#define TAG "EdgeImpulseModule"
#define LOGD(...) __android_log_print(ANDROID_LOG_DEBUG, TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, TAG, __VA_ARGS__)
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, TAG, __VA_ARGS__)

// Signal callback for Modelo 1
static float modelo1_audio_buffer[EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE];

static int modelo1_get_signal_data(size_t offset, size_t length, float *out_ptr) {
    memcpy(out_ptr, modelo1_audio_buffer + offset, length * sizeof(float));
    return 0;
}

extern "C" {

/**
 * Run inference on Modelo 1 (MFE + Neural Network)
 */
JNIEXPORT jstring JNICALL
Java_com_sanesoluti_eco5000_EdgeImpulseModule_runInferenceModel1Native(
    JNIEnv* env,
    jclass clazz,
    jfloatArray audioDataArray
) {
    LOGD("[Modelo1] Starting inference...");

    try {
        // Get audio data
        jsize audioDataLength = env->GetArrayLength(audioDataArray);
        jfloat* audioData = env->GetFloatArrayElements(audioDataArray, nullptr);

        LOGD("[Modelo1] Received %d audio samples", audioDataLength);

        // Check size
        if (audioDataLength != EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE) {
            LOGE("[Modelo1] Expected %d samples, got %d",
                 EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE, audioDataLength);

            env->ReleaseFloatArrayElements(audioDataArray, audioData, JNI_ABORT);
            return env->NewStringUTF("{\"error\":\"Invalid input size\"}");
        }

        // Copy to buffer
        memcpy(modelo1_audio_buffer, audioData, audioDataLength * sizeof(float));

        // Release Java array
        env->ReleaseFloatArrayElements(audioDataArray, audioData, JNI_ABORT);

        // Setup signal structure
        signal_t signal;
        signal.total_length = EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE;
        signal.get_data = &modelo1_get_signal_data;

        // Allocate result structure
        ei_impulse_result_t result = { 0 };

        LOGD("[Modelo1] Running classifier (DSP + Inference)...");

        // Run the classifier (DSP + Neural Network)
        EI_IMPULSE_ERROR res = run_classifier(&signal, &result, false);

        if (res != EI_IMPULSE_OK) {
            LOGE("[Modelo1] run_classifier failed: %d", res);
            return env->NewStringUTF("{\"error\":\"Inference failed\"}");
        }

        LOGD("[Modelo1] Inference successful!");
        LOGD("[Modelo1] DSP time: %d ms", result.timing.dsp);
        LOGD("[Modelo1] Classification time: %d ms", result.timing.classification);

        // Build JSON result
        std::string jsonResult = "{";
        jsonResult += "\"timing\":{";
        jsonResult += "\"dsp\":" + std::to_string(result.timing.dsp) + ",";
        jsonResult += "\"classification\":" + std::to_string(result.timing.classification) + ",";
        jsonResult += "\"anomaly\":" + std::to_string(result.timing.anomaly);
        jsonResult += "},";

        jsonResult += "\"classifications\":[";
        for (size_t i = 0; i < EI_CLASSIFIER_LABEL_COUNT; i++) {
            if (i > 0) jsonResult += ",";
            jsonResult += "{";
            jsonResult += "\"label\":\"" + std::string(result.classification[i].label) + "\",";
            jsonResult += "\"value\":" + std::to_string(result.classification[i].value);
            jsonResult += "}";

            LOGD("[Modelo1] %s: %.5f",
                 result.classification[i].label,
                 result.classification[i].value);
        }
        jsonResult += "]}";

        return env->NewStringUTF(jsonResult.c_str());

    } catch (const std::exception& e) {
        LOGE("[Modelo1] Exception: %s", e.what());
        return env->NewStringUTF("{\"error\":\"Exception occurred\"}");
    }
}

/**
 * Run inference on Modelo 2 (Wavelet)
 * Placeholder - requires namespace isolation
 */
JNIEXPORT jstring JNICALL
Java_com_sanesoluti_eco5000_EdgeImpulseModule_runInferenceModel2Native(
    JNIEnv* env,
    jclass clazz,
    jfloatArray audioDataArray
) {
    LOGD("[Modelo2] Starting inference...");

    // TODO: Implement Modelo 2 with namespace isolation
    return env->NewStringUTF(
        "{\"error\":\"Modelo 2 not yet implemented - requires namespace isolation\"}"
    );
}

/**
 * Get info about Modelo 1
 */
JNIEXPORT jstring JNICALL
Java_com_sanesoluti_eco5000_EdgeImpulseModule_getModel1InfoNative(
    JNIEnv* env,
    jclass clazz
) {
    std::string info = "{";
    info += "\"name\":\"" + std::string(EI_CLASSIFIER_PROJECT_NAME) + "\",";
    info += "\"id\":" + std::to_string(EI_CLASSIFIER_PROJECT_ID) + ",";
    info += "\"frequency\":" + std::to_string(EI_CLASSIFIER_FREQUENCY) + ",";
    info += "\"inputSize\":" + std::to_string(EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE) + ",";
    info += "\"outputSize\":" + std::to_string(EI_CLASSIFIER_NN_INPUT_FRAME_SIZE) + ",";
    info += "\"labels\":[\"Leak\",\"No_leak\"]";
    info += "}";

    return env->NewStringUTF(info.c_str());
}

} // extern "C"
