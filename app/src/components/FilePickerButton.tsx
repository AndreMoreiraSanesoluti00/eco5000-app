import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';

interface FilePickerButtonProps {
  onPress: () => void;
  disabled?: boolean;
  isProcessing?: boolean;
  selectedFileName?: string | null;
}

export function FilePickerButton({
  onPress,
  disabled,
  isProcessing,
  selectedFileName
}: FilePickerButtonProps) {
  const getButtonStyle = () => {
    if (isProcessing) {
      return styles.buttonProcessing;
    }
    if (disabled) {
      return styles.buttonDisabled;
    }
    if (selectedFileName) {
      return styles.buttonSelected;
    }
    return styles.buttonDefault;
  };

  const getButtonText = () => {
    if (isProcessing) {
      return 'Processando...';
    }
    if (selectedFileName) {
      return selectedFileName;
    }
    return 'Selecionar Arquivo WAV';
  };

  const isDisabled = disabled || isProcessing;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[styles.button, getButtonStyle()]}
    >
      <View style={styles.buttonContent}>
        <View style={styles.iconContainer}>
          <Text style={styles.iconText}>📁</Text>
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.buttonText} numberOfLines={1}>
            {getButtonText()}
          </Text>
          {!isProcessing && !selectedFileName && (
            <Text style={styles.hintText}>
              Toque para escolher um arquivo .wav
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  buttonDefault: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  buttonSelected: {
    backgroundColor: '#dcfce7',
    borderColor: '#16a34a',
    borderStyle: 'solid',
  },
  buttonProcessing: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
    borderStyle: 'solid',
  },
  buttonDisabled: {
    backgroundColor: '#f3f4f6',
    borderColor: '#9ca3af',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: 12,
  },
  iconText: {
    fontSize: 28,
  },
  textContainer: {
    flex: 1,
  },
  buttonText: {
    color: '#1f2937',
    fontSize: 16,
    fontWeight: '600',
  },
  hintText: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 4,
  },
});
