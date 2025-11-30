cmake_minimum_required(VERSION 3.18.1)

project(EdgeImpulseNative)

set(CMAKE_VERBOSE_MAKEFILE ON)
set(CMAKE_CXX_STANDARD 14)

# Define paths
set(PACKAGE_NAME "EdgeImpulseNative")
set(BUILD_DIR ${CMAKE_SOURCE_DIR}/build)
set(MODELO1_DIR ${CMAKE_SOURCE_DIR}/../../../../modelo1)
set(MODELO2_DIR ${CMAKE_SOURCE_DIR}/../../../../modelo2)

# Include directories (only Model 1 for now)
include_directories(
  "${CMAKE_SOURCE_DIR}/src/main/cpp"
  "${MODELO1_DIR}"
  "${MODELO1_DIR}/edge-impulse-sdk"
  "${MODELO1_DIR}/model-parameters"
  "${MODELO1_DIR}/tflite-model"
)

# Collect Edge Impulse SDK source files from modelo1
# Exclude ei_run_classifier_c.cpp to avoid duplicate symbols
# (we include the classifier headers in ei_model_wrapper.cpp instead)
file(GLOB_RECURSE MODELO1_SDK_SOURCES
  "${MODELO1_DIR}/edge-impulse-sdk/**.cpp"
  "${MODELO1_DIR}/edge-impulse-sdk/**.cc"
  "${MODELO1_DIR}/edge-impulse-sdk/**.c"
)

# Remove files that cause duplicate symbols or are platform-specific
list(FILTER MODELO1_SDK_SOURCES EXCLUDE REGEX ".*ei_run_classifier_c\\.cpp$")
# Exclude POSIX porting layer (we're using Android porting layer)
list(FILTER MODELO1_SDK_SOURCES EXCLUDE REGEX ".*/porting/posix/.*")

# Collect TFLite model sources from modelo1
file(GLOB MODELO1_TFLITE_SOURCES
  "${MODELO1_DIR}/tflite-model/*.cpp"
  "${MODELO1_DIR}/tflite-model/*.cc"
)

# Our wrapper sources
set(WRAPPER_SOURCES
  "${CMAKE_SOURCE_DIR}/src/main/cpp/EdgeImpulseNativeModule.cpp"
  "${CMAKE_SOURCE_DIR}/src/main/cpp/ei_model_wrapper.cpp"
)

# Combine all sources (only Model 1)
set(ALL_SOURCES
  ${WRAPPER_SOURCES}
  ${MODELO1_SDK_SOURCES}
  ${MODELO1_TFLITE_SOURCES}
)

# Create the shared library
add_library(
  ${PACKAGE_NAME}
  SHARED
  ${ALL_SOURCES}
)

# Add compiler definitions
target_compile_definitions(${PACKAGE_NAME} PRIVATE
  EI_CLASSIFIER_TFLITE_ENABLE_CMSIS_NN=1
  EI_C_LINKAGE=1
  TF_LITE_STATIC_MEMORY=1
  TF_LITE_DISABLE_X86_NEON=1
  EIDSP_LOAD_CMSIS_DSP_SOURCES=1
)

# Add compiler flags to suppress warnings
target_compile_options(${PACKAGE_NAME} PRIVATE
  -Wno-asm-operand-widths
  -Wno-unused-parameter
  -Wno-unused-variable
)

# Link libraries
target_link_libraries(
  ${PACKAGE_NAME}
  log
  android
)
