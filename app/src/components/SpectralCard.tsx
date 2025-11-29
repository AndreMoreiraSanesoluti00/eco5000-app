import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

interface SpectralCardProps {
  audioData: number[];
  title?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 64; // padding
const CHART_HEIGHT = 120;
const NUM_BARS = 64; // Number of bars to display

export function SpectralCard({ audioData, title = 'Espectro do Áudio' }: SpectralCardProps) {
  // Calculate FFT magnitude spectrum
  const { spectralBars, maxMagnitude } = useMemo(() => {
    if (!audioData || audioData.length === 0) {
      return { spectralBars: [], maxMagnitude: 0 };
    }

    // Simple FFT approximation using DFT for visualization
    // Take a subset of samples for performance
    const maxSamples = 2048;
    const samples = audioData.slice(0, Math.min(audioData.length, maxSamples));
    const n = samples.length;

    // Calculate magnitude spectrum (only positive frequencies)
    const magnitudes: number[] = [];
    const numBins = Math.min(NUM_BARS * 2, Math.floor(n / 2)); // Calculate more bins then average

    for (let k = 0; k < numBins; k++) {
      let real = 0;
      let imag = 0;

      for (let t = 0; t < n; t++) {
        const angle = (2 * Math.PI * k * t) / n;
        real += samples[t] * Math.cos(angle);
        imag -= samples[t] * Math.sin(angle);
      }

      const magnitude = Math.sqrt(real * real + imag * imag) / n;
      magnitudes.push(magnitude);
    }

    // Reduce to NUM_BARS by averaging
    const bars: number[] = [];
    const binsPerBar = Math.ceil(magnitudes.length / NUM_BARS);

    for (let i = 0; i < NUM_BARS; i++) {
      const start = i * binsPerBar;
      const end = Math.min(start + binsPerBar, magnitudes.length);
      let sum = 0;
      for (let j = start; j < end; j++) {
        sum += magnitudes[j];
      }
      bars.push(sum / (end - start));
    }

    const maxMag = Math.max(...bars, 0.001);

    return { spectralBars: bars, maxMagnitude: maxMag };
  }, [audioData]);

  const barWidth = (CHART_WIDTH - 20) / NUM_BARS - 1; // -1 for gap

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      <View style={styles.chartContainer}>
        {/* Y-axis labels */}
        <View style={styles.yAxis}>
          <Text style={styles.axisLabel}>Alto</Text>
          <Text style={styles.axisLabel}>Baixo</Text>
        </View>

        {/* Chart area */}
        <View style={styles.chartArea}>
          {/* Grid lines */}
          <View style={[styles.gridLine, { top: 0 }]} />
          <View style={[styles.gridLine, { top: CHART_HEIGHT * 0.25 }]} />
          <View style={[styles.gridLine, { top: CHART_HEIGHT * 0.5 }]} />
          <View style={[styles.gridLine, { top: CHART_HEIGHT * 0.75 }]} />
          <View style={[styles.gridLine, { top: CHART_HEIGHT - 1 }]} />

          {/* Bars */}
          <View style={styles.barsContainer}>
            {spectralBars.map((magnitude, index) => {
              const normalizedHeight = (magnitude / maxMagnitude) * CHART_HEIGHT;
              const barHeight = Math.max(2, normalizedHeight); // Minimum 2px height

              return (
                <View
                  key={index}
                  style={[
                    styles.bar,
                    {
                      width: barWidth,
                      height: barHeight,
                      backgroundColor: getBarColor(magnitude / maxMagnitude),
                    },
                  ]}
                />
              );
            })}
          </View>
        </View>
      </View>

      {/* X-axis label */}
      <Text style={styles.xAxisLabel}>Frequência (baixa → alta)</Text>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Amostras</Text>
          <Text style={styles.statValue}>{audioData.length.toLocaleString()}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Bins FFT</Text>
          <Text style={styles.statValue}>{NUM_BARS}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Pico</Text>
          <Text style={styles.statValue}>{maxMagnitude.toFixed(4)}</Text>
        </View>
      </View>
    </View>
  );
}

// Get color based on magnitude (green to orange to red)
function getBarColor(normalizedMagnitude: number): string {
  if (normalizedMagnitude >= 0.8) return '#F27127'; // High - orange/red
  if (normalizedMagnitude >= 0.5) return '#F28322'; // Medium - orange
  return '#03A696'; // Low - green (theme color)
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
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#027368',
    marginBottom: 12,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: CHART_HEIGHT,
  },
  yAxis: {
    width: 30,
    height: CHART_HEIGHT,
    justifyContent: 'space-between',
    paddingRight: 4,
  },
  axisLabel: {
    fontSize: 8,
    color: '#666',
  },
  chartArea: {
    flex: 1,
    height: CHART_HEIGHT,
    position: 'relative',
    backgroundColor: '#f9fafb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: CHART_HEIGHT,
    paddingHorizontal: 2,
  },
  bar: {
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  xAxisLabel: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
