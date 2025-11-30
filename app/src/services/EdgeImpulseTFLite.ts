import { loadTensorflowModel } from 'react-native-fast-tflite';
import RNFS from 'react-native-fs';
import { InferenceResult, ModelInfo } from '../types';
import { DSPPreprocessor, MFEProcessor, MFEConfig } from './dsp-preprocessing';

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
        try {
          // Copy from assets to cache
          await RNFS.copyFileAssets(modelAssetPath, modelDestPath);
          console.log('[TFLite] Model copied to:', modelDestPath);
        } catch (copyError) {
          console.error('[TFLite] Failed to copy model from assets:', copyError);
          throw new Error(`Failed to copy model1.tflite from assets. Ensure the file exists in android/app/src/main/assets/${modelAssetPath}`);
        }
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[TFLite] Failed to initialize Model 1:', errorMessage);
      console.error('[TFLite] Error details:', error);
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
        try {
          // Copy from assets to cache
          await RNFS.copyFileAssets(modelAssetPath, modelDestPath);
          console.log('[TFLite] Model copied to:', modelDestPath);
        } catch (copyError) {
          console.error('[TFLite] Failed to copy model from assets:', copyError);
          throw new Error(`Failed to copy model2.tflite from assets. Ensure the file exists in android/app/src/main/assets/${modelAssetPath}`);
        }
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[TFLite] Failed to initialize Model 2:', errorMessage);
      console.error('[TFLite] Error details:', error);
      return false;
    }
  }

  /**
   * Run inference on Model 1 (MFE - Skeptic)
   */
  async runInferenceModel1(audioData: number[]): Promise<InferenceResult> {
    if (!model1) {
      throw new Error('Model 1 not initialized');
    }

    try {
      console.log('[EdgeImpulse] Running TFLite inference Model 1 with', audioData.length, 'samples');
      const startTime = performance.now();

      // Pré-processamento: Mel-frequency Energy (MFE)
      const dspStartTime = performance.now();
      const features = DSPPreprocessor.processSpecktral(audioData, model1Info.frequency);
      const dspEndTime = performance.now();
      const dspTime = Math.round(dspEndTime - dspStartTime);

      console.log('[TFLite][Model1] DSP extracted', features.length, 'features in', dspTime, 'ms');
      console.log('[TFLite][Model1] Expected input shape:', model1.inputs[0].shape);

      // Verificar se o número de features está correto
      const expectedFeatures = model1.inputs[0].shape[1];
      if (features.length !== expectedFeatures) {
        throw new Error(`Feature mismatch: got ${features.length}, expected ${expectedFeatures}`);
      }

      // Prepare input tensor
      const inputData = new Float32Array(features);

      console.log('[TFLite][Model1] Input data type:', inputData.constructor.name);
      console.log('[TFLite][Model1] Input data length:', inputData.length);
      console.log('[TFLite][Model1] First 5 values:', Array.from(inputData.slice(0, 5)));

      // Run inference (using runSync for synchronous execution)
      const inferenceStartTime = performance.now();
      const outputs = model1.runSync([inputData]);
      const inferenceEndTime = performance.now();
      const inferenceTime = Math.round(inferenceEndTime - inferenceStartTime);

      console.log('[TFLite][Model1] Outputs:', outputs);
      console.log('[TFLite][Model1] Outputs type:', typeof outputs);
      console.log('[TFLite][Model1] Outputs is array:', Array.isArray(outputs));

      if (!outputs || !Array.isArray(outputs) || outputs.length === 0) {
        throw new Error('Model returned invalid output');
      }

      // Parse outputs
      // TFLite output is a TypedArray with probabilities for each class
      const probabilities = outputs[0] as Float32Array;

      console.log('[TFLite][Model1] Probabilities:', probabilities);
      console.log('[TFLite][Model1] Probabilities type:', typeof probabilities);
      console.log('[TFLite][Model1] Probabilities length:', probabilities?.length);

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

      const totalTime = Math.round(performance.now() - startTime);

      const result: InferenceResult = {
        label,
        confidence: maxProb,
        timing: {
          dsp: dspTime,
          classification: inferenceTime,
          anomaly: 0,
        },
      };

      console.log(`[TFLite][Model1] Result: ${label} (${(maxProb * 100).toFixed(2)}%) - DSP: ${dspTime}ms, Inference: ${inferenceTime}ms, Total: ${totalTime}ms`);

      return result;
    } catch (error) {
      console.error('[TFLite] Inference failed:', error);
      throw error;
    }
  }

  /**
   * Run inference on Model 2 (Wavelet - Paranoid)
   */
  async runInferenceModel2(audioData: number[]): Promise<InferenceResult> {
    if (!model2) {
      throw new Error('Model 2 not initialized');
    }

    try {
      console.log('[EdgeImpulse] Running TFLite inference Model 2 with', audioData.length, 'samples');
      const startTime = performance.now();

      // Pré-processamento: Wavelet Transform
      const dspStartTime = performance.now();
      const features = DSPPreprocessor.processParanoico(audioData, model2Info.frequency);
      const dspEndTime = performance.now();
      const dspTime = Math.round(dspEndTime - dspStartTime);

      console.log('[TFLite][Model2] DSP extracted', features.length, 'features in', dspTime, 'ms');
      console.log('[TFLite][Model2] Expected input shape:', model2.inputs[0].shape);

      // Verificar se o número de features está correto
      const expectedFeatures = model2.inputs[0].shape[1];
      if (features.length !== expectedFeatures) {
        throw new Error(`Feature mismatch: got ${features.length}, expected ${expectedFeatures}`);
      }

      // Prepare input tensor
      const inputData = new Float32Array(features);

      console.log('[TFLite][Model2] Input data type:', inputData.constructor.name);
      console.log('[TFLite][Model2] Input data length:', inputData.length);
      console.log('[TFLite][Model2] First 5 values:', Array.from(inputData.slice(0, 5)));

      // Run inference (using runSync for synchronous execution)
      const inferenceStartTime = performance.now();
      const outputs = model2.runSync([inputData]);
      const inferenceEndTime = performance.now();
      const inferenceTime = Math.round(inferenceEndTime - inferenceStartTime);

      console.log('[TFLite][Model2] Outputs:', outputs);
      console.log('[TFLite][Model2] Outputs type:', typeof outputs);
      console.log('[TFLite][Model2] Outputs is array:', Array.isArray(outputs));

      if (!outputs || !Array.isArray(outputs) || outputs.length === 0) {
        throw new Error('Model returned invalid output');
      }

      // Parse outputs
      // TFLite output is a TypedArray with probabilities for each class
      const probabilities = outputs[0] as Float32Array;

      console.log('[TFLite][Model2] Probabilities:', probabilities);
      console.log('[TFLite][Model2] Probabilities type:', typeof probabilities);
      console.log('[TFLite][Model2] Probabilities length:', probabilities?.length);

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

      const totalTime = Math.round(performance.now() - startTime);

      const result: InferenceResult = {
        label,
        confidence: maxProb,
        timing: {
          dsp: dspTime,
          classification: inferenceTime,
          anomaly: 0,
        },
      };

      console.log(`[TFLite][Model2] Result: ${label} (${(maxProb * 100).toFixed(2)}%) - DSP: ${dspTime}ms, Inference: ${inferenceTime}ms, Total: ${totalTime}ms`);

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
