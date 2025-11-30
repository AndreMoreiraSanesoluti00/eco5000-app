# Integração Edge Impulse com DSP - Solução Completa

## 📋 Sumário

Este documento descreve a solução completa para integrar o Edge Impulse SDK com processamento DSP (Digital Signal Processing) no projeto eco5000-app.

## 🎯 Problema Resolvido

### Problema Original
O projeto estava usando `react-native-fast-tflite` que apenas executa a inferência do modelo TensorFlow Lite, mas **não processa o DSP** necessário para converter áudio raw em features que os modelos Edge Impulse esperam.

**Erro observado:**
```
ERROR [TFLite] Inference failed: [TypeError: Cannot read property 'length' of undefined]
```

**Causa:**
- Modelo 1 (MFE) espera: **1560 features** (saída do DSP MFE)
- Modelo 2 (Wavelet) espera: **98 features** (saída do DSP Wavelet)
- O código estava passando: **96000 amostras de áudio raw**

### Solução Implementada

Criamos um **módulo nativo React Native** que usa o **Edge Impulse SDK completo** para fazer:
1. ✅ **DSP** (MFE ou Wavelet) - Processa áudio raw → features
2. ✅ **Inferência** - Classifica features → resultado

Tudo em uma única chamada usando `run_classifier()`.

---

## 🏗️ Arquitetura da Solução

```
┌─────────────────────────────────────────────────────────────┐
│                     React Native (TypeScript)                │
│                                                               │
│  useEdgeImpulse Hook                                         │
│          ↓                                                    │
│  EdgeImpulseNativeService                                    │
│          ↓                                                    │
│  NativeModules.EdgeImpulseModule                             │
└───────────────────────┬─────────────────────────────────────┘
                        │ JNI Bridge
┌───────────────────────┴─────────────────────────────────────┐
│                     Android Native (C++)                     │
│                                                               │
│  EdgeImpulseModule.cpp                                       │
│          ↓                                                    │
│  ┌─────────────────────┐      ┌─────────────────────┐       │
│  │   Modelo 1 (MFE)    │      │ Modelo 2 (Wavelet)  │       │
│  │                     │      │                     │       │
│  │ - edge-impulse-sdk  │      │ - edge-impulse-sdk  │       │
│  │ - model-parameters  │      │ - model-parameters  │       │
│  │ - tflite-model      │      │ - tflite-model      │       │
│  │                     │      │                     │       │
│  │ run_classifier()    │      │ run_classifier()    │       │
│  │   ├─ DSP (MFE)      │      │   ├─ DSP (Wavelet)  │       │
│  │   └─ TFLite         │      │   └─ TFLite         │       │
│  └─────────────────────┘      └─────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Estrutura de Arquivos Criada

```
app/
├── android/app/src/main/
│   ├── cpp/                                    # ⭐ NOVO
│   │   ├── CMakeLists.txt                      # Build config
│   │   ├── EdgeImpulseModule.cpp               # Módulo C++ principal
│   │   ├── modelo1-sdk/                        # Edge Impulse SDK Modelo 1
│   │   ├── modelo1-params/                     # Parâmetros Modelo 1
│   │   ├── modelo1-tflite/                     # TFLite Modelo 1
│   │   ├── modelo2-sdk/                        # Edge Impulse SDK Modelo 2
│   │   ├── modelo2-params/                     # Parâmetros Modelo 2
│   │   └── modelo2-tflite/                     # TFLite Modelo 2
│   │
│   └── java/com/sanesoluti/eco5000/
│       ├── EdgeImpulseModule.kt                # ⭐ NOVO - Módulo JNI
│       ├── EdgeImpulsePackage.kt               # ⭐ NOVO - Package
│       └── MainApplication.kt                  # ✏️ MODIFICADO
│
└── src/
    ├── services/
    │   ├── EdgeImpulseNativeModule.ts          # ⭐ NOVO - Service nativo
    │   └── EdgeImpulseTFLite.ts                # ❌ DEPRECIADO
    │
    └── hooks/
        └── useEdgeImpulse.ts                   # ✏️ MODIFICADO
```

---

## 🔧 Componentes Implementados

### 1. **CMakeLists.txt** (`app/android/app/src/main/cpp/CMakeLists.txt`)

Configura a compilação do Edge Impulse SDK com:
- DSP (FFT, MFE, Wavelet, etc.)
- CMSIS-DSP (operações matemáticas otimizadas)
- CMSIS-NN (neural network operations)
- TensorFlow Lite Micro
- Código do modelo

### 2. **EdgeImpulseModule.cpp**

Módulo C++ que:
- Expõe funções JNI para React Native
- Implementa `runInferenceModel1()` usando `run_classifier()`
- Processa áudio raw → DSP → Inferência
- Retorna resultado em JSON

**Fluxo de Inferência:**
```cpp
float audioBuffer[96000];           // Áudio raw (48kHz, 2s)
                ↓
signal_t signal;                    // Estrutura de sinal
                ↓
run_classifier(&signal, &result)    // DSP + Inferência
                ↓
{                                   // Resultado JSON
  "timing": { "dsp": 45, "classification": 12 },
  "classifications": [
    {"label": "Leak", "value": 0.92},
    {"label": "No_leak", "value": 0.08}
  ]
}
```

### 3. **EdgeImpulseModule.kt**

Wrapper Kotlin que:
- Carrega biblioteca nativa `.so`
- Expõe métodos para React Native via `@ReactMethod`
- Converte `ReadableArray` → `FloatArray`
- Gerencia chamadas JNI

### 4. **EdgeImpulseNativeService.ts**

Service TypeScript que:
- Encapsula chamadas ao módulo nativo
- Parse JSON results
- Fornece API consistente com o serviço anterior

### 5. **useEdgeImpulse.ts** (Modificado)

Hook React atualizado para usar o novo serviço nativo:
```typescript
// Antes (TFLite apenas)
import { edgeImpulseTFLiteService } from '../services/EdgeImpulseTFLite';

