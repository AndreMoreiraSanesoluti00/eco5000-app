import { NativeModulesProxy } from 'expo-modules-core';

export interface EdgeImpulseResult {
  label: string;
  confidence: number;
  timing: {
    dsp: number;
    classification: number;
    anomaly: number;
  };
}

export interface EdgeImpulseModelInfo {
  name: string;
  projectId: number;
  labels: string[];
  frequency: number;
  threshold: number;
}

const EdgeImpulseNative = NativeModulesProxy.EdgeImpulseNative as {
  initModel1(): Promise<boolean>;
  runInferenceModel1(audioData: Float32Array): Promise<EdgeImpulseResult>;
  getModel1Info(): Promise<EdgeImpulseModelInfo>;
  isModel1Initialized(): Promise<boolean>;

  initModel2(): Promise<boolean>;
  runInferenceModel2(audioData: Float32Array): Promise<EdgeImpulseResult>;
  getModel2Info(): Promise<EdgeImpulseModelInfo>;
  isModel2Initialized(): Promise<boolean>;
};

export default EdgeImpulseNative;
