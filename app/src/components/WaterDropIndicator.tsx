import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import Svg, { Path, Defs, ClipPath, Rect, G } from 'react-native-svg';

interface WaterDropIndicatorProps {
  percentage: number; // 0-100 (0 = No_leak, 100 = Leak)
  label?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DROP_WIDTH = SCREEN_WIDTH * 0.45;
const DROP_HEIGHT = DROP_WIDTH * 1.5;

// Create animated component for SVG Rect
const AnimatedRect = Animated.createAnimatedComponent(Rect);

export function WaterDropIndicator({ percentage, label = 'Probabilidade de Vazamento' }: WaterDropIndicatorProps) {
  const fillAnimation = useRef(new Animated.Value(0)).current;
  const [fillValue, setFillValue] = useState(0);

  // Animate fill level when percentage changes
  useEffect(() => {
    fillAnimation.setValue(0);

    const listener = fillAnimation.addListener(({ value }) => {
      setFillValue(value);
    });

    Animated.timing(fillAnimation, {
      toValue: percentage / 100,
      duration: 2000,
      useNativeDriver: false,
    }).start();

    return () => {
      fillAnimation.removeListener(listener);
    };
  }, [percentage, fillAnimation]);

  // Get color based on percentage
  const getPercentageColor = () => {
    if (percentage >= 70) return '#F27127';
    if (percentage >= 40) return '#F28322';
    return '#03A696';
  };

  // Get label based on percentage
  const getConfidenceLabel = () => {
    if (percentage >= 70) return 'Alta Probabilidade de Vazamento';
    if (percentage >= 40) return 'Média Probabilidade';
    return 'Baixa Probabilidade';
  };

  // SVG viewBox dimensions
  const viewBoxWidth = 100;
  const viewBoxHeight = 140;

  // Calculate fill Y position (from bottom) - higher fillValue means more water (lower Y)
  const fillY = viewBoxHeight - (fillValue * viewBoxHeight);

  // Water drop path - a proper teardrop shape
  const dropPath = `
    M50 5
    C50 5, 10 55, 10 85
    C10 115, 25 135, 50 135
    C75 135, 90 115, 90 85
    C90 55, 50 5, 50 5
    Z
  `;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.dropContainer}>
        <Svg
          width={DROP_WIDTH}
          height={DROP_HEIGHT}
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        >
          <Defs>
            {/* Define clip path with drop shape */}
            <ClipPath id="dropClip">
              <Path d={dropPath} />
            </ClipPath>
          </Defs>

          {/* Background drop shape (light teal fill with border) */}
          <Path
            d={dropPath}
            fill="rgba(2, 115, 104, 0.12)"
            stroke="#027368"
            strokeWidth="2.5"
          />

          {/* Water fill - clipped to drop shape */}
          <G clipPath="url(#dropClip)">
            {/* Blue water rectangle that rises from bottom */}
            <Rect
              x="0"
              y={fillY}
              width={viewBoxWidth}
              height={viewBoxHeight}
              fill="#0A84FF"
            />

            {/* Wave effect at top of water - simple curved line simulation */}
            <Path
              d={`
                M0 ${fillY}
                Q25 ${fillY - 4}, 50 ${fillY}
                Q75 ${fillY + 4}, 100 ${fillY}
                L100 ${viewBoxHeight}
                L0 ${viewBoxHeight}
                Z
              `}
              fill="#0A84FF"
            />

            {/* Highlight/shine on water */}
            <Path
              d={`
                M20 ${fillY + 3}
                Q35 ${fillY - 2}, 50 ${fillY + 3}
              `}
              stroke="rgba(255, 255, 255, 0.5)"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
          </G>

          {/* Shine/highlight on drop */}
          <Path
            d="M30 25 Q35 35, 32 50"
            stroke="rgba(255, 255, 255, 0.6)"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
        </Svg>
      </View>

      {/* Percentage display */}
      <View style={styles.percentageContainer}>
        <Text style={[styles.percentageText, { color: getPercentageColor() }]}>
          {percentage.toFixed(1)}%
        </Text>
        <Text style={styles.confidenceLabel}>
          {getConfidenceLabel()}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#027368',
    marginBottom: 16,
  },
  dropContainer: {
    width: DROP_WIDTH,
    height: DROP_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentageContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  percentageText: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  confidenceLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});
