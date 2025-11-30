import EdgeImpulseNative from '../../modules/edge-impulse-native/src/index';
import { InferenceResult, ModelInfo } from '../types';

if (!EdgeImpulseNative) {
  throw new Error('EdgeImpulseNative module not found. Make sure it is properly linked.');
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

      // Initialize Model 1
      await EdgeImpulseNative.initModel1();
      const model1InfoJson = await EdgeImpulseNative.getModel1Info();

      this.model1Info = {
        id: 'model1',
        name: model1InfoJson.name,
        projectId: model1InfoJson.projectId,
        labels: model1InfoJson.labels,
        frequency: model1InfoJson.frequency,
        threshold: model1InfoJson.threshold,
      };

      // Initialize Model 2
      await EdgeImpulseNative.initModel2();
      const model2InfoJson = await EdgeImpulseNative.getModel2Info();

      this.model2Info = {
        id: 'model2',
        name: model2InfoJson.name,
        projectId: model2InfoJson.projectId,
        labels: model2InfoJson.labels,
        frequency: model2InfoJson.frequency,
        threshold: model2InfoJson.threshold,
      };

      console.log('[EdgeImpulseNative] Model 1 info:', this.model1Info);
      console.log('[EdgeImpulseNative] Model 2 info:', this.model2Info);
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
      console.log(`[EdgeImpulseNative][Model1] Running inference with ${audioData.length} samples`);

      // Convert to Float32Array for native module
      const float32Data = new Float32Array(audioData);

      // Call native module
      const result = await EdgeImpulseNative.runInferenceModel1(float32Data);

      console.log(
        `[EdgeImpulseNative][Model1] Result: ${result.label} (${(result.confidence * 100).toFixed(2)}%) ` +
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

      // Convert to Float32Array for native module
      const float32Data = new Float32Array(audioData);

      // Call native module
      const result = await EdgeImpulseNative.runInferenceModel2(float32Data);

      console.log(
        `[EdgeImpulseNative][Model2] Result: ${result.label} (${(result.confidence * 100).toFixed(2)}%) ` +
        `DSP: ${result.timing.dsp}ms, Classification: ${result.timing.classification}ms`
      );

      return result;
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
