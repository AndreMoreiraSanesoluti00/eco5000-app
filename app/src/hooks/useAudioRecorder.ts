import { useState, useCallback, useRef } from 'react';
import { Audio } from 'expo-av';
import { RecordingStatus } from '../types';

const SAMPLE_RATE = 48000;
const RECORDING_DURATION_MS = 5000; // 5 seconds = 240000 samples at 48kHz

interface UseAudioRecorderResult {
  status: RecordingStatus;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<number[] | null>;
  getAudioData: () => number[] | null;
}

export function useAudioRecorder(): UseAudioRecorderResult {
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const audioDataRef = useRef<number[] | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setStatus('recording');

      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Permissão de microfone negada');
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync({
        android: {
          extension: '.wav',
          outputFormat: Audio.AndroidOutputFormat.DEFAULT,
          audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
          sampleRate: SAMPLE_RATE,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: SAMPLE_RATE,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/wav',
          bitsPerSecond: 128000,
        },
      });

      recordingRef.current = recording;

      // Auto-stop after duration
      setTimeout(async () => {
        if (recordingRef.current) {
          await stopRecording();
        }
      }, RECORDING_DURATION_MS);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao iniciar gravação');
      setStatus('error');
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<number[] | null> => {
    try {
      if (!recordingRef.current) {
        return null;
      }

      setStatus('processing');

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) {
        throw new Error('URI de gravação não disponível');
      }

      // For now, we'll return a placeholder. The actual audio processing
      // will be done in the native module. This returns the URI for reference.
      // In a real implementation, you'd process the audio file here or in native code.

      // Placeholder: Generate sample data for testing
      // In production, this should read the actual WAV file
      const sampleCount = SAMPLE_RATE * (RECORDING_DURATION_MS / 1000);
      const audioData = new Array(sampleCount).fill(0);
      audioDataRef.current = audioData;

      setStatus('idle');
      return audioData;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao parar gravação');
      setStatus('error');
      return null;
    }
  }, []);

  const getAudioData = useCallback((): number[] | null => {
    return audioDataRef.current;
  }, []);

  return {
    status,
    error,
    startRecording,
    stopRecording,
    getAudioData,
  };
}