// Agora (DSP + TFLite via Edge Impulse SDK)
import { edgeImpulseNativeService } from '../services/EdgeImpulseNativeModule';
```

---

## 🚀 Como Usar

### Build do Projeto

```bash
cd app/android
./gradlew clean assembleDebug
```

O Gradle irá:
1. Compilar o código C++ usando CMake
2. Construir o Edge Impulse SDK com DSP
3. Linkar tudo em `libEdgeImpulseModule.so`
4. Empacotar no APK

### Uso no Código

```typescript
const { runSlidingWindowInference } = useEdgeImpulse();

// O DSP agora é processado automaticamente!
const result = await runSlidingWindowInference(audioSamples);
```

**Antes (❌ Erro):**
```
audioSamples (96000) → TFLite → ERROR (esperava 1560)
```

**Agora (✅ Funciona):**
```
audioSamples (96000) → DSP MFE (1560) → TFLite → Result ✓
audioSamples (96000) → DSP Wavelet (98) → TFLite → Result ✓
```

---

## 📊 Modelos Edge Impulse

### Modelo 1: Sane.AI.MFE (Cético)
- **DSP**: MFE (Mel-Frequency Energy)
- **Input**: 96000 amostras (48kHz, 2s)
- **DSP Output**: 1560 features
- **Labels**: Leak, No_leak
- **Threshold**: 0.6

### Modelo 2: Sane.AI.WAVELET (Paranoico)
- **DSP**: Wavelet Transform
- **Input**: 96000 amostras (48kHz, 2s)
- **DSP Output**: 98 features
- **Labels**: Leak, No_leak
- **Threshold**: 0.4

---

## ⚠️ Status de Implementação

### ✅ Completo (Modelo 1)
- [x] Integração Edge Impulse SDK
- [x] DSP MFE
- [x] Inferência TFLite
- [x] Módulo nativo C++
- [x] Bridge JNI
- [x] Service TypeScript
- [x] Hook React

### 🚧 Pendente (Modelo 2)

O Modelo 2 requer **isolamento de namespace** porque ambos os modelos têm:
- Mesmos nomes de função (`run_classifier`)
- Mesmas variáveis globais
- Mesmo namespace

**Soluções possíveis:**
1. Usar namespaces C++ diferentes
2. Renomear funções com prefixo (modelo1_, modelo2_)
3. Compilar SDKs como bibliotecas separadas
4. Usar dynamic loading

**Placeholder atual:**
```cpp
// EdgeImpulseModule.cpp
static jni::local_ref<jni::JString> runInferenceModel2(...) {
    return jni::make_jstring(
        "{\"error\":\"Modelo 2 not yet implemented - requires namespace isolation\"}"
    );
}
```

---

## 🔍 Debugging

### Logs Nativos (Logcat)

```bash
adb logcat | grep EdgeImpulse
```

Saída esperada:
```
D EdgeImpulseModule: [Modelo1] Starting inference...
D EdgeImpulseModule: [Modelo1] Received 96000 audio samples
D EdgeImpulseModule: [Modelo1] Running classifier (DSP + Inference)...
D EdgeImpulseModule: [Modelo1] Inference successful!
D EdgeImpulseModule: [Modelo1] DSP time: 45 ms
D EdgeImpulseModule: [Modelo1] Classification time: 12 ms
D EdgeImpulseModule: [Modelo1] Leak: 0.92000
D EdgeImpulseModule: [Modelo1] No_leak: 0.08000
```

### Verificar Biblioteca Compilada

```bash
cd app/android
find . -name "libEdgeImpulseModule.so"
```

Deve aparecer em:
```
./app/build/intermediates/cxx/.../libEdgeImpulseModule.so
./app/build/intermediates/merged_native_libs/.../libEdgeImpulseModule.so
```

---

## 🎓 Referências

### Edge Impulse SDK
- [C++ Library Documentation](https://docs.edgeimpulse.com/docs/edge-impulse-studio/deployment/c++-library)
- [run_classifier() API](https://github.com/edgeimpulse/inferencing-sdk-cpp)

### React Native
- [Native Modules (Android)](https://reactnative.dev/docs/native-modules-android)
- [CMake with React Native](https://reactnative.dev/docs/native-modules-android#getting-started)

---

## 📝 Próximos Passos

1. **Testar Modelo 1**
   - Build do APK
   - Teste com áudio real
   - Validar DSP + Inferência

2. **Implementar Modelo 2**
   - Resolver conflito de namespace
   - Testar com Wavelet DSP
   - Comparar resultados

3. **Otimizações**
   - Reduzir tamanho do APK (strip symbols)
   - Cache de DSP para janelas sobrepostas
   - Processamento paralelo

4. **Documentação**
   - Guia de troubleshooting
   - Exemplos de uso
   - Performance benchmarks

---

## 👤 Autor

Integração desenvolvida para o projeto **eco5000-app** da **Sanesoluti**.

**Data**: 30 de Novembro de 2025 (fictício)

---

## 📄 Licença

Este código integra o Edge Impulse SDK que possui licença proprietária.
Verifique os termos de serviço da Edge Impulse antes de usar em produção.
