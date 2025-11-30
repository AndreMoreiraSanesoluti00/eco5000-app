import Constants from 'expo-constants';
import { InferenceResult, ModelInfo } from '../types';
import { edgeImpulseTFLiteService } from './EdgeImpulseTFLite';

// Check if we're running in Expo Go (TFLite won't be available)
const isExpoGo = (() => {
  // Check Constants first
  if (Constants.executionEnvironment === 'storeClient') return true;
  if (Constants.appOwnership === 'expo') return true;
  return false;
})();

console.log('[EdgeImpulse] Mode:', isExpoGo ? 'Expo Go (Mock)' : 'Development Build (TFLite)');

/**
 * Edge Impulse Service Interface
 *
 * Manages two AI models for leak detection:
 *
 * MODEL 1 - "Cético" (Skeptic):
 *   - Project: 840911
 *   - DSP: MFE (Mel-Frequency Energy)
 *   - Threshold: 0.6 (60%)
 *   - Characteristics: More conservative, requires higher confidence
 *   - Output Features: 1560
 *
 * MODEL 2 - "Paranoico" (Paranoid):
 *   - Project: 840915
 *   - DSP: Spectral Analysis with Wavelet (bior3.1)
 *   - Threshold: 0.4 (40%)
 *   - Characteristics: More sensitive, detects with lower confidence
 *   - Output Features: 98
 *
 * The two models complement each other:
 * - When both agree with high confidence → Very reliable result
 * - When they disagree → Requires further investigation
 * - When Model 2 detects but Model 1 doesn't → Potential leak (lower confidence)
 */
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
// These values mirror the actual model configurations in the native C++ code
const mockModel1Info: ModelInfo = {
  id: 'model1',
  name: 'Sane.AI.MFE',
  projectId: 840911,
  labels: ['Leak', 'No_leak'],
  frequency: 48000,
  threshold: 0.6, // Skeptic model requires 60% confidence
};

const mockModel2Info: ModelInfo = {
  id: 'model2',
  name: 'Sane.AI.WAVELET',
  projectId: 840915,
  labels: ['Leak', 'No_leak'],
  frequency: 48000,
  threshold: 0.4, // Paranoid model requires only 40% confidence
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
      console.log('[EdgeImpulse] Initializing Model 1 with TFLite...');
      const result = await edgeImpulseTFLiteService.initializeModel1();
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
      console.log('[EdgeImpulse] Initializing Model 2 with TFLite...');
      const result = await edgeImpulseTFLiteService.initializeModel2();
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

    console.log('[EdgeImpulse] Running TFLite inference Model 1 with', audioData.length, 'samples');
    const result = await edgeImpulseTFLiteService.runInferenceModel1(audioData);
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

    console.log('[EdgeImpulse] Running TFLite inference Model 2 with', audioData.length, 'samples');
    const result = await edgeImpulseTFLiteService.runInferenceModel2(audioData);
    console.log('[EdgeImpulse] Model 2 result:', result);
    logUncertaintyMetrics('Modelo2-Paranoico', result, mockModel2Info.threshold);
    return result;
  }

  async getModel1Info(): Promise<ModelInfo> {
    if (isExpoGo) {
      return mockModel1Info;
    }

    return edgeImpulseTFLiteService.getModel1Info();
  }

  async getModel2Info(): Promise<ModelInfo> {
    if (isExpoGo) {
      return mockModel2Info;
    }

    return edgeImpulseTFLiteService.getModel2Info();
  }

  async isModel1Initialized(): Promise<boolean> {
    if (isExpoGo) {
      return this._model1Initialized;
    }

    try {
      return Boolean(await edgeImpulseTFLiteService.isModel1Initialized());
    } catch {
      return false;
    }
  }

  async isModel2Initialized(): Promise<boolean> {
    if (isExpoGo) {
      return this._model2Initialized;
    }

    try {
      return Boolean(await edgeImpulseTFLiteService.isModel2Initialized());
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
