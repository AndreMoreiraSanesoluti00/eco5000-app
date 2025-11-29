import { NativeModules, Platform } from 'react-native';
import Constants from 'expo-constants';
import { InferenceResult, ModelInfo } from '../types';

// Safely check for native module
const EdgeImpulseNativeModule = NativeModules?.EdgeImpulseModule;

// Check if we're running in Expo Go (native module won't be available)
// Use multiple checks to be safe
const isExpoGo = (() => {
  // Check Constants first
  if (Constants.executionEnvironment === 'storeClient') return true;
  if (Constants.appOwnership === 'expo') return true;

  // Check if native module exists and has the expected methods
  if (!EdgeImpulseNativeModule) {
    console.log('[EdgeImpulse] Native module not found');
    return true;
  }
  if (typeof EdgeImpulseNativeModule.initializeModel1 !== 'function') {
    console.log('[EdgeImpulse] Native module missing initializeModel1 method');
    return true;
  }

  return false;
})();

console.log('[EdgeImpulse] Mode:', isExpoGo ? 'Expo Go (Mock)' : 'Native (TFLite)');
if (!isExpoGo) {
  console.log('[EdgeImpulse] Native module available:', Object.keys(EdgeImpulseNativeModule || {}));
}

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
  threshold: 0.6,
};

const mockModel2Info: ModelInfo = {
  id: 'model2',
  name: 'Sane.AI.Final',
  projectId: 839504,
  labels: ['Leak', 'No_leak'],
  frequency: 48000,
  threshold: 0.6,
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

// Utility function to log uncertainty metrics
function logUncertaintyMetrics(
  modelName: string,
  result: InferenceResult,
  threshold: number
): void {
  const uncertainty = 1 - result.confidence;
  const isAboveThreshold = result.confidence >= threshold;
  const marginFromThreshold = result.confidence - threshold;

  // Classify uncertainty level
  let uncertaintyLevel: string;
  if (uncertainty < 0.1) {
    uncertaintyLevel = 'MUITO_BAIXA';
  } else if (uncertainty < 0.2) {
    uncertaintyLevel = 'BAIXA';
  } else if (uncertainty < 0.35) {
    uncertaintyLevel = 'MODERADA';
  } else if (uncertainty < 0.5) {
    uncertaintyLevel = 'ALTA';
  } else {
    uncertaintyLevel = 'MUITO_ALTA';
  }

  console.log(`[Incerteza][${modelName}] ========================================`);
  console.log(`[Incerteza][${modelName}] Label: ${result.label}`);
  console.log(`[Incerteza][${modelName}] Confiança: ${(result.confidence * 100).toFixed(2)}%`);
  console.log(`[Incerteza][${modelName}] Incerteza: ${(uncertainty * 100).toFixed(2)}%`);
  console.log(`[Incerteza][${modelName}] Nível de Incerteza: ${uncertaintyLevel}`);
  console.log(`[Incerteza][${modelName}] Threshold do modelo: ${(threshold * 100).toFixed(0)}%`);
  console.log(`[Incerteza][${modelName}] Acima do threshold: ${isAboveThreshold ? 'SIM' : 'NÃO'}`);
  console.log(`[Incerteza][${modelName}] Margem do threshold: ${(marginFromThreshold * 100).toFixed(2)}%`);

  // Warning for high uncertainty predictions
  if (uncertainty >= 0.35) {
    console.warn(`[Incerteza][${modelName}] ⚠️ ALERTA: Predição com alta incerteza! Resultado pode não ser confiável.`);
  }

  // Warning for predictions below threshold
  if (!isAboveThreshold) {
    console.warn(`[Incerteza][${modelName}] ⚠️ ALERTA: Confiança abaixo do threshold! Considerar resultado inconclusivo.`);
  }

  console.log(`[Incerteza][${modelName}] ========================================`);
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
      console.log('[EdgeImpulse] Calling native initializeModel1...');
      const result = await EdgeImpulseNativeModule.initializeModel1();
      this._model1Initialized = Boolean(result);
      console.log('[EdgeImpulse] Model 1 initialized:', this._model1Initialized);
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
      console.log('[EdgeImpulse] Calling native initializeModel2...');
      const result = await EdgeImpulseNativeModule.initializeModel2();
      this._model2Initialized = Boolean(result);
      console.log('[EdgeImpulse] Model 2 initialized:', this._model2Initialized);
      return this._model2Initialized;
    } catch (error) {
      console.error('[EdgeImpulse] Failed to initialize Model 2:', error);
      return false;
    }
  }

  async runInferenceModel1(audioData: number[]): Promise<InferenceResult> {
    if (isExpoGo) {
      // Simulating realistic TFLite inference time (50-150ms)
      await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
      const mockResult = createMockInferenceResult();
      logUncertaintyMetrics('Modelo1-Cético', mockResult, mockModel1Info.threshold);
      return mockResult;
    }

    console.log('[EdgeImpulse] Running native inference Model 1 with', audioData.length, 'samples');
    const result = await EdgeImpulseNativeModule.runInferenceModel1(audioData);
    console.log('[EdgeImpulse] Model 1 result:', result);
    logUncertaintyMetrics('Modelo1-Cético', result, mockModel1Info.threshold);
    return result;
  }

  async runInferenceModel2(audioData: number[]): Promise<InferenceResult> {
    if (isExpoGo) {
      // Simulating realistic TFLite inference time (50-150ms)
      await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
      const mockResult = createMockInferenceResult();
      logUncertaintyMetrics('Modelo2-Paranoico', mockResult, mockModel2Info.threshold);
      return mockResult;
    }

    console.log('[EdgeImpulse] Running native inference Model 2 with', audioData.length, 'samples');
    const result = await EdgeImpulseNativeModule.runInferenceModel2(audioData);
    console.log('[EdgeImpulse] Model 2 result:', result);
    logUncertaintyMetrics('Modelo2-Paranoico', result, mockModel2Info.threshold);
    return result;
  }

  async getModel1Info(): Promise<ModelInfo> {
    if (isExpoGo) {
      return mockModel1Info;
    }

    return EdgeImpulseNativeModule.getModel1Info();
  }

  async getModel2Info(): Promise<ModelInfo> {
    if (isExpoGo) {
      return mockModel2Info;
    }

    return EdgeImpulseNativeModule.getModel2Info();
  }

  async isModel1Initialized(): Promise<boolean> {
    if (isExpoGo) {
      return this._model1Initialized;
    }

    try {
      return Boolean(await EdgeImpulseNativeModule.isModel1Initialized());
    } catch {
      return false;
    }
  }

  async isModel2Initialized(): Promise<boolean> {
    if (isExpoGo) {
      return this._model2Initialized;
    }

    try {
      return Boolean(await EdgeImpulseNativeModule.isModel2Initialized());
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
