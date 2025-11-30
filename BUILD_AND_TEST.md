# 🔨 Build e Teste - Edge Impulse com DSP

## Pré-requisitos

- ✅ Android Studio instalado
- ✅ NDK (Native Development Kit) versão 26+
- ✅ CMake 3.22.1+
- ✅ Node.js e npm
- ✅ Dispositivo Android ou Emulador

---

## 🚀 Passo a Passo para Build

### 1. Instalar Dependências Node

```bash
cd app
npm install
# ou
yarn install
```

### 2. Verificar Estrutura de Arquivos

Confirme que os SDKs foram copiados corretamente:

```bash
ls -la android/app/src/main/cpp/

# Deve mostrar:
# - CMakeLists.txt
# - EdgeImpulseModule.cpp
# - modelo1-sdk/
# - modelo1-params/
# - modelo1-tflite/
# - modelo2-sdk/
# - modelo2-params/
# - modelo2-tflite/
```

### 3. Clean Build (Primeira Vez)

```bash
cd android
./gradlew clean
```

### 4. Build do Projeto

#### Opção A: Debug Build (Desenvolvimento)

```bash
./gradlew assembleDebug
```

Isso irá:
1. ✅ Compilar código Kotlin/Java
2. ✅ Compilar código C++ via CMake
3. ✅ Linkar Edge Impulse SDK
4. ✅ Gerar APK em `app/build/outputs/apk/debug/`

**Tempo estimado:** 5-10 minutos (primeira vez)

#### Opção B: Release Build (Produção)

```bash
./gradlew assembleRelease
```

### 5. Instalar no Dispositivo

```bash
# Conecte o dispositivo via USB com USB Debugging habilitado
adb devices

# Instale o APK
adb install app/build/outputs/apk/debug/app-debug.apk
```

### 6. Ou usar Expo para Build

```bash
cd app
npx expo run:android
```

---

## 🔍 Verificação da Compilação

### Verificar Biblioteca Nativa Compilada

```bash
# Encontrar o .so compilado
find android -name "libEdgeImpulseModule.so"

# Deve aparecer algo como:
# android/app/build/intermediates/cxx/Debug/.../libEdgeImpulseModule.so
```

### Verificar Símbolos na Biblioteca

```bash
# Lista funções exportadas
nm -D android/app/build/intermediates/cxx/Debug/*/arm64-v8a/libEdgeImpulseModule.so | grep Java

# Deve mostrar:
# Java_com_sanesoluti_eco5000_EdgeImpulseModule_runInferenceModel1Native
# Java_com_sanesoluti_eco5000_EdgeImpulseModule_runInferenceModel2Native
# Java_com_sanesoluti_eco5000_EdgeImpulseModule_getModel1InfoNative
```

### Verificar Tamanho do APK

```bash
ls -lh app/build/outputs/apk/debug/app-debug.apk
```

**Tamanho esperado:** 50-150 MB (devido ao Edge Impulse SDK)

---

## 🧪 Testando a Aplicação

### 1. Verificar Logs de Inicialização

```bash
# Terminal 1: Rodar logcat
adb logcat | grep -E "(EdgeImpulse|useEdgeImpulse)"
```

```bash
# Terminal 2: Abrir o app no dispositivo
```

**Logs esperados:**
```
LOG  [useEdgeImpulse] Iniciando carregamento dos modelos de IA...
LOG  [useEdgeImpulse] Inicializando Modelo 1 (Cético) e Modelo 2 (Paranoico) com Edge Impulse SDK nativo...
D EdgeImpulseModule: EdgeImpulseModule initialized
LOG  [EdgeImpulseNative] Initializing models...
LOG  [EdgeImpulseNative] Model 1 info: {...}
LOG  [useEdgeImpulse] Modelos carregados em XXX ms
LOG  [useEdgeImpulse] ✓ Modelos prontos para inferência!
```

### 2. Testar Inferência com Áudio

1. Abra o app
2. Vá para a tela de IA
3. Selecione um arquivo de áudio WAV (48kHz)
4. Observe os logs

**Logs esperados durante inferência:**
```
LOG  [SlidingWindow] INICIANDO CLASSIFICAÇÃO COM JANELA DESLIZANTE
LOG  [SlidingWindow] Total de amostras: 220672
LOG  [SlidingWindow] Janela: 2000ms
LOG  [SlidingWindow] JANELA 1/3

D EdgeImpulseModule: [Modelo1] Starting inference...
D EdgeImpulseModule: [Modelo1] Received 96000 audio samples
D EdgeImpulseModule: [Modelo1] Running classifier (DSP + Inference)...
D EdgeImpulseModule: [Modelo1] Inference successful!
D EdgeImpulseModule: [Modelo1] DSP time: 45 ms
D EdgeImpulseModule: [Modelo1] Classification time: 12 ms
D EdgeImpulseModule: [Modelo1] Leak: 0.92345
D EdgeImpulseModule: [Modelo1] No_leak: 0.07655

LOG  [EdgeImpulseNative][Model1] Result: Leak (92.35%) DSP: 45ms, Classification: 12ms
```

