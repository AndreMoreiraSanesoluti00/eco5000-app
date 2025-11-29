# Problemas Conhecidos - ECO5000 App

## 🟡 MÉDIO - Modelo 2 Parcialmente Implementado (TFLite Pendente)

**Status:** 🟡 PARCIALMENTE RESOLVIDO - DSP implementado, TFLite pendente
**Data Identificada:** 2025-01-29
**Data Atualizada:** 2025-01-29
**Prioridade:** MÉDIA

### Descrição

O Modelo 2 ("Paranoico") foi **parcialmente implementado** com pipeline DSP separado do Modelo 1.

**✅ IMPLEMENTADO (2025-01-29):**
- ✅ Pipeline DSP de Spectral Analysis com Wavelet (bior3.1)
- ✅ Normalização de dados (standard scaler)
- ✅ Buffers de áudio separados para cada modelo
- ✅ Extração de 98 features específicas do Modelo 2
- ✅ Headers do modelo2 incluídos corretamente
- ✅ Configuração DSP e normalização integradas

**⚠️ PENDENTE:**
- ⚠️ Integração completa do TFLite Micro para inferência real
- ⚠️ Atualmente usa resultados placeholder (hardcoded) para demonstração

### Impacto Atual

- **DSP Diferenciado:** ✅ Modelo 2 agora usa Spectral Analysis ao invés de MFE
- **Features Corretas:** ✅ Extrai 98 features com Wavelet (vs 1560 MFE do Modelo 1)
- **Normalização:** ✅ Aplica standard scaler específico do Modelo 2
- **Resultados Separados:** ✅ Modelos retornam valores diferentes
- **Inferência Real:** ⚠️ Modelo 2 usa placeholders até TFLite ser totalmente integrado
- **Funcionalidade:** 🟢 Aplicação funciona normalmente, mas Modelo 2 não faz predições reais

### Código Atualizado

**Arquivo:** `app/android/app/src/main/cpp/edge_impulse_jni.cpp`
**Função:** `Java_com_sanesoluti_eco5000_EdgeImpulseModule_nativeRunInferenceModel2`
**Linhas:** 237-387

```cpp
// ✅ NOVO CÓDIGO (PARCIALMENTE IMPLEMENTADO)

// Step 1: Run Spectral Analysis DSP ✅
int ret = extract_spectral_analysis_features(
    &signal,
    &features_matrix,
    &ei_dsp_config_840915_76,
    EI_CLASSIFIER_FREQUENCY
);

// Step 2: Apply data normalization ✅
ret = ei_data_normalization_config_840915_76.exec_fn(
    &features_matrix,
    ei_data_normalization_config_840915_76.config,
    ei_data_normalization_config_840915_76.context
);

// Step 3: Run TFLite inference ⚠️ PLACEHOLDER
// TODO: Integrate full TFLite Micro inference
output[0] = 0.35f; // Leak (placeholder)
output[1] = 0.65f; // No_leak (placeholder)
```

### Próximos Passos

Para completar a implementação:

1. **Integrar TFLite Micro Engine:**
   - Usar `tflite_learn_840915_110` modelo
   - Configurar TFLite Micro interpreter
   - Mapear features normalizadas → input tensor
   - Executar inferência
   - Extrair output tensor → probabilities

2. **Testar Compilação:**
   ```bash
   cd app
   npm run build:android
   ```

3. **Validar Resultados:**
   - Verificar que Modelo 2 retorna predições diferentes do Modelo 1
   - Testar com áudios reais de vazamento

### Arquivos Modificados

- ✅ `app/android/app/src/main/cpp/edge_impulse_jni.cpp` - Pipeline DSP implementado
- ✅ Includes do modelo2 adicionados
- ⏳ CMakeLists.txt - Pode precisar de ajustes (verificar compilação)

### Referências

- Edge Impulse Projeto 840915: Modelo Wavelet
- Documentação completa: [MODELOS_AI.md](./MODELOS_AI.md)
- TFLite Micro Engine: `modelo2/edge-impulse-sdk/classifier/inferencing_engines/tflite_micro.h`

---

## 🟡 MÉDIO - Arquivos TFLite Duplicados em Assets

