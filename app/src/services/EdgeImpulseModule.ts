import { NativeModules, Platform } from 'react-native';
import Constants from 'expo-constants';
import { InferenceResult, ModelInfo } from '../types';

// Safely check for native module
const EdgeImpulseModule = NativeModules?.EdgeImpulseModule;

// Check if we're running in Expo Go (native module won't be available)
// Use multiple checks to be safe
const isExpoGo = (() => {
  // Check Constants first
  if (Constants.executionEnvironment === 'storeClient') return true;
  if (Constants.appOwnership === 'expo') return true;

  // Check if native module exists and has the expected methods
  if (!EdgeImpulseModule) return true;
  if (typeof EdgeImpulseModule.initializeModel1 !== 'function') return true;

  return false;
})();

console.log('[EdgeImpulse] Mode:', isExpoGo ? 'Expo Go (Mock)' : 'Native');

export interface EdgeImpulseInterface {
  initializeModel1(): Promise<boolean>;
  initializeModel2(): Promise<boolean>;
  runInferenceModel1(audioData: number[]): Promise<InferenceResult>;
  runInferenceModel2(audioData: number[]): Promise<InferenceResult>;
  getModel1Info(): Promise<ModelInfo>;
  getModel2Info(): Promise<ModelInfo>;
  isModel1Initialized(): Promise<boolean>;
  isModel2Initialized(): Promise<boolean>;
}

// Mock data for Expo Go testing
const mockModel1Info: ModelInfo = {
  id: 'model1',
  name: 'Sane.AI.Final.separafo',
  projectId: 839509,
  labels: ['Leak', 'No_leak'],
  frequency: 48000,
  threshold: 0.7,
};

const mockModel2Info: ModelInfo = {
  id: 'model2',
  name: 'Sane.AI.Final',
  projectId: 839504,
  labels: ['Leak', 'No_leak'],
  frequency: 48000,
  threshold: 0.9,
};

function createMockInferenceResult(): InferenceResult {
  const isLeak = Math.random() > 0.5;
  const confidence = 0.7 + Math.random() * 0.25;
  return {
    label: isLeak ? 'Leak' : 'No_leak',
    confidence: confidence,
    timing: {
      dsp: Math.floor(Math.random() * 20) + 10,
      classification: Math.floor(Math.random() * 10) + 5,
      anomaly: 0,
    },
  };
}

class EdgeImpulseService implements EdgeImpulseInterface {
  private _model1Initialized: boolean = false;
  private _model2Initialized: boolean = false;

  constructor() {
    if (isExpoGo) {
      console.warn(
        '[EdgeImpulse] Running in Expo Go - using mock data. ' +
        'Build a development build to use real inference.'
      );
    }
  }

  async initializeModel1(): Promise<boolean> {
    if (isExpoGo) {
      await new Promise(resolve => setTimeout(resolve, 500));
      this._model1Initialized = true;
      return true;
    }

    try {
      const result = await EdgeImpulseModule.initializeModel1();
      this._model1Initialized = Boolean(result);
      return this._model1Initialized;
    } catch (error) {
      console.error('[EdgeImpulse] Failed to initialize Model 1:', error);
      return false;
    }
  }

  async initializeModel2(): Promise<boolean> {
    if (isExpoGo) {
      await new Promise(resolve => setTimeout(resolve, 500));
      this._model2Initialized = true;
      return true;
    }

    try {
      const result = await EdgeImpulseModule.initializeModel2();
      this._model2Initialized = Boolean(result);
      return this._model2Initialized;
    } catch (error) {
      console.error('[EdgeImpulse] Failed to initialize Model 2:', error);
      return false;
    }
  }

  async runInferenceModel1(audioData: number[]): Promise<InferenceResult> {
    if (isExpoGo) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return createMockInferenceResult();
    }

    return EdgeImpulseModule.runInferenceModel1(audioData);
  }

  async runInferenceModel2(audioData: number[]): Promise<InferenceResult> {
    if (isExpoGo) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return createMockInferenceResult();
    }

    return EdgeImpulseModule.runInferenceModel2(audioData);
  }

  async getModel1Info(): Promise<ModelInfo> {
    if (isExpoGo) {
      return mockModel1Info;
    }

    return EdgeImpulseModule.getModel1Info();
  }

  async getModel2Info(): Promise<ModelInfo> {
    if (isExpoGo) {
      return mockModel2Info;
    }

    return EdgeImpulseModule.getModel2Info();
  }

  async isModel1Initialized(): Promise<boolean> {
    if (isExpoGo) {
      return this._model1Initialized;
    }

    try {
      return Boolean(await EdgeImpulseModule.isModel1Initialized());
    } catch {
      return false;
    }
  }

  async isModel2Initialized(): Promise<boolean> {
    if (isExpoGo) {
      return this._model2Initialized;
    }

    try {
      return Boolean(await EdgeImpulseModule.isModel2Initialized());
    } catch {
      return false;
    }
  }

  isNativeModuleAvailable(): boolean {
    return !isExpoGo;
  }

  isRunningInExpoGo(): boolean {
    return isExpoGo;
  }
}

export const edgeImpulseService = new EdgeImpulseService();
