import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StatusIndicatorProps {
  isConnected: boolean;
  modelName: string;
}

export function StatusIndicator({ isConnected, modelName }: StatusIndicatorProps) {
  return (
    <View style={styles.container}>
      <View
        style={[
          styles.indicator,
          isConnected ? styles.indicatorConnected : styles.indicatorDisconnected,
        ]}
      />
      <Text style={styles.modelName}>{modelName}</Text>
      <Text
        style={[
          styles.statusText,
          isConnected ? styles.statusConnected : styles.statusDisconnected,
        ]}
      >
        {isConnected ? 'Pronto' : 'Offline'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  indicatorConnected: {
    backgroundColor: '#03A696',
  },
  indicatorDisconnected: {
    backgroundColor: '#F27127',
  },
  modelName: {
    fontSize: 14,
    color: '#027368',
  },
  statusText: {
    fontSize: 14,
    marginLeft: 4,
  },
  statusConnected: {
    color: '#03A696',
  },
  statusDisconnected: {
    color: '#F27127',
  },
});
