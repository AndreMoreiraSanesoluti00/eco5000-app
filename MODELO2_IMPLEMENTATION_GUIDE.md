# 🔬 Guia de Implementação - Modelo 2 (Wavelet)

## 📋 Contexto

O **Modelo 1 (MFE)** está funcionando com o Edge Impulse SDK integrado.

O **Modelo 2 (Wavelet)** ainda precisa ser implementado devido a **conflitos de namespace** - ambos os modelos compartilham:
- Mesmas funções globais (`run_classifier`, `run_dsp`, etc.)
- Mesmas variáveis globais (`ei_dsp_cont_current_frame`, etc.)
- Mesmo namespace (global C++)

---

## 🎯 Problema Técnico

### Conflito de Símbolos

Quando tentamos incluir ambos os SDKs no mesmo binário:

```cpp
// Modelo 1
#include "modelo1-sdk/classifier/ei_run_classifier.h"
void run_classifier(...) { /* implementação MFE */ }

// Modelo 2
#include "modelo2-sdk/classifier/ei_run_classifier.h"
void run_classifier(...) { /* implementação Wavelet */ }

// ❌ ERRO: redefinition of 'run_classifier'
```

---

## 💡 Soluções Possíveis

### Solução 1: Namespaces C++ (Recomendado)

Modificar os headers do Edge Impulse SDK para usar namespaces.

**Vantagens:**
- ✅ Limpo e elegante
- ✅ Mantém ambos os modelos no mesmo binário
- ✅ Fácil de usar

**Desvantagens:**
- ❌ Requer modificação dos headers Edge Impulse
- ❌ Precisa ser refeito a cada atualização do SDK

**Implementação:**

```cpp
// modelo1-wrapper.h
namespace modelo1 {
    #include "modelo1-sdk/classifier/ei_run_classifier.h"
}

// modelo2-wrapper.h
namespace modelo2 {
    #include "modelo2-sdk/classifier/ei_run_classifier.h"
}

// EdgeImpulseModule.cpp
EI_IMPULSE_ERROR runModel1(signal_t* signal, ei_impulse_result_t* result) {
    return modelo1::run_classifier(signal, result, false);
}

EI_IMPULSE_ERROR runModel2(signal_t* signal, ei_impulse_result_t* result) {
    return modelo2::run_classifier(signal, result, false);
}
```

---

### Solução 2: Bibliotecas Dinâmicas Separadas

Compilar cada modelo como uma biblioteca `.so` separada.

**Vantagens:**
- ✅ Isolamento completo
- ✅ Não precisa modificar headers
- ✅ Pode carregar/descarregar sob demanda

**Desvantagens:**
- ❌ Mais complexo de gerenciar
- ❌ Overhead de múltiplas bibliotecas

**Implementação:**

```cmake
# CMakeLists.txt
add_library(EdgeImpulseModel1 SHARED
    modelo1_wrapper.cpp
    ${MODELO1_SOURCES}
)

add_library(EdgeImpulseModel2 SHARED
    modelo2_wrapper.cpp
    ${MODELO2_SOURCES}
)

add_library(EdgeImpulseModule SHARED
    EdgeImpulseModule.cpp
)

target_link_libraries(EdgeImpulseModule
    EdgeImpulseModel1
    EdgeImpulseModel2
)
```

---

### Solução 3: Prefixos de Função

Renomear todas as funções com prefixos usando macros.

**Vantagens:**
- ✅ Não requer namespaces
- ✅ Funciona com C puro

**Desvantagens:**
- ❌ Muito trabalhoso
- ❌ Propenso a erros

**Implementação:**

```cpp
// modelo1_defines.h
#define run_classifier modelo1_run_classifier
#define run_dsp modelo1_run_dsp
#define ei_dsp_cont_current_frame modelo1_ei_dsp_cont_current_frame
// ... todos os símbolos

// modelo2_defines.h
#define run_classifier modelo2_run_classifier
#define run_dsp modelo2_run_dsp
#define ei_dsp_cont_current_frame modelo2_ei_dsp_cont_current_frame
// ... todos os símbolos
```

---

### Solução 4: Processo Separado (Extremo)

Rodar cada modelo em um processo Android separado.

**Vantagens:**
- ✅ Isolamento total garantido

**Desvantagens:**
- ❌ Overhead de IPC (Inter-Process Communication)
- ❌ Complexidade muito alta
- ❌ Não recomendado para este caso

---

## 🛠️ Implementação Recomendada (Solução 1)

### Passo 1: Criar Wrappers com Namespace

```cpp
// app/android/app/src/main/cpp/modelo1_wrapper.h
#ifndef MODELO1_WRAPPER_H
#define MODELO1_WRAPPER_H

namespace modelo1 {
    #define EI_CLASSIFIER_ALLOCATION_STATIC
    #include "modelo1-sdk/classifier/ei_run_classifier.h"
    #include "modelo1-params/model_metadata.h"
}

#endif // MODELO1_WRAPPER_H
```

```cpp
// app/android/app/src/main/cpp/modelo2_wrapper.h
#ifndef MODELO2_WRAPPER_H
#define MODELO2_WRAPPER_H

namespace modelo2 {
    #define EI_CLASSIFIER_ALLOCATION_STATIC
    #include "modelo2-sdk/classifier/ei_run_classifier.h"
    #include "modelo2-params/model_metadata.h"
}

#endif // MODELO2_WRAPPER_H
```

### Passo 2: Atualizar EdgeImpulseModule.cpp

