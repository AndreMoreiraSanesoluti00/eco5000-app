import { loadTensorflowModel } from 'react-native-fast-tflite';
import RNFS from 'react-native-fs';
import { InferenceResult, ModelInfo } from '../types';

/**
 * Edge Impulse TFLite Service using react-native-fast-tflite
 *
 * This implementation uses the mature and well-tested react-native-fast-tflite
 * library instead of custom JNI code, providing better compatibility and
 * avoiding New Architecture conflicts.
 */

let model1: any = null;
let model2: any = null;

const model1Info: ModelInfo = {
  id: 'model1',
  name: 'Sane.AI.MFE',
  projectId: 840911,
  labels: ['Leak', 'No_leak'],
  frequency: 48000,
  threshold: 0.6, // Skeptic model - more conservative
};

const model2Info: ModelInfo = {
  id: 'model2',
  name: 'Sane.AI.WAVELET',
  projectId: 840915,
  labels: ['Leak', 'No_leak'],
  frequency: 48000,
  threshold: 0.4, // Paranoid model - more sensitive
};

export class EdgeImpulseTFLiteService {
  /**
   * Initialize Model 1 (Skeptic - MFE)
   */
  async initializeModel1(): Promise<boolean> {
    try {
      console.log('[TFLite] Loading Model 1...');

      // Copy model from Android assets to cache using react-native-fs
      const modelDestPath = `${RNFS.CachesDirectoryPath}/model1.tflite`;
      const modelAssetPath = 'models/model1.tflite'; // Path relative to android/app/src/main/assets/

      // Check if model already exists in cache
      const exists = await RNFS.exists(modelDestPath);

      if (!exists) {
        console.log('[TFLite] Copying model from assets to cache...');
        // Copy from assets to cache
        await RNFS.copyFileAssets(modelAssetPath, modelDestPath);
        console.log('[TFLite] Model copied to:', modelDestPath);
      } else {
        console.log('[TFLite] Model already exists in cache:', modelDestPath);
      }

      console.log('[TFLite] Loading model from:', modelDestPath);
      // Load the model using the file path
      model1 = await loadTensorflowModel({ url: `file://${modelDestPath}` });
      console.log('[TFLite] Model 1 loaded successfully!');
      console.log('[TFLite] Model 1 inputs:', model1.inputs);
      console.log('[TFLite] Model 1 outputs:', model1.outputs);

      return true;
    } catch (error) {
      console.error('[TFLite] Failed to initialize Model 1:', error);
      return false;
    }
  }

  /**
   * Initialize Model 2 (Paranoid - Wavelet)
   */
  async initializeModel2(): Promise<boolean> {
    try {
      console.log('[TFLite] Loading Model 2...');

      // Copy model from Android assets to cache using react-native-fs
      const modelDestPath = `${RNFS.CachesDirectoryPath}/model2.tflite`;
      const modelAssetPath = 'models/model2.tflite'; // Path relative to android/app/src/main/assets/

      // Check if model already exists in cache
      const exists = await RNFS.exists(modelDestPath);

      if (!exists) {
        console.log('[TFLite] Copying model from assets to cache...');
        // Copy from assets to cache
        await RNFS.copyFileAssets(modelAssetPath, modelDestPath);
        console.log('[TFLite] Model copied to:', modelDestPath);
      } else {
        console.log('[TFLite] Model already exists in cache:', modelDestPath);
      }

      console.log('[TFLite] Loading model from:', modelDestPath);
      // Load the model using the file path
      model2 = await loadTensorflowModel({ url: `file://${modelDestPath}` });
      console.log('[TFLite] Model 2 loaded successfully!');
      console.log('[TFLite] Model 2 inputs:', model2.inputs);
      console.log('[TFLite] Model 2 outputs:', model2.outputs);

      return true;
    } catch (error) {
      console.error('[TFLite] Failed to initialize Model 2:', error);
      return false;
    }
  }

  /**
   * Run inference on Model 1
   */
  async runInferenceModel1(audioData: number[]): Promise<InferenceResult> {
    if (!model1) {
      throw new Error('Model 1 not initialized');
    }

    try {
      const startTime = performance.now();

      // Prepare input tensor
      // Edge Impulse models expect Float32Array input
      const inputData = new Float32Array(audioData);

      // Run inference
      const outputs = model1.run([inputData]);

      const endTime = performance.now();
      const inferenceTime = Math.round(endTime - startTime);

      // Parse outputs
      // TFLite output is typically a Float32Array with probabilities for each class
      const probabilities = outputs[0] as Float32Array;

      // Find the class with highest probability
      let maxProb = 0;
      let maxIndex = 0;
      for (let i = 0; i < probabilities.length; i++) {
        if (probabilities[i] > maxProb) {
          maxProb = probabilities[i];
          maxIndex = i;
        }
      }

      const label = model1Info.labels[maxIndex];

      const result: InferenceResult = {
        label,
        confidence: maxProb,
        timing: {
          dsp: 0, // TFLite doesn't separate DSP time
          classification: inferenceTime,
          anomaly: 0,
        },
      };

      console.log(`[TFLite][Model1] Result: ${label} (${(maxProb * 100).toFixed(2)}%) in ${inferenceTime}ms`);

      return result;
    } catch (error) {
      console.error('[TFLite] Inference failed:', error);
      throw error;
    }
  }

  /**
   * Run inference on Model 2
   */
  async runInferenceModel2(audioData: number[]): Promise<InferenceResult> {
    if (!model2) {
      throw new Error('Model 2 not initialized');
    }

    try {
      const startTime = performance.now();

      // Prepare input tensor
      // Edge Impulse models expect Float32Array input
      const inputData = new Float32Array(audioData);

      // Run inference
      const outputs = model2.run([inputData]);

      const endTime = performance.now();
      const inferenceTime = Math.round(endTime - startTime);

      // Parse outputs
      // TFLite output is typically a Float32Array with probabilities for each class
      const probabilities = outputs[0] as Float32Array;

      // Find the class with highest probability
      let maxProb = 0;
      let maxIndex = 0;
      for (let i = 0; i < probabilities.length; i++) {
        if (probabilities[i] > maxProb) {
          maxProb = probabilities[i];
          maxIndex = i;
        }
      }

      const label = model2Info.labels[maxIndex];

      const result: InferenceResult = {
        label,
        confidence: maxProb,
        timing: {
          dsp: 0, // TFLite doesn't separate DSP time
          classification: inferenceTime,
          anomaly: 0,
        },
      };

      console.log(`[TFLite][Model2] Result: ${label} (${(maxProb * 100).toFixed(2)}%) in ${inferenceTime}ms`);

      return result;
    } catch (error) {
      console.error('[TFLite] Inference failed:', error);
      throw error;
    }
  }

  async getModel1Info(): Promise<ModelInfo> {
    return model1Info;
  }

  async getModel2Info(): Promise<ModelInfo> {
    return model2Info;
  }

  async isModel1Initialized(): Promise<boolean> {
    return model1 !== null;
  }

  async isModel2Initialized(): Promise<boolean> {
    return model2 !== null;
  }
}

export const edgeImpulseTFLiteService = new EdgeImpulseTFLiteService();
