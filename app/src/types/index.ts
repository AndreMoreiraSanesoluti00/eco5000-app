export interface InferenceResult {
  label: string;
  confidence: number;
  timing: {
    dsp: number;
    classification: number;
    anomaly: number;
  };
}

export interface ModelInfo {
  id: string;
  name: string;
  projectId: number;
  labels: string[];
  frequency: number;
  threshold: number;
}

export interface ClassificationResult {
  model1: InferenceResult | null;
  model2: InferenceResult | null;
  timestamp: number;
  isRecording: boolean;
}

export type RecordingStatus = 'idle' | 'recording' | 'processing' | 'error';
