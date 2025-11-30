import { NativeModules } from 'react-native';
import { InferenceResult, ModelInfo } from '../types';

interface EdgeImpulseModuleNative {
  runInferenceModel1(audioData: number[]): Promise<string>;
  runInferenceModel2(audioData: number[]): Promise<string>;
  getModel1Info(): Promise<string>;
}

const { EdgeImpulseModule } = NativeModules as {
  EdgeImpulseModule: EdgeImpulseModuleNative;
};

if (!EdgeImpulseModule) {
  throw new Error('EdgeImpulseModule native module not found. Make sure it is properly linked.');
}

/**
 * Native Edge Impulse Service
 * Uses C++ SDK with DSP + Inference via run_classifier()
 */
export class EdgeImpulseNativeService {
  private model1Info: ModelInfo | null = null;
  private model2Info: ModelInfo | null = null;

  /**
   * Initialize models by fetching metadata
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('[EdgeImpulseNative] Initializing models...');

      // Get Model 1 info
      const model1InfoStr = await EdgeImpulseModule.getModel1Info();
      const model1InfoJson = JSON.parse(model1InfoStr);

      this.model1Info = {
        id: 'model1',
        name: model1InfoJson.name || 'Sane.AI.MFE',
        projectId: model1InfoJson.id || 840911,
        labels: ['Leak', 'No_leak'],
        frequency: model1InfoJson.frequency || 48000,
        threshold: 0.6,
      };

      // Model 2 info (placeholder until implementation)
      this.model2Info = {
        id: 'model2',
        name: 'Sane.AI.WAVELET',
        projectId: 840915,
        labels: ['Leak', 'No_leak'],
        frequency: 48000,
        threshold: 0.4,
      };

      console.log('[EdgeImpulseNative] Model 1 info:', this.model1Info);
      console.log('[EdgeImpulseNative] Initialization complete');

      return true;
    } catch (error) {
      console.error('[EdgeImpulseNative] Initialization failed:', error);
      return false;
    }
  }

  /**
   * Run inference on Model 1 (MFE + Neural Network)
   * This performs DSP (MFE) + Inference in one call
   */
  async runInferenceModel1(audioData: number[]): Promise<InferenceResult> {
    try {
      const startTime = performance.now();

      console.log(`[EdgeImpulseNative][Model1] Running inference with ${audioData.length} samples`);

      // Call native module
      const resultStr = await EdgeImpulseModule.runInferenceModel1(audioData);

      // Parse result
      const resultJson = JSON.parse(resultStr);

      if (resultJson.error) {
        throw new Error(resultJson.error);
      }

      const endTime = performance.now();

      // Find the label with highest confidence
      let maxConfidence = 0;
      let label = 'No_leak';

      for (const classification of resultJson.classifications) {
        if (classification.value > maxConfidence) {
          maxConfidence = classification.value;
          label = classification.label;
        }
      }

      const result: InferenceResult = {
        label,
        confidence: maxConfidence,
        timing: {
          dsp: resultJson.timing.dsp || 0,
          classification: resultJson.timing.classification || 0,
          anomaly: resultJson.timing.anomaly || 0,
        },
      };

      console.log(
        `[EdgeImpulseNative][Model1] Result: ${label} (${(maxConfidence * 100).toFixed(2)}%) ` +
        `DSP: ${result.timing.dsp}ms, Classification: ${result.timing.classification}ms`
      );

      return result;
    } catch (error) {
      console.error('[EdgeImpulseNative][Model1] Inference failed:', error);
      throw error;
    }
  }

  /**
   * Run inference on Model 2 (Wavelet + Neural Network)
   * Currently placeholder - requires namespace isolation in C++
   */
  async runInferenceModel2(audioData: number[]): Promise<InferenceResult> {
    try {
      console.log(`[EdgeImpulseNative][Model2] Running inference with ${audioData.length} samples`);

      const resultStr = await EdgeImpulseModule.runInferenceModel2(audioData);
      const resultJson = JSON.parse(resultStr);

      if (resultJson.error) {
        console.warn('[EdgeImpulseNative][Model2]', resultJson.error);
        // Return placeholder result
        return {
          label: 'No_leak',
          confidence: 0.5,
          timing: {
            dsp: 0,
            classification: 0,
            anomaly: 0,
          },
        };
      }

      // Parse actual result (when implemented)
      return {
        label: resultJson.label || 'No_leak',
        confidence: resultJson.confidence || 0.5,
        timing: {
          dsp: resultJson.timing?.dsp || 0,
          classification: resultJson.timing?.classification || 0,
          anomaly: resultJson.timing?.anomaly || 0,
        },
      };
    } catch (error) {
      console.error('[EdgeImpulseNative][Model2] Inference failed:', error);
      throw error;
    }
  }

  async getModel1Info(): Promise<ModelInfo> {
    if (!this.model1Info) {
      throw new Error('Models not initialized. Call initialize() first.');
    }
    return this.model1Info;
  }

  async getModel2Info(): Promise<ModelInfo> {
    if (!this.model2Info) {
      throw new Error('Models not initialized. Call initialize() first.');
    }
    return this.model2Info;
  }

  async isModel1Initialized(): Promise<boolean> {
    return this.model1Info !== null;
  }

  async isModel2Initialized(): Promise<boolean> {
    return this.model2Info !== null;
  }
}

export const edgeImpulseNativeService = new EdgeImpulseNativeService();
