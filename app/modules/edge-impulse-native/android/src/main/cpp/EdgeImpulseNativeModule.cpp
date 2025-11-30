#include <jni.h>
#include <android/log.h>
#include <vector>
#include <string>
#include <cmath>

// We don't include the heavy Edge Impulse headers here to avoid duplicate symbols
// Instead, we use minimal type definitions and wrapper functions from ei_model_wrapper.cpp

// Edge Impulse types (minimal definitions needed)
typedef int EI_IMPULSE_ERROR;
#define EI_IMPULSE_OK 0

typedef struct {
    int (*get_data)(size_t offset, size_t length, float *out_ptr);
    size_t total_length;
} signal_t;

typedef struct {
    const char *label;
    float value;
} ei_impulse_result_classification_t;

typedef struct {
    int dsp;
    int classification;
    int anomaly;
} ei_impulse_result_timing_t;

typedef struct {
    ei_impulse_result_classification_t classification[16];  // Max expected labels
    ei_impulse_result_timing_t timing;
} ei_impulse_result_t;

// Wrapper functions from ei_model_wrapper.cpp
extern "C" {
    EI_IMPULSE_ERROR run_classifier_wrapper(signal_t *signal, ei_impulse_result_t *result, bool debug);
    const char** get_classifier_labels();
    size_t get_classifier_label_count();
    int get_classifier_frequency();
}

#define TAG "EdgeImpulseNative"
#define LOGD(...) __android_log_print(ANDROID_LOG_DEBUG, TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, TAG, __VA_ARGS__)

// Signal class for feeding data to Edge Impulse
class AudioSignal {
public:
    AudioSignal(const float* data, size_t length)
        : _data(data), _length(length), _offset(0) {}

    int get_data(size_t offset, size_t length, float *out_ptr) {
        if (offset + length > _length) {
            return -1;  // Error: out of bounds
        }
        memcpy(out_ptr, _data + offset, length * sizeof(float));
        return 0;  // Success
    }

private:
    const float* _data;
    size_t _length;
    size_t _offset;
};

