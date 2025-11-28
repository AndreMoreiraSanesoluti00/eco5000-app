# ECO5000 - App de Detecção de Vazamentos com IA

Aplicativo React Native/Expo para detecção de vazamentos usando modelos de IA do Edge Impulse.

## Estrutura do Projeto

```
eco5000-app/
├── app/                          # Aplicativo Expo/React Native
│   ├── src/
│   │   ├── components/           # Componentes React Native
│   │   ├── hooks/                # Custom hooks
│   │   ├── screens/              # Telas do app
│   │   ├── services/             # Serviços (Edge Impulse bridge)
│   │   └── types/                # TypeScript types
│   ├── android/                  # Projeto Android nativo
│   │   └── app/src/main/cpp/     # Código JNI/C++ Edge Impulse
│   └── ...
├── modelo1/                      # Modelo Edge Impulse (Sane.AI.Final.separafo)
└── modelo2/                      # Modelo Edge Impulse (Sane.AI.Final)
```

## Pré-requisitos

- Node.js 18+
- Android Studio com NDK 25.1.8937393
- Android SDK 34
- CMake 3.18.1+

## Instalação

1. **Instalar dependências:**
```bash
cd app
npm install
```

2. **Gerar projeto Android (se necessário):**
```bash
npx expo prebuild --platform android
```

3. **Copiar modelos Edge Impulse para pasta nativa:**
Os modelos já devem estar em `android/app/src/main/cpp/model1/` e `model2/`

4. **Compilar e executar:**
```bash
npm run android
```

## Arquitetura

### React Native (TypeScript)
- **NativeWind**: Tailwind CSS para estilização
- **expo-av**: Gravação de áudio
- **React Navigation**: Navegação entre telas

### Código Nativo (Android/C++)
- **JNI Bridge**: Comunicação entre Java/Kotlin e C++
- **Edge Impulse SDK**: Inferência dos modelos de ML
- **CMake**: Build system para código nativo

### Modelos de IA
Ambos os modelos detectam vazamentos de áudio:
- **Modelo 1** (Sane.AI.Final.separafo): Threshold 0.7
- **Modelo 2** (Sane.AI.Final): Threshold 0.9

Labels: `Leak`, `No_leak`

## Fluxo de Uso

1. Usuário pressiona botão de gravação
2. App grava 5 segundos de áudio (48kHz, mono)
3. Áudio é convertido para float array
4. Dados são enviados para código nativo via JNI
5. Edge Impulse SDK processa e classifica
6. Resultados são exibidos na UI

## Configuração do Edge Impulse

Os modelos foram exportados como "C++ Library" do Edge Impulse Studio e incluem:
- `edge-impulse-sdk/`: SDK de inferência
- `model-parameters/`: Configuração do modelo
- `tflite-model/`: Modelo TensorFlow Lite

## Build para Produção

```bash
# APK de debug
cd android && ./gradlew assembleDebug

# APK de release (requer keystore)
cd android && ./gradlew assembleRelease
```

## Troubleshooting

### Erro de CMake
Certifique-se que o NDK está instalado no Android Studio:
- Android Studio > SDK Manager > SDK Tools > NDK (Side by side)

### Erro de compilação C++
Verifique se os modelos Edge Impulse estão na pasta correta:
`android/app/src/main/cpp/model1/` e `model2/`

### Permissão de Microfone
O app solicita permissão automaticamente. Se negada, vá em Configurações > Apps > ECO5000 > Permissões.

## Licença

Proprietary - SaneSoluti
