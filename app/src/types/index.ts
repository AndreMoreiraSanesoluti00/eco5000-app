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

// Sliding window classification types
export interface WindowResult {
  windowIndex: number;
  startMs: number;
  endMs: number;
  model1Result: InferenceResult;
  model2Result: InferenceResult;
}

export interface SlidingWindowConfig {
  windowDurationMs: number;    // Duration of each analysis window (500ms)
  stepDurationMs: number;      // Step between windows (250ms = 50% overlap)
  sampleRate: number;          // Audio sample rate (48000 Hz)
}

export interface AggregatedResult {
  // Individual model averages
  model1Average: {
    leakConfidence: number;
    noLeakConfidence: number;
    dominantLabel: string;
    windowCount: number;
  };
  model2Average: {
    leakConfidence: number;
    noLeakConfidence: number;
    dominantLabel: string;
    windowCount: number;
  };
  // Combined average between both models
  combinedAverage: {
    leakConfidence: number;
    noLeakConfidence: number;
    finalLabel: string;
  };
  // All window results for detailed analysis
  windowResults: WindowResult[];
  // Processing metadata
  totalWindowsProcessed: number;
  processingTimeMs: number;
}
