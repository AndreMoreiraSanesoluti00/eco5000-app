# Modelos de IA - Documentação

## Visão Geral

O aplicativo ECO5000 utiliza **dois modelos de IA complementares** para detecção de vazamentos em tubulações através da análise de áudio.

## Características dos Modelos

### Modelo 1 - "Cético" (Skeptic)
- **Nome Técnico:** Sane.AI.MFE
- **Projeto Edge Impulse:** 840911
- **DSP:** MFE (Mel-Frequency Energy)
- **Threshold:** 0.6 (60% de confiança mínima)
- **Features de Saída:** 1560
- **Arquivo TFLite:** `tflite_learn_840911_39.tflite`

**Configuração DSP:**
```
- Frame Length: 0.1s
- Frame Stride: 0.05s
- Num Filters: 40
- FFT Length: 2048
- Low Frequency: 300 Hz
- High Frequency: 1000 Hz
- Noise Floor: -72 dB
```

**Características:**
- Mais **conservador** nas detecções
- Requer maior confiança para classificar como vazamento
- Menos falsos positivos
- Ideal para confirmação de vazamentos

### Modelo 2 - "Paranoico" (Paranoid)
- **Nome Técnico:** Sane.AI.WAVELET
- **Projeto Edge Impulse:** 840915
- **DSP:** Spectral Analysis com Wavelet
- **Threshold:** 0.4 (40% de confiança mínima)
- **Features de Saída:** 98
- **Arquivo TFLite:** `tflite_learn_840915_110.tflite`

**Configuração DSP:**
```
- Analysis Type: Wavelet
- Wavelet: bior3.1
- Wavelet Level: 6
- Filter Type: High-pass
- Filter Cutoff: 500 Hz
- FFT Length: 2048
- Spectral Peaks Count: 3
- Spectral Peaks Threshold: 0.1
- Decimation Ratio: 3
```

**Características:**
- Mais **sensível** nas detecções
- Requer menor confiança para classificar como vazamento
- Pode gerar mais falsos positivos
- Ideal para detecção precoce e áreas críticas

## Filosofia de Uso - Dois Modelos

A estratégia de usar dois modelos complementares permite:

### 🟢 Alta Confiabilidade
Quando **ambos concordam** com alta confiança:
- Modelo 1 (Cético): Leak > 60%
- Modelo 2 (Paranoico): Leak > 40%
- **Resultado:** Vazamento confirmado com alta certeza

### 🟡 Investigação Necessária
Quando **discordam**:
- Modelo 1: No_leak
- Modelo 2: Leak
- **Resultado:** Possível vazamento, requer investigação adicional

### 🔴 Baixa Confiabilidade
Quando **modelos têm alta incerteza**:
- Incerteza média > 35%
- **Resultado:** Dados insuficientes ou ruidosos

### ⚪ Sem Vazamento
Quando **ambos concordam em No_leak**:
- Modelo 1: No_leak > 40%
- Modelo 2: No_leak > 60%
- **Resultado:** Sem vazamento detectado

## Localização dos Arquivos

### Modelos TFLite Originais (Raiz do Projeto)
```
📁 eco5000-app/
├── 📁 modelo1/
│   └── 📁 tflite-model/
│       └── tflite_learn_840911_39.tflite
└── 📁 modelo2/
    └── 📁 tflite-model/
        └── tflite_learn_840915_110.tflite
```

### Modelos no Código Nativo Android (Utilizados no Build)
```
📁 app/android/app/src/main/cpp/
├── 📁 modelo1/
│   ├── 📁 tflite-model/
│   │   ├── tflite_learn_840911_39.tflite
│   │   ├── tflite_learn_840911_39.h
│   │   └── tflite_learn_840911_39.cpp
│   ├── 📁 model-parameters/
│   │   ├── model_metadata.h
│   │   └── model_variables.h
│   └── 📁 edge-impulse-sdk/ (SDK completo)
└── 📁 modelo2/
    ├── 📁 tflite-model/
    │   ├── tflite_learn_840915_110.tflite
    │   ├── tflite_learn_840915_110.h
    │   └── tflite_learn_840915_110.cpp
    ├── 📁 model-parameters/
    │   ├── model_metadata.h
    │   └── model_variables.h
    └── 📁 edge-impulse-sdk/ (SDK completo)
```

### ⚠️ Arquivos Legados (NÃO utilizados)
```
📁 app/android/app/src/main/assets/
├── model_cetico.tflite      ❌ NÃO USADO (nomenclatura antiga)
└── model_paranoico.tflite   ❌ NÃO USADO (nomenclatura antiga)
```