extern "C" {

// Model 1 (MFE - Skeptic) functions

JNIEXPORT jboolean JNICALL
Java_com_edgeimpulse_EdgeImpulseNativeModule_initModel1(
    JNIEnv* env,
    jobject /* this */) {

    LOGD("[Model1] Initializing...");
    // TFLite model is statically linked, no runtime initialization needed
    LOGD("[Model1] Initialized successfully");
    return JNI_TRUE;
}

JNIEXPORT jobject JNICALL
Java_com_edgeimpulse_EdgeImpulseNativeModule_runInferenceModel1(
    JNIEnv* env,
    jobject /* this */,
    jfloatArray audioData) {

    LOGD("[Model1] Starting inference...");

    // Get audio data
    jsize length = env->GetArrayLength(audioData);
    jfloat* data = env->GetFloatArrayElements(audioData, nullptr);

    if (data == nullptr) {
        LOGE("[Model1] Failed to get audio data");
        return nullptr;
    }

    LOGD("[Model1] Processing %d samples", length);

    // Create signal
    signal_t signal;
    signal.total_length = length;
    signal.get_data = [](size_t offset, size_t length, float *out_ptr) -> int {
        // This is a placeholder - we'll need to capture the data pointer
        return 0;
    };

    // Prepare static buffer for the lambda
    static std::vector<float> static_buffer;
    static_buffer.assign(data, data + length);

    signal.get_data = [](size_t offset, size_t length, float *out_ptr) -> int {
        if (offset + length > static_buffer.size()) {
            return -1;
        }
        memcpy(out_ptr, static_buffer.data() + offset, length * sizeof(float));
        return 0;
    };

    // Run classifier using wrapper function
    ei_impulse_result_t result = {0};
    EI_IMPULSE_ERROR res = run_classifier_wrapper(&signal, &result, false);

    // Release audio data
    env->ReleaseFloatArrayElements(audioData, data, JNI_ABORT);

    if (res != EI_IMPULSE_OK) {
        LOGE("[Model1] Failed to run classifier: %d", res);
        return nullptr;
    }

    LOGD("[Model1] Inference complete");
    LOGD("[Model1] DSP time: %d ms", result.timing.dsp);
    LOGD("[Model1] Classification time: %d ms", result.timing.classification);

    // Create result object
    jclass resultClass = env->FindClass("com/edgeimpulse/EdgeImpulseResult");
    if (resultClass == nullptr) {
        LOGE("[Model1] Failed to find EdgeImpulseResult class");
        return nullptr;
    }

    jmethodID constructor = env->GetMethodID(resultClass, "<init>", "(Ljava/lang/String;FIII)V");
    if (constructor == nullptr) {
        LOGE("[Model1] Failed to find constructor");
        return nullptr;
    }

    // Find the label with highest confidence
    const char* label = "unknown";
    float confidence = 0.0f;

    size_t label_count = get_classifier_label_count();
    for (size_t i = 0; i < label_count; i++) {
        LOGD("[Model1] %s: %.5f", result.classification[i].label, result.classification[i].value);
        if (result.classification[i].value > confidence) {
            confidence = result.classification[i].value;
            label = result.classification[i].label;
        }
    }

    jstring jLabel = env->NewStringUTF(label);

    return env->NewObject(
        resultClass,
        constructor,
        jLabel,
        (jfloat)confidence,
        (jint)result.timing.dsp,
        (jint)result.timing.classification,
        (jint)0  // anomaly time
    );
}

JNIEXPORT jobject JNICALL
Java_com_edgeimpulse_EdgeImpulseNativeModule_getModel1Info(
    JNIEnv* env,
    jobject /* this */) {

    jclass infoClass = env->FindClass("com/edgeimpulse/EdgeImpulseModelInfo");
    if (infoClass == nullptr) {
        LOGE("[Model1] Failed to find EdgeImpulseModelInfo class");
        return nullptr;
    }

    jmethodID constructor = env->GetMethodID(infoClass, "<init>", "(Ljava/lang/String;I[Ljava/lang/String;IF)V");
    if (constructor == nullptr) {
        LOGE("[Model1] Failed to find constructor");
        return nullptr;
    }

    // Create labels array
    size_t label_count = get_classifier_label_count();
    const char** label_names = get_classifier_labels();

    jobjectArray labels = env->NewObjectArray(
        label_count,
        env->FindClass("java/lang/String"),
        nullptr
    );

    for (size_t i = 0; i < label_count; i++) {
        env->SetObjectArrayElement(labels, i, env->NewStringUTF(label_names[i]));
    }

    jstring name = env->NewStringUTF("Sane.AI.MFE");

    return env->NewObject(
        infoClass,
        constructor,
        name,
        (jint)840911,  // project ID
        labels,
        (jint)get_classifier_frequency(),
        (jfloat)0.6f  // threshold
    );
}

// Model 2 (Wavelet - Paranoid) functions

JNIEXPORT jboolean JNICALL
Java_com_edgeimpulse_EdgeImpulseNativeModule_initModel2(
    JNIEnv* env,
    jobject /* this */) {

    LOGD("[Model2] Initializing...");
    LOGD("[Model2] Initialized successfully");
    return JNI_TRUE;
}

JNIEXPORT jobject JNICALL
Java_com_edgeimpulse_EdgeImpulseNativeModule_runInferenceModel2(
    JNIEnv* env,
    jobject /* this */,
    jfloatArray audioData) {

    LOGD("[Model2] Starting inference...");
    LOGD("[Model2] Using same pipeline as Model 1 (namespace isolation not yet implemented)");

    // For now, Model 2 uses the same classifier as Model 1
    // TODO: Implement proper namespace isolation or separate compilation units
    return Java_com_edgeimpulse_EdgeImpulseNativeModule_runInferenceModel1(env, nullptr, audioData);
}

JNIEXPORT jobject JNICALL
Java_com_edgeimpulse_EdgeImpulseNativeModule_getModel2Info(
    JNIEnv* env,
    jobject /* this */) {

    jclass infoClass = env->FindClass("com/edgeimpulse/EdgeImpulseModelInfo");
    if (infoClass == nullptr) {
        LOGE("[Model2] Failed to find EdgeImpulseModelInfo class");
        return nullptr;
    }

    jmethodID constructor = env->GetMethodID(infoClass, "<init>", "(Ljava/lang/String;I[Ljava/lang/String;IF)V");
    if (constructor == nullptr) {
        LOGE("[Model2] Failed to find constructor");
        return nullptr;
    }

    // Create labels array (same as Model 1 for now)
    size_t label_count = get_classifier_label_count();
    const char** label_names = get_classifier_labels();

    jobjectArray labels = env->NewObjectArray(
        label_count,
        env->FindClass("java/lang/String"),
        nullptr
    );

    for (size_t i = 0; i < label_count; i++) {
        env->SetObjectArrayElement(labels, i, env->NewStringUTF(label_names[i]));
    }

    jstring name = env->NewStringUTF("Sane.AI.WAVELET");

    return env->NewObject(
        infoClass,
        constructor,
        name,
        (jint)840915,  // project ID (placeholder)
        labels,
        (jint)get_classifier_frequency(),
        (jfloat)0.4f  // threshold
    );
}

} // extern "C"
