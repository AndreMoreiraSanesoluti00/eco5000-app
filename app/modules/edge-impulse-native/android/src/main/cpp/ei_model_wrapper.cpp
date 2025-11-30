// This file includes ALL Edge Impulse headers and implements the wrapper
// It should be compiled only ONCE to avoid duplicate symbols

#define EI_CLASSIFIER_TFLITE_ENABLE_CMSIS_NN 1
#define EI_C_LINKAGE 1
#define TF_LITE_STATIC_MEMORY 1

#include "model-parameters/model_metadata.h"
#include "edge-impulse-sdk/classifier/ei_run_dsp.h"
#include "model-parameters/model_variables.h"
#include "edge-impulse-sdk/classifier/ei_run_classifier.h"

// Expose the run_classifier function
extern "C" {
    EI_IMPULSE_ERROR run_classifier_wrapper(signal_t *signal, ei_impulse_result_t *result, bool debug) {
        return run_classifier(signal, result, debug);
    }

    const char** get_classifier_labels() {
        return ei_classifier_inferencing_categories;
    }

    size_t get_classifier_label_count() {
        return EI_CLASSIFIER_LABEL_COUNT;
    }

    int get_classifier_frequency() {
        return EI_CLASSIFIER_FREQUENCY;
    }
}
