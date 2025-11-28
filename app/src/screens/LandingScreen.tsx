import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

const { width, height } = Dimensions.get('window');

type RootStackParamList = {
  Landing: undefined;
  AI: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Landing'>;

export function LandingScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [isFlipping, setIsFlipping] = useState(false);

  // Animação de flutuação (cima/baixo)
  const floatAnim = useRef(new Animated.Value(0)).current;

  // Animação da sombra
  const shadowAnim = useRef(new Animated.Value(1)).current;

  // Animação de flip (rotação Y)
  const flipAnim = useRef(new Animated.Value(0)).current;

  // Animação de zoom da tela
  const zoomAnim = useRef(new Animated.Value(1)).current;

  // Animação de opacidade do overlay azul
  const blueOverlayAnim = useRef(new Animated.Value(0)).current;

  // Animação contínua de flutuação
  useEffect(() => {
    const floatAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const shadowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shadowAnim, {
          toValue: 0.6,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(shadowAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    floatAnimation.start();
    shadowAnimation.start();

    return () => {
      floatAnimation.stop();
      shadowAnimation.stop();
    };
  }, [floatAnim, shadowAnim]);

  const handleLogoPress = () => {
    if (isFlipping) return;
    setIsFlipping(true);

    // Sequência de animações: flip + zoom + overlay azul
    Animated.parallel([
      // Flip animation (0 -> 1 = frente para trás)
      Animated.timing(flipAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      // Zoom animation com delay
      Animated.sequence([
        Animated.delay(300),
        Animated.timing(zoomAnim, {
          toValue: 15,
          duration: 800,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
      // Blue overlay fade in
      Animated.sequence([
        Animated.delay(400),
        Animated.timing(blueOverlayAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      navigation.replace('AI');
    });
  };

  // Interpolações
  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });

  const shadowScale = shadowAnim.interpolate({
    inputRange: [0.6, 1],
    outputRange: [0.7, 1],
  });

  const shadowOpacity = shadowAnim.interpolate({
    inputRange: [0.6, 1],
    outputRange: [0.15, 0.3],
  });

  // Rotação Y para efeito de flip
  const rotateY = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '90deg', '180deg'],
  });

  // Mostrar frente ou verso baseado na rotação
  const frontOpacity = flipAnim.interpolate({
    inputRange: [0, 0.5, 0.5, 1],
    outputRange: [1, 1, 0, 0],
  });

  const backOpacity = flipAnim.interpolate({
    inputRange: [0, 0.5, 0.5, 1],
    outputRange: [0, 0, 1, 1],
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Logo SaneSoluti no topo */}
      <View style={styles.topLogoContainer}>
        <Image
          source={require('../assets/sanesoluti_logo.png')}
          style={styles.topLogo}
          resizeMode="contain"
        />
      </View>

      {/* Container central com logo AI e sombra */}
      <View style={styles.centerContainer}>
        {/* Sombra animada */}
        <Animated.View
          style={[
            styles.shadow,
            {
              transform: [{ scaleX: shadowScale }, { scaleY: shadowScale }],
              opacity: shadowOpacity,
            },
          ]}
        />

        {/* Logo AI com animações */}
        <TouchableOpacity
          onPress={handleLogoPress}
          activeOpacity={0.9}
          disabled={isFlipping}
        >
          <Animated.View
            style={[
              styles.logoAIContainer,
              {
                transform: [
                  { translateY },
                  { perspective: 1000 },
                  { rotateY },
                  { scale: zoomAnim },
                ],
              },
            ]}
          >
            {/* Logo frente */}
            <Animated.Image
              source={require('../assets/logo_AI.png')}
              style={[
                styles.logoAI,
                {
                  opacity: frontOpacity,
                  position: 'absolute',
                },
              ]}
              resizeMode="contain"
            />
            {/* Logo verso (invertido horizontalmente para compensar o flip) */}
            <Animated.Image
              source={require('../assets/logo_AI_back.png')}
              style={[
                styles.logoAI,
                {
                  opacity: backOpacity,
                  transform: [{ scaleX: -1 }],
                },
              ]}
              resizeMode="contain"
            />
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* Overlay azul para transição */}
      <Animated.View
        style={[
          styles.blueOverlay,
          {
            opacity: blueOverlayAnim,
          },
        ]}
        pointerEvents="none"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F2',
  },
  topLogoContainer: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 20,
  },
  topLogo: {
    width: 180,
    height: 80,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shadow: {
    position: 'absolute',
    bottom: '32%',
    width: 100,
    height: 25,
    backgroundColor: '#000',
    borderRadius: 50,
  },
  logoAIContainer: {
    width: 180,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoAI: {
    width: 180,
    height: 180,
  },
  blueOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#03A696',
  },
});