---

## 🐛 Troubleshooting

### Erro: CMake não encontrado

```bash
# Instalar CMake via Android Studio
# Tools → SDK Manager → SDK Tools → CMake
```

### Erro: NDK não encontrado

```bash
# Instalar NDK via Android Studio
# Tools → SDK Manager → SDK Tools → NDK (Side by side)
```

### Erro: Library não carrega (UnsatisfiedLinkError)

```bash
# Verificar se o .so foi incluído no APK
unzip -l app/build/outputs/apk/debug/app-debug.apk | grep libEdgeImpulseModule.so

# Deve aparecer:
# lib/arm64-v8a/libEdgeImpulseModule.so
# lib/armeabi-v7a/libEdgeImpulseModule.so
```

Se não aparecer, verifique:
1. `CMakeLists.txt` está no lugar certo
2. `build.gradle` tem `externalNativeBuild` configurado
3. Rode `./gradlew clean` e rebuild

### Erro: Cannot read property 'length' of undefined

Se ainda ver esse erro, significa que o módulo nativo **não está sendo usado**.

Verificações:
```typescript
// app/src/hooks/useEdgeImpulse.ts
// Deve ter:
import { edgeImpulseNativeService } from '../services/EdgeImpulseNativeModule';

// NÃO deve ter:
import { edgeImpulseTFLiteService } from '../services/EdgeImpulseTFLite';
```

### Erro de Compilação C++

Verifique logs detalhados:
```bash
./gradlew assembleDebug --info | grep -A 20 "CMake"
```

Problemas comuns:
- Falta de includes: adicione paths no `CMakeLists.txt`
- Linking errors: adicione bibliotecas faltantes
- Symbol conflicts: use namespaces

### APK muito grande (>200MB)

Otimizações:
```gradle
// app/android/app/build.gradle
buildTypes {
    release {
        ndk {
            abiFilters 'arm64-v8a'  // Apenas 64-bit
        }
        packagingOptions {
            doNotStrip '**.so'  // Remover para produção
        }
    }
}
```

---

## 📊 Performance Esperada

### Tempos de Inferência (Modelo 1)

| Dispositivo | DSP (ms) | Classificação (ms) | Total (ms) |
|-------------|----------|-------------------|------------|
| Pixel 6     | 35-50    | 10-15             | 45-65      |
| Samsung S21 | 30-45    | 8-12              | 38-57      |
| Xiaomi Mi 11| 40-55    | 12-18             | 52-73      |

### Uso de Memória

- **RAM**: ~100-150 MB adicional durante inferência
- **Armazenamento**: APK aumenta ~80-120 MB

---

## ✅ Checklist de Validação

Antes de considerar a integração completa:

- [ ] APK compila sem erros
- [ ] Biblioteca `.so` é gerada
- [ ] App inicializa sem crashes
- [ ] Modelos carregam (logs mostram "inicializado")
- [ ] Inferência roda (vê "Running classifier" nos logs)
- [ ] DSP processa corretamente (tempo de DSP > 0ms)
- [ ] Resultado é correto (confiança entre 0-1)
- [ ] Não há erros de "undefined length"

---

## 🎯 Teste de Validação Rápida

Execute este teste para validar tudo:

```bash
# 1. Clean build
cd app/android
./gradlew clean
./gradlew assembleDebug

# 2. Verificar .so
ls -lh app/build/intermediates/cxx/Debug/*/arm64-v8a/libEdgeImpulseModule.so

# 3. Instalar
adb install -r app/build/outputs/apk/debug/app-debug.apk

# 4. Executar e verificar logs
adb logcat -c  # Limpa logs
# Abra o app
adb logcat | grep EdgeImpulse

# 5. Deve ver "Inference successful!" nos logs
```

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique [EDGE_IMPULSE_DSP_INTEGRATION.md](./EDGE_IMPULSE_DSP_INTEGRATION.md)
2. Consulte logs completos: `adb logcat > logcat.txt`
3. Verifique build logs: `./gradlew assembleDebug --stacktrace`

---

**Última atualização:** 30 de Novembro de 2025
