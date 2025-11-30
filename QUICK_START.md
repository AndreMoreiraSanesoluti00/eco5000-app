# 🚀 Quick Start - Edge Impulse DSP Integration

## Status Atual

✅ **Código implementado** - Módulo nativo C++ com Edge Impulse SDK
✅ **Arquivos copiados** - SDKs do modelo1 e modelo2 estão no lugar
🔄 **Próximo passo** - Compilar e testar

---

## 🛠️ Compilar o Projeto

### 1. Clean Build

```bash
cd app/android
.\gradlew clean
```

### 2. Build Debug

```bash
.\gradlew assembleDebug
```

**Tempo estimado:** 5-10 minutos (primeira vez)

### 3. Verificar Compilação

Se tudo correr bem, você verá:

```
BUILD SUCCESSFUL in 5m 23s
```

E a biblioteca nativa será criada em:
```
app/build/intermediates/cxx/Debug/.../libEdgeImpulseModule.so
```

---

## ⚠️ Possíveis Erros e Soluções

### Erro: "Cannot find modelo1-sdk"

**Causa:** SDKs não foram copiados corretamente

**Solução:**
```bash
# Verificar se os SDKs existem
ls app/src/main/cpp/modelo1-sdk
ls app/src/main/cpp/modelo2-sdk

# Se não existirem, copiar novamente:
cd ../..  # Voltar para raiz do projeto
cp -r modelo1/edge-impulse-sdk app/android/app/src/main/cpp/modelo1-sdk
cp -r modelo1/model-parameters app/android/app/src/main/cpp/modelo1-params
cp -r modelo1/tflite-model app/android/app/src/main/cpp/modelo1-tflite
```

### Erro: Headers não encontrados

**Causa:** Caminhos de include incorretos

**Solução:** Verificar que o CMakeLists.txt está apontando para os diretórios corretos.

### Erro: Muito grande para compilar

**Causa:** Edge Impulse SDK é grande e pode demorar

**Solução:** Isso é normal na primeira compilação. Seja paciente! ☕

---

## 🧪 Testar Após Compilação

### 1. Instalar no Dispositivo

```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### 2. Verificar Logs

```bash
adb logcat | grep -E "(EdgeImpulse|useEdgeImpulse)"
```

### 3. Logs Esperados

```
D EdgeImpulseModule: EdgeImpulseModule native library loaded successfully
LOG [useEdgeImpulse] Inicializando Modelo 1...
LOG [EdgeImpulseNative] Model 1 info: {"name":"Sane.AI.MFE",...}
LOG [useEdgeImpulse] ✓ Modelos prontos para inferência!
```

### 4. Testar Inferência

1. Abra o app
2. Vá para a tela de IA
3. Selecione um arquivo WAV (48kHz)
4. Observe os logs:

```
D EdgeImpulseModule: [Modelo1] Starting inference...
D EdgeImpulseModule: [Modelo1] Received 96000 audio samples
D EdgeImpulseModule: [Modelo1] Running classifier (DSP + Inference)...
D EdgeImpulseModule: [Modelo1] Inference successful!
D EdgeImpulseModule: [Modelo1] DSP time: 45 ms
D EdgeImpulseModule: [Modelo1] Classification time: 12 ms
D EdgeImpulseModule: [Modelo1] Leak: 0.92345
D EdgeImpulseModule: [Modelo1] No_leak: 0.07655
```

---

## 📋 Checklist de Validação

Antes de considerar a integração completa:

- [ ] ✅ Código compila sem erros
- [ ] ✅ Biblioteca `.so` é criada
- [ ] ✅ App instala sem crashes
- [ ] ✅ Modelos carregam (vê "library loaded successfully")
- [ ] ✅ Inferência roda (vê "Running classifier" nos logs)
- [ ] ✅ DSP funciona (DSP time > 0ms nos logs)
- [ ] ✅ Resultado é válido (confidence entre 0-1)
- [ ] ✅ Não há erro "undefined length" ✨

---

## 🎉 Sucesso!

Se você vê nos logs:

```
[Modelo1] Inference successful!
[Modelo1] DSP time: XX ms
[Modelo1] Leak: 0.XXXXX
```

**PARABÉNS!** 🎊 A integração do DSP está funcionando!

O problema original ("Cannot read property 'length' of undefined") foi resolvido porque agora o DSP está processando o áudio antes da inferência.

---

## 📚 Próximos Passos

1. **Teste com áudios reais** de vazamento
2. **Valide a precisão** dos resultados
3. **Implemente Modelo 2** (Wavelet) usando namespace isolation
4. **Otimize performance** se necessário

---

## 🆘 Se Algo Der Errado

1. Consulte [BUILD_AND_TEST.md](./BUILD_AND_TEST.md) para troubleshooting detalhado
2. Verifique [EDGE_IMPULSE_DSP_INTEGRATION.md](./EDGE_IMPULSE_DSP_INTEGRATION.md) para entender a arquitetura
3. Veja logs completos: `.\gradlew assembleDebug --stacktrace > build-log.txt`

---

**Boa sorte! 🚀**
