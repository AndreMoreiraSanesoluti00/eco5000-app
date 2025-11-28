import React from 'react';
import { View, Text, StyleSheet, Image, ImageSourcePropType } from 'react-native';
import { InferenceResult } from '../types';

interface ResultCardProps {
  title: string;
  result: InferenceResult | null;
  isLoading?: boolean;
  icon?: ImageSourcePropType;
}

export function ResultCard({ title, result, isLoading, icon }: ResultCardProps) {
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return '#03A696';
    if (confidence >= 0.5) return '#F28322';
    return '#F27127';
  };

  return (
    <View style={styles.container}>
      {/* Header with title and icon */}
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {icon && (
          <Image source={icon} style={styles.icon} resizeMode="contain" />
        )}
      </View>

      {isLoading ? (
        <View style={styles.centerContent}>
          <View style={styles.spinner} />
          <Text style={styles.processingText}>Processando...</Text>
        </View>
      ) : result ? (
        <View style={styles.resultContent}>
          <View style={styles.resultRow}>
            <Text style={styles.label}>{result.label}</Text>
            <Text style={[styles.confidence, { color: getConfidenceColor(result.confidence) }]}>
              {(result.confidence * 100).toFixed(1)}%
            </Text>
          </View>

          <View style={styles.progressBackground}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${result.confidence * 100}%`,
                  backgroundColor: getConfidenceColor(result.confidence),
                },
              ]}
            />
          </View>

          <View style={styles.timingRow}>
            <View style={styles.timingItem}>
              <Text style={styles.timingLabel}>DSP</Text>
              <Text style={styles.timingValue}>{result.timing.dsp.toFixed(0)}ms</Text>
            </View>
            <View style={styles.timingItem}>
              <Text style={styles.timingLabel}>Classificacao</Text>
              <Text style={styles.timingValue}>{result.timing.classification.toFixed(0)}ms</Text>
            </View>
            <View style={styles.timingItem}>
              <Text style={styles.timingLabel}>Total</Text>
              <Text style={styles.timingValue}>
                {(result.timing.dsp + result.timing.classification).toFixed(0)}ms
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.centerContent}>
          <Text style={styles.waitingText}>Aguardando áudio</Text>
        </View>
      )}
    </View>
  );
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
    minHeight: 140,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#027368',
  },
  icon: {
    width: 50,
    height: 50,
  },
  centerContent: {
    alignItems: 'center',
    paddingVertical: 16,
    flex: 1,
    justifyContent: 'center',
  },
  spinner: {
    width: 32,
    height: 32,
    borderWidth: 4,
    borderColor: '#03A696',
    borderTopColor: 'transparent',
    borderRadius: 16,
  },
  processingText: {
    color: '#027368',
    marginTop: 8,
  },
  resultContent: {
    flex: 1,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#027368',
  },
  confidence: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  progressBackground: {
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
    height: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: 12,
    borderRadius: 6,
  },
  timingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timingItem: {
    alignItems: 'center',
  },
  timingLabel: {
    fontSize: 12,
    color: '#03A696',
  },
  timingValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#027368',
  },
  waitingText: {
    color: '#03A696',
  },
});
