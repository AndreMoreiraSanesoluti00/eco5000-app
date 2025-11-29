import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

interface WaveformCardProps {
  audioData: number[];
  fileName: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 64;
const CHART_HEIGHT = 120;
const NUM_POINTS = 200;

export function WaveformCard({ audioData, fileName }: WaveformCardProps) {
  const waveformPoints = useMemo(() => {
    if (!audioData || audioData.length === 0) {
      return [];
    }

    const points: { x: number; yTop: number; yBottom: number }[] = [];
    const samplesPerPoint = Math.floor(audioData.length / NUM_POINTS);
    const chartAreaWidth = CHART_WIDTH - 20;

    for (let i = 0; i < NUM_POINTS; i++) {
      const start = i * samplesPerPoint;
      const end = Math.min(start + samplesPerPoint, audioData.length);

      let min = Infinity;
      let max = -Infinity;

      for (let j = start; j < end; j++) {
        const sample = audioData[j];
        if (sample < min) min = sample;
        if (sample > max) max = sample;
      }

      if (min === Infinity) min = 0;
      if (max === -Infinity) max = 0;

      const x = (i / NUM_POINTS) * chartAreaWidth;
      const centerY = CHART_HEIGHT / 2;
      const yTop = centerY - (max * centerY);
      const yBottom = centerY - (min * centerY);

      points.push({ x, yTop, yBottom });
    }

    return points;
  }, [audioData]);

  const maxAmplitude = useMemo(() => {
    if (!audioData || audioData.length === 0) return 0;
    // Use reduce instead of spread to avoid stack overflow with large arrays
    let max = 0;
    for (let i = 0; i < audioData.length; i++) {
      const absValue = Math.abs(audioData[i]);
      if (absValue > max) max = absValue;
    }
    return max;
  }, [audioData]);

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
              const height = Math.max(2, point.yBottom - point.yTop);
              const top = point.yTop;

              return (
                <View
                  key={index}
                  style={[
                    styles.waveformBar,
                    {
                      left: point.x,
                      top: top,
                      height: height,
                      backgroundColor: getWaveColor(height / CHART_HEIGHT),
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