```cpp
#include "modelo1_wrapper.h"
#include "modelo2_wrapper.h"

// Buffers separados
static float modelo1_audio_buffer[96000];  // modelo1::EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE
static float modelo2_audio_buffer[96000];  // modelo2::EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE

// Signal callbacks separados
static int modelo1_get_signal_data(size_t offset, size_t length, float *out_ptr) {
    memcpy(out_ptr, modelo1_audio_buffer + offset, length * sizeof(float));
    return 0;
}

static int modelo2_get_signal_data(size_t offset, size_t length, float *out_ptr) {
    memcpy(out_ptr, modelo2_audio_buffer + offset, length * sizeof(float));
    return 0;
}

// Modelo 1 inference
static jni::local_ref<jni::JString> runInferenceModel1(...) {
    // Copy audio data
    memcpy(modelo1_audio_buffer, audioDataPin.get(), audioDataLength * sizeof(float));

    // Setup signal
    modelo1::signal_t signal;
    signal.total_length = modelo1::EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE;
    signal.get_data = &modelo1_get_signal_data;

    // Run classifier
    modelo1::ei_impulse_result_t result = { 0 };
    modelo1::EI_IMPULSE_ERROR res = modelo1::run_classifier(&signal, &result, false);

    // Process result...
}

// Modelo 2 inference
static jni::local_ref<jni::JString> runInferenceModel2(...) {
    // Copy audio data
    memcpy(modelo2_audio_buffer, audioDataPin.get(), audioDataLength * sizeof(float));

    // Setup signal
    modelo2::signal_t signal;
    signal.total_length = modelo2::EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE;
    signal.get_data = &modelo2_get_signal_data;

    // Run classifier
    modelo2::ei_impulse_result_t result = { 0 };
    modelo2::EI_IMPULSE_ERROR res = modelo2::run_classifier(&signal, &result, false);

    // Process result...
}
```

### Passo 3: Testar Isolamento

Verifique se os símbolos estão isolados:

```bash
nm -C libEdgeImpulseModule.so | grep run_classifier

# Deve mostrar:
# modelo1::run_classifier(...)
# modelo2::run_classifier(...)
```

---

## 🧪 Teste de Validação

### Teste 1: Compilação

```bash
cd app/android
./gradlew clean assembleDebug
```

**Esperado:** Sem erros de redefinição de símbolos.

### Teste 2: Inferência Simultânea

```typescript
// Teste que ambos os modelos funcionam
const [result1, result2] = await Promise.all([
  edgeImpulseService.runInferenceModel1(audioSamples),
  edgeImpulseService.runInferenceModel2(audioSamples),
]);

console.log('Modelo 1 (MFE):', result1);
console.log('Modelo 2 (Wavelet):', result2);
```

**Esperado:**
- Resultado 1 tem features MFE processadas
- Resultado 2 tem features Wavelet processadas
- Resultados são diferentes (DSP diferente)

### Teste 3: Validação de DSP

```cpp
// No código C++, após run_classifier, verifique:
LOGD("Model 1 - DSP time: %d ms", result1.timing.dsp);
LOGD("Model 2 - DSP time: %d ms", result2.timing.dsp);

// MFE e Wavelet devem ter tempos diferentes
```

---

## 📊 Diferenças Esperadas Entre Modelos

| Aspecto | Modelo 1 (MFE) | Modelo 2 (Wavelet) |
|---------|----------------|-------------------|
| DSP | Mel-Frequency Energy | Wavelet Transform |
| Features | 1560 | 98 |
| Tempo DSP | 40-50ms | 20-30ms |
| Threshold | 0.6 | 0.4 |
| Sensibilidade | Moderada (Cético) | Alta (Paranoico) |

---

## ⚠️ Problemas Conhecidos

### Namespace em Headers C

Alguns headers Edge Impulse são **C puro** (não C++), então não aceitam namespaces diretamente.

**Solução:** Criar wrappers C++:

```cpp
// modelo1_c_wrapper.cpp
extern "C" {
    #include "modelo1-sdk/some_c_header.h"
}

namespace modelo1 {
    // Wrap C functions
    int call_c_function(void* data) {
        return ::c_function_from_header(data);
    }
}
```

### Variáveis Globais Static

Variáveis declaradas como `static` em arquivos `.cpp` podem ainda conflitar.

**Solução:** Renomear manualmente ou usar compilation units separadas.

---

## 🚀 Checklist de Implementação

- [ ] Criar `modelo1_wrapper.h` com namespace
- [ ] Criar `modelo2_wrapper.h` com namespace
- [ ] Atualizar `EdgeImpulseModule.cpp`
- [ ] Atualizar `CMakeLists.txt` se necessário
- [ ] Compilar e verificar símbolos
- [ ] Testar Modelo 1 (deve continuar funcionando)
- [ ] Testar Modelo 2 (novo)
- [ ] Testar ambos simultaneamente
- [ ] Validar que DSPs são diferentes
- [ ] Verificar resultados com áudio real
- [ ] Atualizar documentação

---

## 📚 Referências

- [C++ Namespaces](https://en.cppreference.com/w/cpp/language/namespace)
- [JNI Best Practices](https://developer.android.com/training/articles/perf-jni)
- [CMake Shared Libraries](https://cmake.org/cmake/help/latest/command/add_library.html)
- [Edge Impulse C++ SDK](https://github.com/edgeimpulse/inferencing-sdk-cpp)

---

## 💬 Suporte

Para dúvidas sobre a implementação do Modelo 2:
1. Consulte este guia
2. Verifique logs de compilação
3. Teste isoladamente cada modelo

**Última atualização:** 30 de Novembro de 2025
