#!/bin/bash

# Script para recompletely rebuild do projeto Expo com módulo nativo
# Uso: bash fix-and-rebuild.sh

set -e  # Parar em caso de erro

echo "=================================="
echo "🔧 FIX & REBUILD - Expo + Native"
echo "=================================="
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

cd app

echo -e "${YELLOW}[1/6] Limpando cache e builds...${NC}"
rm -rf node_modules
rm -rf android/build
rm -rf android/app/build
rm -rf .expo
rm -rf android/.gradle
echo -e "${GREEN}✓ Cache limpo${NC}"
echo ""

echo -e "${YELLOW}[2/6] Reinstalando dependências...${NC}"
npm install
echo -e "${GREEN}✓ Dependências instaladas${NC}"
echo ""

echo -e "${YELLOW}[3/6] Verificando arquivos C++...${NC}"
if [ -f "android/app/src/main/cpp/EdgeImpulseModule.cpp" ]; then
    echo -e "${GREEN}✓ EdgeImpulseModule.cpp encontrado${NC}"
else
    echo -e "${RED}✗ EdgeImpulseModule.cpp NÃO encontrado${NC}"
    exit 1
fi

if [ -d "android/app/src/main/cpp/edge-impulse-sdk" ]; then
    echo -e "${GREEN}✓ edge-impulse-sdk encontrado${NC}"
else
    echo -e "${RED}✗ edge-impulse-sdk NÃO encontrado${NC}"
    exit 1
fi
echo ""

echo -e "${YELLOW}[4/6] Rebuild Android...${NC}"
cd android

# Limpar e compilar
./gradlew clean
./gradlew assembleDebug

echo -e "${GREEN}✓ Build Android completo${NC}"
echo ""

echo -e "${YELLOW}[5/6] Verificando biblioteca nativa...${NC}"
if [ -f "app/build/intermediates/merged_native_libs/debug/mergeDebugNativeLibs/out/lib/arm64-v8a/libEdgeImpulseModule.so" ]; then
    echo -e "${GREEN}✓ libEdgeImpulseModule.so criado com sucesso${NC}"
    ls -lh app/build/intermediates/merged_native_libs/debug/mergeDebugNativeLibs/out/lib/*/libEdgeImpulseModule.so
else
    echo -e "${RED}✗ Biblioteca nativa NÃO encontrada${NC}"
    exit 1
fi
echo ""

echo -e "${YELLOW}[6/6] Instalando no dispositivo...${NC}"
adb devices
adb install -r app/build/outputs/apk/debug/app-debug.apk
echo -e "${GREEN}✓ APK instalado${NC}"
echo ""

cd ..

echo "=================================="
echo -e "${GREEN}✓ REBUILD COMPLETO!${NC}"
echo "=================================="
echo ""
echo "Próximos passos:"
echo "1. npx expo start --clear"
echo "2. Pressione 'a' para abrir no Android"
echo ""
echo "Verificar logs:"
echo "  adb logcat | grep EdgeImpulse"
echo ""
