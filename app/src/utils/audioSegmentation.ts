import { SlidingWindowConfig } from '../types';

// Default configuration for sliding window analysis
// Window of 2000ms (2s) with 1000ms step (50% overlap)
// Example: 0-2s, 1-3s, 2-4s, 3-5s, ...
export const DEFAULT_SLIDING_WINDOW_CONFIG: SlidingWindowConfig = {
  windowDurationMs: 2000,   // 2000ms (2s) window for model analysis
  stepDurationMs: 1000,     // 1000ms (1s) step between windows (50% overlap)
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
 * The audio is divided into overlapping segments. Each window is 2 seconds
 * and the step is 1 second, creating 50% overlap between consecutive windows.
 *
 * Example with 5s audio at 48kHz:
 * - Total samples: 240,000
 * - Step size: 1000ms = 48,000 samples
 * - Window size: 2000ms = 96,000 samples
 *
 * Windows:
 * - Window 0: 0s - 2s
 * - Window 1: 1s - 3s
 * - Window 2: 2s - 4s
 * - Window 3: 3s - 5s
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
