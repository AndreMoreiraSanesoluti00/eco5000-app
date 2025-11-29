import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { Video, ResizeMode, AVPlaybackStatus, Audio } from 'expo-av';
import { ResultCard, WaveformCard, WaterDropIndicator } from '../components';
import { useEdgeImpulse } from '../hooks/useEdgeImpulse';
import { InferenceResult } from '../types';
import {
  parseAudioFile,
  isSupportedAudioFormat,
  getSupportedFormatsString,
  AUDIO_MIME_TYPES,
} from '../utils/audioParser';

const logoAI = require('../assets/logo_AI.png');
const waveProgressVideo = require('../assets/Wave Progress.mp4');
const robo1 = require('../assets/robo1.png');
const robo2 = require('../assets/robo2.png');

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export function AIScreen() {
  const [model1Result, setModel1Result] = useState<InferenceResult | null>(null);
  const [model2Result, setModel2Result] = useState<InferenceResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [audioSamples, setAudioSamples] = useState<number[]>([]);
  const [audioFileName, setAudioFileName] = useState<string>('');

  // Animation values
  const card1Opacity = useRef(new Animated.Value(1)).current;
  const card1Scale = useRef(new Animated.Value(1)).current;
  const card2Opacity = useRef(new Animated.Value(1)).current;
  const card2Scale = useRef(new Animated.Value(1)).current;
  const spectralCardOpacity = useRef(new Animated.Value(0)).current;
  const spectralCardScale = useRef(new Animated.Value(0.8)).current;
  const waterDropOpacity = useRef(new Animated.Value(0)).current;
  const waterDropScale = useRef(new Animated.Value(0.8)).current;

  // Logo animation values
  const logoTranslateY = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(1)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // Video ref using expo-av
  const videoRef = useRef<Video>(null);

  // Store results temporarily during animation
  const pendingResults = useRef<{
    model1: InferenceResult | null;
    model2: InferenceResult | null;
  } | null>(null);

  // Guard to prevent multiple calls to completeAnimationAfterVideo
  const isCompletingAnimation = useRef(false);

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

  // Handle video playback status - use a ref to avoid dependency chain issues
  const handleVideoPlaybackStatus = useCallback((status: AVPlaybackStatus) => {
    console.log('[AIScreen] Video status:', status.isLoaded ? 'loaded' : 'not loaded', status);

    // Only handle the didJustFinish event, ignore unload events
    if (!status.isLoaded) {
      return;
    }

    if (status.didJustFinish) {
      // Guard against multiple calls
      if (isCompletingAnimation.current) {
        console.log('[AIScreen] completeAnimationAfterVideo already in progress, skipping');
        return;
      }
      isCompletingAnimation.current = true;
      console.log('[AIScreen] Video finished, starting completion animation');

      // Use InteractionManager to ensure we're outside the callback stack
      setTimeout(() => {
        // Hide video
        setShowVideo(false);

        // Animate logo back
        Animated.parallel([
          Animated.timing(logoTranslateY, { toValue: 0, duration: 500, useNativeDriver: true }),
          Animated.timing(logoScale, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(overlayOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]).start(() => {
          // Set the results
          if (pendingResults.current) {
            setModel1Result(pendingResults.current.model1);
            setModel2Result(pendingResults.current.model2);
            pendingResults.current = null;
          }

          // Animate cards appearing with stagger
          setTimeout(() => {
            Animated.stagger(100, [
              Animated.parallel([
                Animated.timing(waterDropOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
                Animated.spring(waterDropScale, { toValue: 1, tension: 100, friction: 8, useNativeDriver: true }),
              ]),
              Animated.parallel([
                Animated.timing(card1Opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
                Animated.spring(card1Scale, { toValue: 1, tension: 100, friction: 8, useNativeDriver: true }),
              ]),
              Animated.parallel([
                Animated.timing(card2Opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
                Animated.spring(card2Scale, { toValue: 1, tension: 100, friction: 8, useNativeDriver: true }),
              ]),
              Animated.parallel([
                Animated.timing(spectralCardOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
                Animated.spring(spectralCardScale, { toValue: 1, tension: 100, friction: 8, useNativeDriver: true }),
              ]),
            ]).start(() => {
              setIsAnimating(false);
            });
          }, 50);
        });
      }, 50);
    }
  }, [logoTranslateY, logoScale, overlayOpacity, waterDropOpacity, waterDropScale, card1Opacity, card1Scale, card2Opacity, card2Scale, spectralCardOpacity, spectralCardScale]);

  // Calculate the Y distance to move logo to center of screen
  const calculateCenterOffset = useCallback(() => {
    // Logo starts at top: 91px, needs to move to center of screen
    // Center of screen is SCREEN_HEIGHT / 2, logo is 120px so center it by subtracting 60
    const logoStartY = 91; // matches animatedLogoContainer top
    const targetY = SCREEN_HEIGHT / 2 - 60; // center of screen minus half logo height
    return targetY - logoStartY;
  }, []);

  // Start the processing animation (logo moves to center, then video plays)
  const startProcessingAnimation = useCallback(async () => {
    // Configure audio mode to NOT duck other audio
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
    });

    // Reset the animation completion guard
    isCompletingAnimation.current = false;

    setIsAnimating(true);

    // Reset card animations (hide them initially)
    card1Opacity.setValue(0);
    card1Scale.setValue(0.8);
    card2Opacity.setValue(0);
    card2Scale.setValue(0.8);
    spectralCardOpacity.setValue(0);
    spectralCardScale.setValue(0.8);
    waterDropOpacity.setValue(0);
    waterDropScale.setValue(0.8);

    // Reset logo position
    logoTranslateY.setValue(0);
    logoScale.setValue(1);
    overlayOpacity.setValue(0);

    const centerOffset = calculateCenterOffset();

    // Phase 1: Show overlay and move logo to center
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(logoTranslateY, {
        toValue: centerOffset,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(logoScale, {
        toValue: 1.3,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // When logo reaches center, start video
      console.log('[AIScreen] Logo reached center, starting video');
      setShowVideo(true);
    });
  }, [calculateCenterOffset, logoTranslateY, logoScale, overlayOpacity, card1Opacity, card1Scale, card2Opacity, card2Scale]);

  // Store results when analysis is complete (video is already playing)
  const runAnalysisAnimation = useCallback(async (results: { model1Result: InferenceResult | null; model2Result: InferenceResult | null }) => {
    console.log('[AIScreen] runAnalysisAnimation called, storing results');
    pendingResults.current = { model1: results.model1Result, model2: results.model2Result };
    // Video is already playing from startProcessingAnimation
    // Results will be shown when video finishes (in handleVideoPlaybackStatus)
  }, []);

  const handleSelectAudio = useCallback(async () => {
    try {
      console.log('[AIScreen] Abrindo seletor de arquivos...');

      const result = await DocumentPicker.getDocumentAsync({
        type: AUDIO_MIME_TYPES,
        copyToCacheDirectory: true,
      });

      console.log('[AIScreen] Resultado do picker:', JSON.stringify(result));

      if (result.canceled) {
        console.log('[AIScreen] Seleção cancelada pelo usuário');
        return;
      }

      const file = result.assets[0];
      console.log('[AIScreen] Arquivo selecionado:', file.name, 'URI:', file.uri);

      if (!isSupportedAudioFormat(file.name)) {
        Alert.alert(
          'Formato Invalido',
          `Por favor, selecione um arquivo de áudio suportado.\n\nFormatos aceitos: ${getSupportedFormatsString()}`
        );
        return;
      }

      setModel1Result(null);
      setModel2Result(null);
      setAudioSamples([]);
      setAudioFileName(file.name);
      setIsProcessing(true);

      // Start animation immediately when file is selected
      startProcessingAnimation();

      try {
        const audioData = await parseAudioFile(file.uri, file.name);

        // Store audio samples for spectral visualization
        setAudioSamples(audioData);

        if (!isInitialized) {
          throw new Error('Modelos nao inicializados');
        }

        const results = await runInference(audioData);

        setIsProcessing(false);
        runAnalysisAnimation(results);
      } catch (err) {
        setIsProcessing(false);
        setIsAnimating(false);
        setShowVideo(false);
        setAudioSamples([]);
        setAudioFileName('');
        // Reset animation guard
        isCompletingAnimation.current = false;
        // Reset logo position on error
        logoTranslateY.setValue(0);
        logoScale.setValue(1);
        overlayOpacity.setValue(0);
        card1Opacity.setValue(1);
        card1Scale.setValue(1);
        card2Opacity.setValue(1);
        card2Scale.setValue(1);
        spectralCardOpacity.setValue(0);
        spectralCardScale.setValue(0.8);
        waterDropOpacity.setValue(0);
        waterDropScale.setValue(0.8);
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
  }, [isInitialized, runInference, runAnalysisAnimation, startProcessingAnimation, logoTranslateY, logoScale, overlayOpacity, card1Opacity, card1Scale, card2Opacity, card2Scale]);

  const isButtonDisabled = !isInitialized || isModelLoading || isProcessing || isAnimating;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        scrollEnabled={!isAnimating}
      >
        {/* Logo Container */}
        <View style={styles.logoContainer}>
          {/* Logo only shows here when not animating */}
          {!isAnimating && (
            <Animated.Image
              source={logoAI}
              style={styles.logo}
              resizeMode="contain"
            />
          )}
        </View>

        {/* Loading State */}
        {isModelLoading && !isAnimating && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Inicializando modelos de IA...</Text>
          </View>
        )}

        {/* Water Drop Indicator - appears after classification */}
        {(model1Result || model2Result) && (
          <Animated.View
            style={[
              styles.waterDropWrapper,
              {
                opacity: waterDropOpacity,
                transform: [{ scale: waterDropScale }],
              },
            ]}
          >
            <WaterDropIndicator
              percentage={(() => {
                // Calculate leak percentage: 100% if Leak, 0% if No_leak
                // Based on average of both models
                const getLeakPercentage = (result: InferenceResult | null) => {
                  if (!result) return null;
                  // If label is "Leak", use confidence as leak percentage
                  // If label is "No_leak", leak percentage is (1 - confidence)
                  return result.label === 'Leak'
                    ? result.confidence * 100
                    : (1 - result.confidence) * 100;
                };

                const leak1 = getLeakPercentage(model1Result);
                const leak2 = getLeakPercentage(model2Result);

                if (leak1 !== null && leak2 !== null) {
                  return (leak1 + leak2) / 2;
                } else if (leak1 !== null) {
                  return leak1;
                } else if (leak2 !== null) {
                  return leak2;
                }
                return 0;
              })()}
            />
          </Animated.View>
        )}

        {/* Results Cards with Animation */}
        <View style={styles.cardsContainer}>
          <Animated.View
            style={[
              styles.cardWrapper,
              {
                opacity: card1Opacity,
                transform: [{ scale: card1Scale }],
              },
            ]}
          >
            <ResultCard
              title="Cético"
              result={model1Result}
              isLoading={isProcessing && !isAnimating}
              icon={robo1}
            />
          </Animated.View>

          <Animated.View
            style={[
              styles.cardWrapper,
              {
                opacity: card2Opacity,
                transform: [{ scale: card2Scale }],
              },
            ]}
          >
            <ResultCard
              title="Paranoico"
              result={model2Result}
              isLoading={isProcessing && !isAnimating}
              icon={robo2}
            />
          </Animated.View>

          {/* Waveform Card - appears after classification */}
          {audioSamples.length > 0 && (model1Result || model2Result) && (
            <Animated.View
              style={[
                styles.cardWrapper,
                {
                  opacity: spectralCardOpacity,
                  transform: [{ scale: spectralCardScale }],
                },
              ]}
            >
              <WaveformCard audioData={audioSamples} fileName={audioFileName} />
            </Animated.View>
          )}
        </View>

        {/* Select Audio Button */}
        {!isAnimating && (
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
        )}

        {/* Footer */}
        {!isAnimating && (
          <View style={styles.footer}>
            <Text style={styles.footerBrand}>Sanesoluti</Text>
          </View>
        )}
      </ScrollView>

      {/* Animation Overlay - covers everything */}
      {isAnimating && (
        <Animated.View
          style={[
            styles.animationOverlay,
            { opacity: overlayOpacity },
          ]}
          pointerEvents="none"
        />
      )}

      {/* Animated Logo - above everything */}
      {isAnimating && (
        <Animated.View
          style={[
            styles.animatedLogoContainer,
            {
              transform: [
                { translateY: logoTranslateY },
                { scale: logoScale },
              ],
            },
          ]}
          pointerEvents="none"
        >
          <Animated.Image
            source={logoAI}
            style={styles.animatedLogo}
            resizeMode="contain"
          />
        </Animated.View>
      )}

      {/* Full screen video animation */}
      {showVideo && (
        <View style={styles.videoContainer}>
          <Video
            ref={videoRef}
            source={waveProgressVideo}
            style={styles.fullScreenVideo}
            resizeMode={ResizeMode.COVER}
            shouldPlay
            isLooping={false}
            onPlaybackStatusUpdate={handleVideoPlaybackStatus}
          />
        </View>
      )}
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
    justifyContent: 'center',
    marginBottom: 24,
    height: 150,
  },
  logo: {
    width: 120,
    height: 120,
  },
  animationOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    zIndex: 50,
  },
  animatedLogoContainer: {
    position: 'absolute',
    top: 91,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 300, // Above video (zIndex: 200)
  },
  animatedLogo: {
    width: 120,
    height: 120,
  },
  videoContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
  },
  fullScreenVideo: {
    flex: 1,
    width: '100%',
    height: '100%',
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
  waterDropWrapper: {
    alignItems: 'center',
    marginBottom: 24,
  },
  cardsContainer: {
    position: 'relative',
  },
  cardWrapper: {
    marginBottom: 0,
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
});
