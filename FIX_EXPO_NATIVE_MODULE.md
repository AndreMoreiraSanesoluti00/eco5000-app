# 🔧 Corrigindo Expo com Módulo Nativo C++

## Problema

Erro: `TurboModuleRegistry.getEnforcing(...): 'PlatformConstants' could not be found`

**Causa:** Expo não sabe que você adicionou um módulo nativo C++ e precisa fazer prebuild.

---

## Solução Completa

### Opção 1: Expo Prebuild (Recomendado)

Expo precisa gerar os arquivos nativos Android/iOS novamente:

```bash
cd app

# 1. Fazer prebuild (vai recriar android/ e ios/)
npx expo prebuild --clean

# 2. Compilar novamente
cd android
.\gradlew clean assembleDebug

# 3. Instalar
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

**⚠️ IMPORTANTE:** O `expo prebuild` vai **sobrescrever** algumas modificações em `android/`.

Você vai precisar **reaplicar** estas mudanças depois:

1. Adicionar `EdgeImpulsePackage()` em `MainApplication.kt`
2. Garantir que `externalNativeBuild` está em `build.gradle`

### Opção 2: Criar Plugin de Configuração Expo (Melhor para Longo Prazo)

Crie um plugin Expo para automatizar as modificações:

**1. Criar `app/plugins/withEdgeImpulse.js`:**

```javascript
const { withAppBuildGradle, withMainApplication } = require('@expo/config-plugins');

module.exports = function withEdgeImpulse(config) {
  // Adicionar CMake config ao build.gradle
  config = withAppBuildGradle(config, (config) => {
    const { modResults } = config;

    // Adicionar externalNativeBuild se não existir
    if (!modResults.contents.includes('externalNativeBuild')) {
      modResults.contents = modResults.contents.replace(
        /defaultConfig\s*\{/,
        `defaultConfig {
        externalNativeBuild {
            cmake {
                cppFlags "-std=c++14 -fexceptions -frtti -O3"
                arguments "-DANDROID_STL=c++_shared"
            }
        }
        ndk {
            abiFilters 'armeabi-v7a', 'arm64-v8a', 'x86', 'x86_64'
        }
`
      );

      modResults.contents = modResults.contents.replace(
        /android\s*\{/,
        `android {
    externalNativeBuild {
        cmake {
            path "src/main/cpp/CMakeLists.txt"
            version "3.22.1"
        }
    }
`
      );
    }

    return config;
  });

  // Adicionar EdgeImpulsePackage ao MainApplication
  config = withMainApplication(config, async (config) => {
    const { modResults } = config;

    if (!modResults.contents.includes('EdgeImpulsePackage')) {
      // Adicionar import
      modResults.contents = modResults.contents.replace(
        /(import\s+.*\n)+/,
        `$&import com.sanesoluti.eco5000.EdgeImpulsePackage\n`
      );

      // Adicionar ao packages
      modResults.contents = modResults.contents.replace(
        /PackageList\(this\)\.packages\.apply\s*\{/,
        `PackageList(this).packages.apply {
              add(EdgeImpulsePackage())`
      );
    }

    return config;
  });

  return config;
};
```

**2. Adicionar ao `app.json`:**

```json
{
  "expo": {
    "plugins": [
      "./plugins/withEdgeImpulse"
    ]
  }
}
```

**3. Rodar prebuild:**

```bash
npx expo prebuild --clean
```

Agora as modificações serão aplicadas automaticamente!

### Opção 3: Ejetar do Expo (Última Opção)

Se você não precisa mais do Expo gerenciado:

```bash
cd app
npx expo eject
```

Isso converte para React Native puro (sem Expo managed workflow).

---

## Passos Detalhados (Opção 1 - Rápida)

### 1. Backup das Modificações

```bash
# Fazer backup dos arquivos modificados
cp android/app/src/main/java/com/sanesoluti/eco5000/MainApplication.kt MainApplication.kt.backup
cp android/app/build.gradle build.gradle.backup
```

### 2. Expo Prebuild

```bash
cd app
npx expo prebuild --clean
```

### 3. Copiar Arquivos C++

Os arquivos em `android/app/src/main/cpp` **não** serão sobrescritos, mas verifique:

```bash
ls android/app/src/main/cpp/
# Deve mostrar:
# - CMakeLists.txt
# - EdgeImpulseModule.cpp
# - edge-impulse-sdk/
# - model-parameters/
# - tflite-model/
```

### 4. Reaplicar Modificações

**a) MainApplication.kt:**

```bash
# Editar android/app/src/main/java/com/sanesoluti/eco5000/MainApplication.kt
# Adicionar:
import com.sanesoluti.eco5000.EdgeImpulsePackage

# E dentro de getPackages():
add(EdgeImpulsePackage())
```

**b) build.gradle:**

```bash
# Editar android/app/build.gradle
# Adicionar dentro de defaultConfig:
externalNativeBuild {
    cmake {
        cppFlags "-std=c++14 -fexceptions -frtti -O3"
        arguments "-DANDROID_STL=c++_shared"
    }
}
ndk {
    abiFilters 'armeabi-v7a', 'arm64-v8a', 'x86', 'x86_64'
}

# E dentro de android:
externalNativeBuild {
    cmake {
        path "src/main/cpp/CMakeLists.txt"
        version "3.22.1"
    }
}
```

### 5. Rebuild

```bash
cd android
.\gradlew clean assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### 6. Iniciar Metro

```bash
cd ..
npx expo start
```

---

## Verificação Final

### 1. Verificar Biblioteca

```bash
unzip -l android/app/build/outputs/apk/debug/app-debug.apk | grep libEdgeImpulseModule
```

Deve mostrar a biblioteca para todas as arquiteturas.

### 2. Verificar Logs

```bash
adb logcat | grep EdgeImpulse
```

Deve mostrar:
```
D EdgeImpulseModule: EdgeImpulseModule native library loaded successfully
```

### 3. Testar App

Se o app abre sem erros do TurboModuleRegistry, significa que funcionou!

---

## Por Que Isso Acontece?

O Expo gerencia automaticamente a configuração nativa (Android/iOS). Quando você adiciona código C++ manualmente:

1. ❌ Expo não sabe sobre o CMake
2. ❌ Expo não sabe sobre o módulo nativo
3. ❌ Metro bundler usa cache antigo

**Solução:** `expo prebuild` regenera tudo com as novas configurações.

---

## Alternativa Sem Prebuild

Se você não quer rodar `prebuild`, pode tentar:

```bash
cd app

# 1. Limpar tudo
rm -rf node_modules
rm -rf android/build
rm -rf android/app/build
rm -rf .expo

# 2. Reinstalar
npm install

# 3. Rebuild Android
cd android
.\gradlew clean assembleDebug

# 4. Limpar cache Metro
cd ..
npx expo start --clear
```

---

## Resumo

**Problema:** Expo + Módulo Nativo C++ = Precisa prebuild

**Solução Rápida:**
```bash
npx expo prebuild --clean
cd android && .\gradlew clean assembleDebug
```

**Solução Permanente:** Criar plugin de configuração Expo

---

Boa sorte! 🚀