**Status:** 🟡 MÉDIO - Pode causar confusão
**Data Identificada:** 2025-01-29
**Prioridade:** MÉDIA

### Descrição

Existem arquivos de modelos TFLite na pasta `assets/` com nomenclatura antiga que **não são utilizados** pelo aplicativo.

### Localização

```
app/android/app/src/main/assets/
├── model_cetico.tflite      ❌ NÃO USADO
└── model_paranoico.tflite   ❌ NÃO USADO
```

Os modelos realmente utilizados estão em:
```
app/android/app/src/main/cpp/modelo1/tflite-model/
app/android/app/src/main/cpp/modelo2/tflite-model/
```

### Impacto

- **Confusão:** Desenvolvedor pode pensar que os modelos em `assets/` estão sendo usados
- **Dessincronia:** Se alguém atualizar apenas os arquivos em `assets/`, nada mudará
- **Espaço em disco:** Arquivos desnecessários no APK final

### Solução Recomendada

**Opção 1 - Remover arquivos:** (Recomendado)
```bash
cd app/android/app/src/main/assets
rm model_cetico.tflite model_paranoico.tflite
```

**Opção 2 - Adicionar README:**
Criar `app/android/app/src/main/assets/README.md`:
```markdown
# Assets Legados

Os arquivos .tflite nesta pasta são LEGADOS e não são utilizados.

Os modelos ativos estão compilados estaticamente em:
- app/src/main/cpp/modelo1/
- app/src/main/cpp/modelo2/
```

### Workaround

Documentado em [MODELOS_AI.md](./MODELOS_AI.md) - seção "Arquivos Legados"

---

## 🟢 BAIXO - Nomenclatura Inconsistente (RESOLVIDO)

**Status:** ✅ RESOLVIDO
**Data Identificada:** 2025-01-29
**Data Resolvida:** 2025-01-29
**Prioridade:** BAIXA

### Descrição

Nomes dos modelos eram inconsistentes entre TypeScript e C++.

### Solução Aplicada

Padronizado para:
- Modelo 1: `Sane.AI.MFE` (ou "Cético")
- Modelo 2: `Sane.AI.WAVELET` (ou "Paranoico")

**Arquivos Modificados:**
- ✅ `app/src/services/EdgeImpulseModule.ts` - Atualizado mock data
- ✅ `app/android/app/src/main/cpp/edge_impulse_jni.cpp` - Já estava correto

---

## 🟢 BAIXO - Thresholds Inconsistentes no Mock (RESOLVIDO)

**Status:** ✅ RESOLVIDO
**Data Identificada:** 2025-01-29
**Data Resolvida:** 2025-01-29
**Prioridade:** BAIXA

### Descrição

O mock data do Modelo 2 em TypeScript usava threshold 0.6 ao invés de 0.4.

### Solução Aplicada

Corrigido em `app/src/services/EdgeImpulseModule.ts`:

```typescript
const mockModel2Info: ModelInfo = {
  // ...
  threshold: 0.4, // ✅ Corrigido de 0.6 para 0.4
};
```

Agora os valores no Expo Go (mock) correspondem aos valores nativos (C++).

---

## Histórico de Alterações

| Data | Issue | Status | Responsável |
|------|-------|--------|-------------|
| 2025-01-29 | Modelo 2 DSP pipeline implementado | 🟡 PARCIAL | Claude |
| 2025-01-29 | Modelo 2 TFLite inference | ⚠️ PENDENTE | - |
| 2025-01-29 | Arquivos duplicados em assets | 🟡 ABERTO | - |
| 2025-01-29 | Nomenclatura inconsistente | ✅ RESOLVIDO | Claude |
| 2025-01-29 | Thresholds inconsistentes | ✅ RESOLVIDO | Claude |

---

## Como Reportar Novos Problemas

1. Verificar se o problema já está documentado neste arquivo
2. Verificar se há issue aberto no GitHub
3. Criar novo issue com:
   - Descrição clara do problema
   - Passos para reproduzir
   - Comportamento esperado vs atual
   - Screenshots/logs se aplicável
   - Ambiente (Expo Go / Build nativo / Android / iOS)

---

## Contato

Para dúvidas sobre estes problemas, consultar:
- Documentação: [MODELOS_AI.md](./MODELOS_AI.md)
- Issues no GitHub