**Nota:** Os arquivos em `assets/` são remanescentes de uma implementação anterior e **não são carregados pelo aplicativo atual**. Os modelos são compilados estaticamente no código C++.

## Código-Fonte

### TypeScript/JavaScript
- **Serviço Principal:** `app/src/services/EdgeImpulseModule.ts`
- **Hook React:** `app/src/hooks/useEdgeImpulse.ts`
- **Tela de IA:** `app/src/screens/AIScreen.tsx`
- **Tipos:** `app/src/types/index.ts`

### Android Native (Kotlin)
- **Módulo React Native:** `app/android/app/src/main/java/com/sanesoluti/eco5000/EdgeImpulseModule.kt`

### Android Native (C++)
- **JNI Bridge:** `app/android/app/src/main/cpp/edge_impulse_jni.cpp`
- **Build Config:** `app/android/app/src/main/cpp/CMakeLists.txt`

## ⚠️ Problema Conhecido - Modelo 2

**Status:** IMPLEMENTAÇÃO INCOMPLETA

**Descrição:**
O Modelo 2 atualmente está usando o **mesmo pipeline do Modelo 1** (MFE DSP), quando deveria usar seu próprio pipeline de Spectral Analysis com Wavelet.

**Consequência:**
Ambos os modelos retornam resultados muito similares ou idênticos, diminuindo a eficácia da estratégia de dois modelos.

**Localização do Problema:**
`app/android/app/src/main/cpp/edge_impulse_jni.cpp` - Função `nativeRunInferenceModel2` (linhas 215-279)

**Solução Necessária:**
Implementar pipeline separado para Modelo 2 usando:
- `extract_spectral_analysis_features()` ao invés de `extract_mfe_features()`
- Carregar e executar `tflite_learn_840915_110` modelo
- Aplicar normalização de dados (standard scaler) específica do Modelo 2

**Referência:**
Toda a configuração necessária está disponível em:
`app/android/app/src/main/cpp/modelo2/model-parameters/model_variables.h`

## Sliding Window Inference

O aplicativo utiliza análise de **janela deslizante** para processar arquivos de áudio longos:

**Configuração Padrão:**
```typescript
{
  windowDurationMs: 2000,    // Janela de 2 segundos
  stepDurationMs: 1000,      // Passo de 1 segundo (50% overlap)
  sampleRate: 48000          // 48kHz
}
```

**Processo:**
1. Áudio é dividido em janelas sobrepostas de 2 segundos
2. Cada janela é processada por ambos os modelos
3. Resultados são agregados para decisão final

**Agregação:**
- Calcula confiança média de "Leak" e "No_leak" para cada modelo
- Combina resultados dos dois modelos
- Determina label final baseado na média combinada

## Métricas de Incerteza

O sistema calcula e loga métricas detalhadas de incerteza:

**Níveis de Incerteza:**
- **Muito Baixa:** < 10%
- **Baixa:** 10-20%
- **Moderada:** 20-35%
- **Alta:** 35-50%
- **Muito Alta:** > 50%

**Alertas Gerados:**
- ⚠️ Incerteza >= 35%
- ⚠️ Confiança abaixo do threshold
- ⚠️ Modelos discordam
- ⚠️ Grande diferença de incerteza entre modelos (> 20%)

## Atualização dos Modelos

Para atualizar os modelos:

1. **Exportar novos modelos do Edge Impulse**
2. **Substituir arquivos na raiz:**
   - `modelo1/tflite-model/tflite_learn_XXXXXX_XX.tflite`
   - `modelo2/tflite-model/tflite_learn_XXXXXX_XX.tflite`

3. **Copiar para código nativo:**
   ```bash
   cp -r modelo1/* app/android/app/src/main/cpp/modelo1/
   cp -r modelo2/* app/android/app/src/main/cpp/modelo2/
   ```

4. **Atualizar CMakeLists.txt** se necessário (nomes de arquivos)

5. **Rebuild do aplicativo:**
   ```bash
   cd app
   npm run build:android
   ```

## Informações Adicionais

- **Frequência de Amostragem:** 48000 Hz
- **Labels:** ['Leak', 'No_leak']
- **Formato de Entrada:** Float32 array
- **Plataforma:** Android (iOS não implementado)
- **Framework:** React Native + Expo
- **SDK:** Edge Impulse C++ SDK (TensorFlow Lite Micro)
