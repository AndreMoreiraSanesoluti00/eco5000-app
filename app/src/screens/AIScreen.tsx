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
  InteractionManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { Video, ResizeMode, AVPlaybackStatus, Audio } from 'expo-av';
import { ResultCard, WaveformCard, WaterDropIndicator } from '../components';
import { useEdgeImpulse } from '../hooks/useEdgeImpulse';
import { InferenceResult, AggregatedResult } from '../types';
import {
  parseAudioFile,
  isSupportedAudioFormat,
  getSupportedFormatsString,
  AUDIO_MIME_TYPES,
} from '../utils/audioParser';

const logoAI = require('../assets/logo_AI.png');
const waveProgressVideo = require('../assets/Wave Progress.mp4');
const animacaoRobosGif = require('../assets/animacao_robos.gif');
const robo1 = require('../assets/robo1.png');
const robo2 = require('../assets/robo2.png');

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export function AIScreen() {
  const [model1Result, setModel1Result] = useState<InferenceResult | null>(null);
  const [model2Result, setModel2Result] = useState<InferenceResult | null>(null);
  const [aggregatedResult, setAggregatedResult] = useState<AggregatedResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [audioSamples, setAudioSamples] = useState<number[]>([]);
  const [audioFileName, setAudioFileName] = useState<string>('');
  const [isComponentReady, setIsComponentReady] = useState(false);

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
  const logoOpacity = useRef(new Animated.Value(1)).current;
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

  // Flag to track if inference is complete (used to control animation end)
  const isInferenceComplete = useRef(false);

  // Flag to track if video has finished playing (reached the end)
  const isVideoFinished = useRef(false);

  // Flag to prevent multiple simultaneous document picker calls
  const isPickerOpen = useRef(false);

  const {
    isInitialized,
    isLoading: isModelLoading,
    error: modelError,
    initializeModels,
    runSlidingWindowInference,
  } = useEdgeImpulse();

  useEffect(() => {
    initializeModels();
  }, [initializeModels]);

  useEffect(() => {
    if (modelError) {
      Alert.alert('Erro do Modelo', modelError);
    }
  }, [modelError]);

  // Mark component as ready after a short delay to ensure Activity is attached
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsComponentReady(true);
      console.log('[AIScreen] Component is ready for file picker');
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Complete the animation and show results
  const completeAnimation = useCallback(() => {
    // Guard against multiple calls
    if (isCompletingAnimation.current) {
      console.log('[AIScreen] completeAnimation already in progress, skipping');
      return;
    }
    isCompletingAnimation.current = true;
    console.log('[AIScreen] Completing animation, removing logo and gif');

    // Hide video, logo and gif IMMEDIATELY - no delay
    setShowVideo(false);
    setIsAnimating(false);

    // Set the results immediately
    if (pendingResults.current) {
      setModel1Result(pendingResults.current.model1);
      setModel2Result(pendingResults.current.model2);
      pendingResults.current = null;
    }

    // Reset logo position for next animation
    logoTranslateY.setValue(0);
    logoScale.setValue(1);
    logoOpacity.setValue(1);
    overlayOpacity.setValue(0);

    // Animate cards appearing with stagger
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
    ]).start();
  }, [logoTranslateY, logoScale, logoOpacity, overlayOpacity, waterDropOpacity, waterDropScale, card1Opacity, card1Scale, card2Opacity, card2Scale, spectralCardOpacity, spectralCardScale]);

  // Handle video playback status - video plays once and stays at end
  const handleVideoPlaybackStatus = useCallback((status: AVPlaybackStatus) => {
    // Only handle loaded status
    if (!status.isLoaded) {
      return;
    }

    // Check if video finished (reached the end)
    if (status.didJustFinish) {
      console.log('[AIScreen] Video finished, staying at end frame');
      // Mark video as finished
      isVideoFinished.current = true;
      // Video stays at end frame - don't restart
      // The GIF of robots keeps animating automatically (GIFs loop by default)

      // If inference is already complete, finish the animation now
      if (isInferenceComplete.current) {
        console.log('[AIScreen] Inference already complete, completing animation');
        completeAnimation();
      }
      // Otherwise, we wait - the video stays at end, GIF keeps animating
      // runAnalysisAnimation will call completeAnimation when inference finishes
    }
  }, [completeAnimation]);

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
    // Reset inference completion flag - will be set to true when inference finishes
    isInferenceComplete.current = false;
    // Reset video finished flag
    isVideoFinished.current = false;

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
  const runAnalysisAnimation = useCallback(async (aggregated: AggregatedResult) => {
    console.log('[AIScreen] runAnalysisAnimation called, storing aggregated results');

    // Convert aggregated results to InferenceResult format for display
    // Model 1 result from aggregated average
    const model1FromAggregated: InferenceResult = {
      label: aggregated.model1Average.dominantLabel,
      confidence: aggregated.model1Average.dominantLabel === 'Leak'
        ? aggregated.model1Average.leakConfidence
        : aggregated.model1Average.noLeakConfidence,
      timing: {
        dsp: 0,
        classification: aggregated.processingTimeMs / 2,
        anomaly: 0,
      },
    };

    // Model 2 result from aggregated average
    const model2FromAggregated: InferenceResult = {
      label: aggregated.model2Average.dominantLabel,
      confidence: aggregated.model2Average.dominantLabel === 'Leak'
        ? aggregated.model2Average.leakConfidence
        : aggregated.model2Average.noLeakConfidence,
      timing: {
        dsp: 0,
        classification: aggregated.processingTimeMs / 2,
        anomaly: 0,
      },
    };

    pendingResults.current = { model1: model1FromAggregated, model2: model2FromAggregated };
    // Mark inference as complete
    isInferenceComplete.current = true;
    console.log('[AIScreen] Inference complete');

    // If video has already finished, complete the animation now
    // Otherwise, handleVideoPlaybackStatus will complete it when video ends
    if (isVideoFinished.current) {
      console.log('[AIScreen] Video already finished, completing animation now');
      completeAnimation();
    } else {
      console.log('[AIScreen] Waiting for video to finish...');
    }
  }, [completeAnimation]);

  const handleSelectAudio = useCallback(async () => {
    try {
      // Prevent multiple simultaneous calls
      if (isPickerOpen.current) {
        console.log('[AIScreen] Picker already open, ignoring additional click');
        return;
      }

      // Check if component is ready
      if (!isComponentReady) {
        console.log('[AIScreen] Component not ready yet, waiting...');
        Alert.alert(
          'Aguarde',
          'O aplicativo ainda está inicializando. Tente novamente em alguns segundos.'
        );
        return;
      }

      // Mark picker as open
      isPickerOpen.current = true;
      console.log('[AIScreen] Abrindo seletor de arquivos...');

      // Wait for all interactions to complete before opening the picker
      // This ensures the Activity is fully ready
      await new Promise<void>((resolve) => {
        InteractionManager.runAfterInteractions(() => {
          resolve();
        });
      });

      // Add a small delay to ensure Activity is attached
      await new Promise(resolve => setTimeout(resolve, 100));

      const result = await DocumentPicker.getDocumentAsync({
        type: AUDIO_MIME_TYPES,
        copyToCacheDirectory: true,
      });

      // Mark picker as closed
      isPickerOpen.current = false;

      console.log('[AIScreen] Resultado do picker:', JSON.stringify(result));

      if (result.canceled) {
        console.log('[AIScreen] Seleção cancelada pelo usuário');
        isPickerOpen.current = false;
        return;
      }

      const file = result.assets[0];
      console.log('[AIScreen] Arquivo selecionado:', file.name, 'URI:', file.uri);

      if (!isSupportedAudioFormat(file.name)) {
        Alert.alert(
          'Formato Invalido',
          `Por favor, selecione um arquivo de áudio suportado.\n\nFormatos aceitos: ${getSupportedFormatsString()}`
        );
        isPickerOpen.current = false;
        return;
      }

      setModel1Result(null);
      setModel2Result(null);
      setAggregatedResult(null);
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

        // Run sliding window inference (500ms windows every 2.5s)
        const aggregated = await runSlidingWindowInference(audioData);

        // Store aggregated result for potential future use
        setAggregatedResult(aggregated);

        setIsProcessing(false);
        runAnalysisAnimation(aggregated);
      } catch (err) {
        console.log('[AIScreen] Erro durante processamento:', err);

        // Stop all animations immediately
        logoTranslateY.stopAnimation();
        logoScale.stopAnimation();
        logoOpacity.stopAnimation();
        overlayOpacity.stopAnimation();

        // Reset all state
        setIsProcessing(false);
        setIsAnimating(false);
        setShowVideo(false);
        setAudioSamples([]);
        setAudioFileName('');

        // Reset animation guards
        isCompletingAnimation.current = false;
        isInferenceComplete.current = false;
        isVideoFinished.current = false;

        // Reset all animation values to initial state
        logoTranslateY.setValue(0);
        logoScale.setValue(1);
        logoOpacity.setValue(1);
        overlayOpacity.setValue(0);
        card1Opacity.setValue(1);
        card1Scale.setValue(1);
        card2Opacity.setValue(1);
        card2Scale.setValue(1);
        spectralCardOpacity.setValue(0);
        spectralCardScale.setValue(0.8);
        waterDropOpacity.setValue(0);
        waterDropScale.setValue(0.8);

        // Show error message
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao processar o arquivo';
        Alert.alert(
          'Erro de Processamento',
          errorMessage.includes('Áudio muito curto')
            ? 'O áudio selecionado é muito curto. Por favor, selecione um áudio com pelo menos 500ms de duração.'
            : errorMessage
        );
      }
    } catch (err) {
      console.error('[AIScreen] Erro ao abrir seletor:', err);

      // Reset picker state on error
      isPickerOpen.current = false;

      const errorMessage = err instanceof Error ? err.message : 'Erro ao selecionar arquivo';

      // Check if it's the "not attached to Activity" error or "Different document picking in progress"
      if (errorMessage.includes('not attached to an Activity')) {
        Alert.alert(
          'Erro',
          'Por favor, tente novamente em alguns segundos. O aplicativo ainda está inicializando.'
        );
      } else if (errorMessage.includes('Different document picking in progress')) {
        console.log('[AIScreen] Seletor já está aberto, ignorando');
        // Don't show alert for this case - it's expected when user double-clicks
      } else {
        Alert.alert('Erro', errorMessage);
      }
    }
  }, [isComponentReady, isInitialized, runSlidingWindowInference, runAnalysisAnimation, startProcessingAnimation, logoTranslateY, logoScale, logoOpacity, overlayOpacity, card1Opacity, card1Scale, card2Opacity, card2Scale, spectralCardOpacity, spectralCardScale, waterDropOpacity, waterDropScale]);

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

      {/* Animated Logo and Robots Video - above everything */}
      {isAnimating && (
        <Animated.View
          style={[
            styles.animatedLogoContainer,
            {
              opacity: logoOpacity,
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
          {/* Robots animation GIF below logo */}
          <Animated.Image
            source={animacaoRobosGif}
            style={styles.robosGif}
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
  robosGif: {
    width: 200,
    height: 150,
    marginTop: 20,
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
