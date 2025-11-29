import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

interface WaveformCardProps {
  audioData: number[];
  fileName: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 64;
const CHART_HEIGHT = 120;
const NUM_POINTS = 150;

export function WaveformCard({ audioData, fileName }: WaveformCardProps) {
  // First, find the max amplitude for normalization
  const maxAmplitude = useMemo(() => {
    if (!audioData || audioData.length === 0) return 0;
    let max = 0;
    for (let i = 0; i < audioData.length; i++) {
      const absValue = Math.abs(audioData[i]);
      if (absValue > max) max = absValue;
    }
    return max;
  }, [audioData]);

  const waveformPoints = useMemo(() => {
    if (!audioData || audioData.length === 0 || maxAmplitude === 0) {
      return [];
    }

    const points: { x: number; yTop: number; yBottom: number }[] = [];
    const chartAreaWidth = CHART_WIDTH - 20;

    // Adjust number of points based on audio length
    const numPoints = Math.min(NUM_POINTS, audioData.length);
    const samplesPerPoint = Math.max(1, Math.floor(audioData.length / numPoints));

    // Normalization factor - ensure we scale to fit the chart
    const normFactor = maxAmplitude > 0 ? maxAmplitude : 1;

    for (let i = 0; i < numPoints; i++) {
      const start = i * samplesPerPoint;
      const end = Math.min(start + samplesPerPoint, audioData.length);

      let min = 0;
      let max = 0;

      for (let j = start; j < end; j++) {
        const sample = audioData[j];
        if (sample < min) min = sample;
        if (sample > max) max = sample;
      }

      // Normalize values to -1 to 1 range
      const normalizedMin = min / normFactor;
      const normalizedMax = max / normFactor;

      const x = (i / numPoints) * chartAreaWidth;
      const centerY = CHART_HEIGHT / 2;

      // Scale to use 90% of chart height for better visibility
      const scaleFactor = 0.9;
      const yTop = centerY - (normalizedMax * centerY * scaleFactor);
      const yBottom = centerY - (normalizedMin * centerY * scaleFactor);

      points.push({ x, yTop, yBottom });
    }

    return points;
  }, [audioData, maxAmplitude]);

  return (
    <View style={styles.container}>
      <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="middle">
        {fileName}
      </Text>

      <View style={styles.chartContainer}>
        <View style={styles.chartArea}>
          {/* Center line */}
          <View style={styles.centerLine} />

          {/* Waveform */}
          <View style={styles.waveformContainer}>
            {waveformPoints.map((point, index) => {
              const height = Math.max(2, Math.abs(point.yBottom - point.yTop));
              const top = Math.min(point.yTop, point.yBottom);
              // Color based on relative amplitude
              const relativeHeight = height / CHART_HEIGHT;

              return (
                <View
                  key={index}
                  style={[
                    styles.waveformBar,
                    {
                      left: point.x,
                      top: top,
                      height: height,
                      backgroundColor: getWaveColor(relativeHeight),
                    },
                  ]}
                />
              );
            })}
          </View>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Amostras</Text>
          <Text style={styles.statValue}>{audioData.length.toLocaleString()}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Amplitude Máx</Text>
          <Text style={styles.statValue}>{maxAmplitude.toFixed(3)}</Text>
        </View>
      </View>
    </View>
  );
}

function getWaveColor(normalizedHeight: number): string {
  if (normalizedHeight >= 0.6) return '#F27127';
  if (normalizedHeight >= 0.3) return '#F28322';
  return '#03A696';
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  fileName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#027368',
    marginBottom: 12,
    textAlign: 'center',
  },
  chartContainer: {
    height: CHART_HEIGHT,
  },
  chartArea: {
    flex: 1,
    height: CHART_HEIGHT,
    position: 'relative',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    overflow: 'hidden',
  },
  centerLine: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: CHART_HEIGHT / 2,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  waveformContainer: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: 0,
    bottom: 0,
  },
  waveformBar: {
    position: 'absolute',
    width: 2,
    borderRadius: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#03A696',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#027368',
  },
});
