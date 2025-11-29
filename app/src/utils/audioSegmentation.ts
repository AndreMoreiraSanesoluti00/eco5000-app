import { SlidingWindowConfig } from '../types';

// Default configuration for sliding window analysis
// Window of 500ms with 250ms step (50% overlap)
// Example: 0-500ms, 250-750ms, 500-1000ms, ...
export const DEFAULT_SLIDING_WINDOW_CONFIG: SlidingWindowConfig = {
  windowDurationMs: 500,    // 500ms window for model analysis
  stepDurationMs: 250,      // 250ms step between windows (50% overlap)
  sampleRate: 48000,        // 48kHz sample rate
};

export interface AudioSegment {
  index: number;
  startSample: number;
  endSample: number;
  startMs: number;
  endMs: number;
  samples: number[];
}

/**
 * Segments audio data using a sliding window approach with overlap.
 *
 * The audio is divided into overlapping segments. Each window is 500ms
 * and the step is 250ms, creating 50% overlap between consecutive windows.
 *
 * Example with 2s audio at 48kHz:
 * - Total samples: 96,000
 * - Step size: 250ms = 12,000 samples
 * - Window size: 500ms = 24,000 samples
 *
 * Windows:
 * - Window 0: 0ms-500ms
 * - Window 1: 250ms-750ms
 * - Window 2: 500ms-1000ms
 * - Window 3: 750ms-1250ms
 * - Window 4: 1000ms-1500ms
 * - Window 5: 1250ms-1750ms
 * - Window 6: 1500ms-2000ms
 *
 * @param audioData - Full audio samples array
 * @param config - Sliding window configuration
 * @returns Array of audio segments
 */
export function segmentAudio(
  audioData: number[],
  config: SlidingWindowConfig = DEFAULT_SLIDING_WINDOW_CONFIG
): AudioSegment[] {
  const { windowDurationMs, stepDurationMs, sampleRate } = config;

  // Calculate sample counts
  const windowSamples = Math.floor((windowDurationMs / 1000) * sampleRate);
  const stepSamples = Math.floor((stepDurationMs / 1000) * sampleRate);
  const totalSamples = audioData.length;

  console.log('[AudioSegmentation] Configuração:');
  console.log(`[AudioSegmentation]   - Duração da janela: ${windowDurationMs}ms (${windowSamples} amostras)`);
  console.log(`[AudioSegmentation]   - Passo: ${stepDurationMs}ms (${stepSamples} amostras)`);
  console.log(`[AudioSegmentation]   - Total de amostras: ${totalSamples}`);
  console.log(`[AudioSegmentation]   - Sample rate: ${sampleRate}Hz`);

  const segments: AudioSegment[] = [];
  let index = 0;

  // Iterate through the audio with step size
  for (let startSample = 0; startSample + windowSamples <= totalSamples; startSample += stepSamples) {
    const endSample = startSample + windowSamples;
    const startMs = (startSample / sampleRate) * 1000;
    const endMs = (endSample / sampleRate) * 1000;

    // Extract the window samples
    const samples = audioData.slice(startSample, endSample);

    segments.push({
      index,
      startSample,
      endSample,
      startMs,
      endMs,
      samples,
    });

    console.log(`[AudioSegmentation] Segmento ${index}: ${startMs.toFixed(0)}ms - ${endMs.toFixed(0)}ms (${samples.length} amostras)`);

    index++;
  }

  console.log(`[AudioSegmentation] Total de segmentos criados: ${segments.length}`);

  return segments;
}

/**
 * Calculates the expected number of windows for a given audio duration.
 *
 * @param audioDurationMs - Total audio duration in milliseconds
 * @param config - Sliding window configuration
 * @returns Expected number of analysis windows
 */
export function calculateExpectedWindows(
  audioDurationMs: number,
  config: SlidingWindowConfig = DEFAULT_SLIDING_WINDOW_CONFIG
): number {
  const { windowDurationMs, stepDurationMs } = config;

  // Calculate how many complete windows fit
  const availableDuration = audioDurationMs - windowDurationMs;
  if (availableDuration < 0) return 0;

  return Math.floor(availableDuration / stepDurationMs) + 1;
}

/**
 * Validates if audio data is suitable for sliding window analysis.
 *
 * @param audioData - Audio samples array
 * @param config - Sliding window configuration
 * @returns Validation result with details
 */
export function validateAudioForSegmentation(
  audioData: number[],
  config: SlidingWindowConfig = DEFAULT_SLIDING_WINDOW_CONFIG
): { isValid: boolean; message: string; expectedWindows: number } {
  const { windowDurationMs, sampleRate } = config;

  const minSamples = Math.floor((windowDurationMs / 1000) * sampleRate);
  const audioDurationMs = (audioData.length / sampleRate) * 1000;

  if (audioData.length < minSamples) {
    return {
      isValid: false,
      message: `Áudio muito curto. Mínimo necessário: ${windowDurationMs}ms (${minSamples} amostras). Recebido: ${audioDurationMs.toFixed(0)}ms (${audioData.length} amostras)`,
      expectedWindows: 0,
    };
  }

  const expectedWindows = calculateExpectedWindows(audioDurationMs, config);

  return {
    isValid: true,
    message: `Áudio válido: ${audioDurationMs.toFixed(0)}ms, ${expectedWindows} janela(s) de análise`,
    expectedWindows,
  };
}
