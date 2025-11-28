import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  Modal,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { ResultCard } from '../components';
import { useEdgeImpulse } from '../hooks/useEdgeImpulse';
import { InferenceResult } from '../types';

const logoAI = require('../assets/logo_AI.png');
const waterSplash = require('../assets/Water Splash.gif');
const robo1 = require('../assets/robo1.png');
const robo2 = require('../assets/robo2.png');

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function AIScreen() {
  const [model1Result, setModel1Result] = useState<InferenceResult | null>(null);
  const [model2Result, setModel2Result] = useState<InferenceResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<'splash' | 'cover' | 'reveal' | 'done'>('done');

  // Animation values using React Native Animated
  const splashScale = useRef(new Animated.Value(0)).current;
  const splashOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const coverOpacity = useRef(new Animated.Value(0)).current;
  const coverScale = useRef(new Animated.Value(0)).current;
  const revealOpacity = useRef(new Animated.Value(0)).current;
  const revealTranslateY = useRef(new Animated.Value(50)).current;

  // Store results temporarily during animation
  const pendingResults = useRef<{
    model1: InferenceResult | null;
    model2: InferenceResult | null;
  } | null>(null);

  const {
    isInitialized,
    isLoading: isModelLoading,
    error: modelError,
    initializeModels,
    runInference,
  } = useEdgeImpulse();

  useEffect(() => {
    initializeModels();
  }, [initializeModels]);

  useEffect(() => {
    if (modelError) {
      Alert.alert('Erro do Modelo', modelError);
    }
  }, [modelError]);

  const finishAnimation = useCallback(() => {
    if (pendingResults.current) {
      setModel1Result(pendingResults.current.model1);
      setModel2Result(pendingResults.current.model2);
      pendingResults.current = null;
    }
    setShowAnimation(false);
    setAnimationPhase('done');
  }, []);

  const startRevealPhase = useCallback(() => {
    setAnimationPhase('reveal');

    Animated.parallel([
      Animated.timing(revealOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(revealTranslateY, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setTimeout(finishAnimation, 1500);
    });
  }, [revealOpacity, revealTranslateY, finishAnimation]);

  const startCoverPhase = useCallback(() => {
    setAnimationPhase('cover');

    Animated.parallel([
      Animated.timing(splashOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(coverScale, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(coverOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      startRevealPhase();
    });
  }, [splashOpacity, logoOpacity, coverScale, coverOpacity, startRevealPhase]);

  const runAnalysisAnimation = useCallback((results: { model1Result: InferenceResult | null; model2Result: InferenceResult | null }) => {
    pendingResults.current = { model1: results.model1Result, model2: results.model2Result };
    setShowAnimation(true);
    setAnimationPhase('splash');

    // Reset animation values
    splashScale.setValue(0);
    splashOpacity.setValue(0);
    logoScale.setValue(0);
    logoOpacity.setValue(0);
    coverOpacity.setValue(0);
    coverScale.setValue(0);
    revealOpacity.setValue(0);
    revealTranslateY.setValue(50);

    // Phase 1: Splash animation with logo
    Animated.parallel([
      Animated.timing(splashOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.spring(splashScale, {
          toValue: 1.2,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(splashScale, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(200),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(200),
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 50,
          friction: 5,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Wait for splash animation then start cover phase
    setTimeout(() => {
      startCoverPhase();
    }, 1500);
  }, [splashScale, splashOpacity, logoScale, logoOpacity, coverOpacity, coverScale, revealOpacity, revealTranslateY, startCoverPhase]);

  const parseWavFile = async (uri: string): Promise<number[]> => {
    const file = new File(uri);
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    const dataView = new DataView(bytes.buffer);

    // Verify WAV header
    const riff = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
    const wave = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);

    if (riff !== 'RIFF' || wave !== 'WAVE') {
      throw new Error('Arquivo nao e um WAV valido');
    }

    // Get audio format info
    const numChannels = dataView.getUint16(22, true);
    const bitsPerSample = dataView.getUint16(34, true);

    // Find data chunk
    let dataOffset = 12;
    while (dataOffset < bytes.length - 8) {
      const chunkId = String.fromCharCode(
        bytes[dataOffset],
        bytes[dataOffset + 1],
        bytes[dataOffset + 2],
        bytes[dataOffset + 3]
      );
      const chunkSize = dataView.getUint32(dataOffset + 4, true);

      if (chunkId === 'data') {
        dataOffset += 8;
        break;
      }
      dataOffset += 8 + chunkSize;
    }

    // Extract audio samples
    const audioData: number[] = [];
    const bytesPerSample = bitsPerSample / 8;

    for (let i = dataOffset; i < bytes.length; i += bytesPerSample * numChannels) {
      let sample: number;

      if (bitsPerSample === 16) {
        sample = dataView.getInt16(i, true) / 32768;
      } else if (bitsPerSample === 8) {
        sample = (bytes[i] - 128) / 128;
      } else {
        sample = dataView.getInt16(i, true) / 32768;
      }

      audioData.push(sample);
    }

    return audioData;
  };

  const handleSelectAudio = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/wav',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];

      if (!file.name.toLowerCase().endsWith('.wav')) {
        Alert.alert('Formato Invalido', 'Por favor, selecione um arquivo .wav');
        return;
      }

      setModel1Result(null);
      setModel2Result(null);
      setIsProcessing(true);

      try {
        const audioData = await parseWavFile(file.uri);

        if (!isInitialized) {
          throw new Error('Modelos nao inicializados');
        }

        const results = await runInference(audioData);

        // Start animation with results
        setIsProcessing(false);
        runAnalysisAnimation(results);
      } catch (err) {
        setIsProcessing(false);
        Alert.alert(
          'Erro de Processamento',
          err instanceof Error ? err.message : 'Erro desconhecido ao processar o arquivo'
        );
      }
    } catch (err) {
      Alert.alert(
        'Erro',
        err instanceof Error ? err.message : 'Erro ao selecionar arquivo'
      );
    }
  }, [isInitialized, runInference, runAnalysisAnimation]);

  const isButtonDisabled = !isInitialized || isModelLoading || isProcessing || showAnimation;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image source={logoAI} style={styles.logo} resizeMode="contain" />
        </View>

        {/* Loading State */}
        {isModelLoading && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Inicializando modelos de IA...</Text>
          </View>
        )}

        {/* Results Cards */}
        <ResultCard
          title="Cético"
          result={model1Result}
          isLoading={isProcessing}
          icon={robo1}
        />

        <ResultCard
          title="Paranoico"
          result={model2Result}
          isLoading={isProcessing}
          icon={robo2}
        />

        {/* Select Audio Button */}
        <TouchableOpacity
          style={[styles.selectButton, isButtonDisabled && styles.selectButtonDisabled]}
          onPress={handleSelectAudio}
          disabled={isButtonDisabled}
          activeOpacity={0.8}
        >
          <Text style={styles.selectButtonText}>
            {isProcessing ? 'Processando...' : 'Selecionar Áudio'}
          </Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerBrand}>Sanesoluti</Text>
        </View>
      </ScrollView>

      {/* Animation Modal */}
      <Modal
        visible={showAnimation}
        transparent
        animationType="none"
        statusBarTranslucent
      >
        <View style={styles.animationContainer}>
          {/* Phase 1 & 2: Splash with Logo */}
          {(animationPhase === 'splash' || animationPhase === 'cover') && (
            <View style={styles.splashContainer}>
              <Animated.Image
                source={waterSplash}
                style={[
                  styles.splashImage,
                  {
                    transform: [{ scale: splashScale }],
                    opacity: splashOpacity,
                  },
                ]}
                resizeMode="contain"
              />
              <Animated.Image
                source={logoAI}
                style={[
                  styles.splashLogo,
                  {
                    transform: [{ scale: logoScale }],
                    opacity: logoOpacity,
                  },
                ]}
                resizeMode="contain"
              />
            </View>
          )}

          {/* Phase 2: Blue Cover */}
          {animationPhase === 'cover' && (
            <Animated.View
              style={[
                styles.blueCover,
                {
                  opacity: coverOpacity,
                  transform: [{ scale: coverScale }],
                },
              ]}
            />
          )}

          {/* Phase 3: Reveal Results */}
          {animationPhase === 'reveal' && (
            <Animated.View
              style={[
                styles.revealContainer,
                {
                  opacity: revealOpacity,
                  transform: [{ translateY: revealTranslateY }],
                },
              ]}
            >
              <View style={styles.revealContent}>
                <Image source={logoAI} style={styles.revealLogo} resizeMode="contain" />
                <Text style={styles.revealTitle}>Análise Concluída!</Text>

                <View style={styles.revealCards}>
                  <ResultCard
                    title="Cético"
                    result={pendingResults.current?.model1 || null}
                    isLoading={false}
                    icon={robo1}
                  />
                  <ResultCard
                    title="Paranoico"
                    result={pendingResults.current?.model2 || null}
                    isLoading={false}
                    icon={robo2}
                  />
                </View>
              </View>
            </Animated.View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F2F2F2',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 120,
    height: 120,
  },
  loadingContainer: {
    backgroundColor: '#e6f7f5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  loadingText: {
    color: '#027368',
    textAlign: 'center',
  },
  selectButton: {
    backgroundColor: '#F28322',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  selectButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  selectButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    marginTop: 32,
  },
  footerBrand: {
    fontSize: 14,
    fontWeight: '500',
    color: '#027368',
  },
  // Animation styles
  animationContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  splashImage: {
    width: SCREEN_WIDTH * 0.8,
    height: SCREEN_WIDTH * 0.8,
    position: 'absolute',
  },
  splashLogo: {
    width: 100,
    height: 100,
    position: 'absolute',
  },
  blueCover: {
    position: 'absolute',
    width: SCREEN_WIDTH * 2,
    height: SCREEN_HEIGHT * 2,
    backgroundColor: '#03A696',
    borderRadius: SCREEN_WIDTH,
  },
  revealContainer: {
    flex: 1,
    backgroundColor: '#03A696',
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  revealContent: {
    width: '100%',
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  revealLogo: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  revealTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 24,
  },
  revealCards: {
    width: '100%',
  },
});
