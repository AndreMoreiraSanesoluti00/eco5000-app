import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { RecordingStatus } from '../types';

interface RecordButtonProps {
  status: RecordingStatus;
  onPress: () => void;
  disabled?: boolean;
}

export function RecordButton({ status, onPress, disabled }: RecordButtonProps) {
  const getButtonStyle = () => {
    switch (status) {
      case 'recording':
        return styles.buttonRecording;
      case 'processing':
        return styles.buttonProcessing;
      default:
        return disabled ? styles.buttonDisabled : styles.buttonDefault;
    }
  };

  const getButtonText = () => {
    switch (status) {
      case 'recording':
        return 'Gravando...';
      case 'processing':
        return 'Processando...';
      default:
        return 'Iniciar Analise';
    }
  };

  const isDisabled = disabled || status === 'processing';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[styles.button, getButtonStyle()]}
    >
      <View style={styles.buttonContent}>
        {status === 'recording' && <View style={styles.recordingIndicator} />}
        <Text style={styles.buttonText}>{getButtonText()}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDefault: {
    backgroundColor: '#F28322',
  },
  buttonRecording: {
    backgroundColor: '#F27127',
  },
  buttonProcessing: {
    backgroundColor: '#F28322',
  },
  buttonDisabled: {
    backgroundColor: '#027368',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingIndicator: {
    width: 12,
    height: 12,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    marginRight: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
