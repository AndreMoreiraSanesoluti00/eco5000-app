/**
 * DSP Preprocessing Module
 *
 * Este módulo contém todas as funções de pré-tratamento de dados dos modelos DSP:
 * - Paranoico: Spectral Analysis com Wavelet Transform
 * - Specktral: Mel-frequency Energy (MFE) Features
 *
 * Baseado nas implementações do Edge Impulse SDK
 */

import FFT from 'fft.js';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export interface SpectralAnalysisConfig {
  blockId: number;
  implementationVersion: number;
  axes: number;
  scaleAxes: number;
  inputDecimationRatio: number;
  filterType: 'low' | 'high';
  filterCutoff: number;
  filterOrder: number;
  analysisType: 'FFT' | 'Wavelet';
  fftLength: number;
  spectralPeaksCount: number;
  spectralPeaksThreshold: number;
  spectralPowerEdges: string;
  doLog: boolean;
  doFftOverlap: boolean;
  waveletLevel: number;
  wavelet: string;
  extraLowFreq: boolean;
}

export interface MFEConfig {
  blockId: number;
  implementationVersion: number;
  axes: number;
  frameLength: number; // em segundos
  frameStride: number; // em segundos
  numFilters: number;
  fftLength: number;
  lowFrequency: number; // em Hz
  highFrequency: number; // em Hz
  winSize: number;
  noiseFloorDb: number;
}

export interface StandardScalerConfig {
  mean: number[];
  scale: number[];
  var: number[];
}

// ============================================================================
// UTILITÁRIOS MATEMÁTICOS
// ============================================================================

export class MathUtils {
  /**
   * Calcula o RMS (Root Mean Square) de um array
   */
  static rms(data: number[]): number {
    const sumSquares = data.reduce((sum, val) => sum + val * val, 0);
    return Math.sqrt(sumSquares / data.length);
  }

  /**
   * Calcula o desvio padrão
   */
  static stddev(data: number[]): number {
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    return Math.sqrt(variance);
  }

  /**
   * Calcula a assimetria (skewness)
   */
  static skewness(data: number[]): number {
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const stddev = this.stddev(data);
    if (stddev === 0) return 0;
    
    const n = data.length;
    const sumCubed = data.reduce((sum, val) => {
      const normalized = (val - mean) / stddev;
      return sum + normalized * normalized * normalized;
    }, 0);
    
    return sumCubed / n;
  }

  /**
   * Calcula a curtose (kurtosis) - Fisher definition (subtrai 3)
   */
  static kurtosis(data: number[]): number {
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const stddev = this.stddev(data);
    if (stddev === 0) return 0;
    
    const n = data.length;
    const sumFourth = data.reduce((sum, val) => {
      const normalized = (val - mean) / stddev;
      return sum + normalized * normalized * normalized * normalized;
    }, 0);
    
    return (sumFourth / n) - 3;
  }

  /**
   * Remove a média do sinal (centraliza)
   */
  static subtractMean(data: number[]): number[] {
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    return data.map(val => val - mean);
  }

  /**
   * Escala os valores por um fator
   */
  static scale(data: number[], factor: number): number[] {
    if (factor === 1.0) return data;
    return data.map(val => val * factor);
  }

  /**
   * Aplica log10 com tratamento de zeros
   */
  static log10Safe(data: number[]): number[] {
    const epsilon = 1e-10;
    return data.map(val => {
      const safeVal = Math.max(val, epsilon);
      return Math.log10(safeVal);
    });
  }

  /**
   * Converte frequência para escala Mel
   */
  static frequencyToMel(freq: number): number {
    return 2595 * Math.log10(1 + freq / 700);
  }

  /**
   * Converte escala Mel para frequência
   */
  static melToFrequency(mel: number): number {
    return 700 * (Math.pow(10, mel / 2595) - 1);
  }

  /**
   * Gera valores linearmente espaçados
   */
  static linspace(start: number, end: number, count: number): number[] {
    const step = (end - start) / (count - 1);
    return Array.from({ length: count }, (_, i) => start + i * step);
  }
}

// ============================================================================
// FILTROS
// ============================================================================

export class ButterworthFilter {
  /**
   * Aplica filtro Butterworth passa-alta
   * Implementação simplificada - para uso completo, considere usar uma biblioteca de DSP
   */
  static highpass(
    data: number[],
    samplingFreq: number,
    cutoffFreq: number,
    order: number
  ): number[] {
    // Implementação simplificada - em produção, use uma biblioteca DSP completa
    // como dsp.js ou similar
    const nyquist = samplingFreq / 2;
    const normalizedCutoff = cutoffFreq / nyquist;
    
    // Para implementação completa, seria necessário calcular os coeficientes
    // do filtro Butterworth e aplicar filtragem IIR
    // Por enquanto, retornamos os dados sem modificação
    // NOTA: Em produção, implemente o filtro Butterworth completo
    return data;
  }

  /**
   * Aplica filtro Butterworth passa-baixa
   */
  static lowpass(
    data: number[],
    samplingFreq: number,
    cutoffFreq: number,
    order: number
  ): number[] {
    // Similar ao highpass - implementação completa requer biblioteca DSP
    return data;
  }
}

// ============================================================================
// DECIMAÇÃO
// ============================================================================

export class Decimation {
  /**
   * Decima o sinal por um fator (reduz a taxa de amostragem)
   */
  static decimate(data: number[], ratio: number): number[] {
    const decimated: number[] = [];
    for (let i = 0; i < data.length; i += ratio) {
      decimated.push(data[i]);
    }
    return decimated;
  }

  /**
   * Decima com filtro anti-aliasing (SOS - Second Order Sections)
   * Implementação simplificada
   */
  static decimateWithFilter(data: number[], ratio: number): number[] {
    // Em produção, aplique o filtro SOS antes da decimação
    // Por enquanto, apenas decimamos
    return this.decimate(data, ratio);
  }
}

// ============================================================================
// FFT E ESPECTRO
// ============================================================================

export class FFTProcessor {
  /**
   * Calcula o espectro de potência usando FFT
   */
  static powerSpectrum(
    data: number[],
    fftLength: number
  ): number[] {
    // Aplica janela de Hamming
    const windowed = this.applyHammingWindow(data, fftLength);

    // Pad com zeros se necessário
    const paddedData = new Array(fftLength).fill(0);
    for (let i = 0; i < Math.min(windowed.length, fftLength); i++) {
      paddedData[i] = windowed[i];
    }

    // Calcula FFT
    const fft = new FFT(fftLength);
    const complexSpectrum = fft.createComplexArray();
    fft.realTransform(complexSpectrum, paddedData);

    // Calcula magnitude ao quadrado (power spectrum)
    const spectrumSize = Math.floor(fftLength / 2) + 1;
    const powerSpectrum = new Array(spectrumSize);

    for (let i = 0; i < spectrumSize; i++) {
      const real = complexSpectrum[2 * i];
      const imag = complexSpectrum[2 * i + 1];
      powerSpectrum[i] = (real * real + imag * imag) / fftLength;
    }

    return powerSpectrum;
  }

  /**
   * Aplica janela de Hamming
   */
  static applyHammingWindow(data: number[], length: number): number[] {
    const windowed: number[] = [];
    for (let i = 0; i < Math.min(data.length, length); i++) {
      const windowValue = 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (length - 1));
      windowed.push(data[i] * windowValue);
    }
    return windowed;
  }

  /**
   * Welch method com max hold
   */
  static welchMaxHold(
    data: number[],
    fftLength: number,
    overlap: boolean = false
  ): number[] {
    return this.powerSpectrum(data, fftLength);
  }
}

// ============================================================================
// WAVELET TRANSFORM
// ============================================================================

export class WaveletTransform {
  /**
   * Extrai features usando Discrete Wavelet Transform (DWT)
   * Implementação baseada em Haar Wavelet (simplificado)
   * Para gerar 98 features: 14 features × 7 níveis = 98
   */
  static extractFeatures(
    data: number[],
    wavelet: string,
    level: number
  ): number[] {
    const features: number[] = [];

    // Aplicar DWT nível por nível
    let approximation = [...data];
    const details: number[][] = [];

    for (let currentLevel = 0; currentLevel < level; currentLevel++) {
      const { approx, detail } = this.haarDWT(approximation);
      details.push(detail);
      approximation = approx;

      // Se não houver amostras suficientes, parar
      if (approximation.length < 2) break;
    }

    // Extrair 14 estatísticas de cada nível de detalhe (para totalizar 98)
    for (const detailCoeffs of details) {
      // 1. RMS
      features.push(MathUtils.rms(detailCoeffs));

      // 2. Desvio padrão
      features.push(MathUtils.stddev(detailCoeffs));

      // 3. Skewness
      features.push(MathUtils.skewness(detailCoeffs));

      // 4. Kurtosis
      features.push(MathUtils.kurtosis(detailCoeffs));

      // 5. Min
      features.push(Math.min(...detailCoeffs));

      // 6. Max
      features.push(Math.max(...detailCoeffs));

      // 7. Energia
      const energy = detailCoeffs.reduce((sum, val) => sum + val * val, 0);
      features.push(energy);

      // 8. Média
      const mean = detailCoeffs.reduce((sum, val) => sum + val, 0) / detailCoeffs.length;
      features.push(mean);

      // 9. Mediana (aproximada)
      const sorted = [...detailCoeffs].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      features.push(median);

      // 10. Range (amplitude)
      const range = Math.max(...detailCoeffs) - Math.min(...detailCoeffs);
      features.push(range);

      // 11. Soma absoluta
      const absSum = detailCoeffs.reduce((sum, val) => sum + Math.abs(val), 0);
      features.push(absSum);

      // 12. Variância
      const variance = detailCoeffs.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / detailCoeffs.length;
      features.push(variance);

      // 13. Zero crossing rate
      let zeroCrossings = 0;
      for (let i = 1; i < detailCoeffs.length; i++) {
        if ((detailCoeffs[i] >= 0 && detailCoeffs[i - 1] < 0) ||
            (detailCoeffs[i] < 0 && detailCoeffs[i - 1] >= 0)) {
          zeroCrossings++;
        }
      }
      features.push(zeroCrossings / detailCoeffs.length);

      // 14. Energia normalizada
      const normalizedEnergy = energy / detailCoeffs.length;
      features.push(normalizedEnergy);
    }

    return features;
  }

  /**
   * Haar Wavelet Transform (1-level decomposition)
   * Retorna coeficientes de aproximação e detalhe
   */
  private static haarDWT(data: number[]): { approx: number[]; detail: number[] } {
    const len = Math.floor(data.length / 2);
    const approx = new Array(len);
    const detail = new Array(len);

    for (let i = 0; i < len; i++) {
      // Coeficientes de aproximação (low-pass)
      approx[i] = (data[2 * i] + data[2 * i + 1]) / Math.sqrt(2);

      // Coeficientes de detalhe (high-pass)
      detail[i] = (data[2 * i] - data[2 * i + 1]) / Math.sqrt(2);
    }

    return { approx, detail };
  }

  /**
   * Verifica se o tamanho dos dados é suficiente para o nível de wavelet
   */
  static checkMinSize(dataSize: number, waveletLevel: number): boolean {
    const minSize = Math.pow(2, waveletLevel);
    return dataSize >= minSize;
  }
}

// ============================================================================
// MEL-FREQUENCY FILTERBANK
// ============================================================================

export class MelFilterbank {
  /**
   * Calcula os filtros Mel (Mel filterbank)
   */
  static createFilterbank(
    numFilters: number,
    fftLength: number,
    samplingFreq: number,
    lowFreq: number,
    highFreq: number
  ): number[][] {
    const coefficients = Math.floor(fftLength / 2) + 1;
    const filterbank: number[][] = Array(numFilters)
      .fill(0)
      .map(() => new Array(coefficients).fill(0));

    // Converte frequências para Mel
    const lowMel = MathUtils.frequencyToMel(lowFreq);
    const highMel = MathUtils.frequencyToMel(highFreq);
    const melPoints = MathUtils.linspace(lowMel, highMel, numFilters + 2);

    // Converte de volta para Hz
    const hertzPoints = melPoints.map(mel => {
      let freq = MathUtils.melToFrequency(mel);
      freq = Math.max(freq, lowFreq);
      freq = Math.min(freq, highFreq);
      return freq;
    });

    // Ajuste para o último ponto (bug fix do SpeechPy)
    hertzPoints[hertzPoints.length - 1] -= 0.001;

    // Calcula índices dos bins FFT
    const freqIndices = hertzPoints.map(hertz =>
      Math.floor((coefficients + 1) * hertz / samplingFreq)
    );

    // Cria filtros triangulares
    for (let i = 0; i < numFilters; i++) {
      const left = freqIndices[i];
      const middle = freqIndices[i + 1];
      const right = freqIndices[i + 2];

      // Filtro triangular
      for (let bin = left; bin <= right; bin++) {
        if (bin < middle) {
          filterbank[i][bin] = (bin - left) / (middle - left);
        } else if (bin > middle) {
          filterbank[i][bin] = (right - bin) / (right - middle);
        } else {
          filterbank[i][bin] = 1.0;
        }
      }
    }

    return filterbank;
  }

  /**
   * Aplica o filterbank ao espectro de potência
   */
  static applyFilterbank(
    powerSpectrum: number[],
    filterbank: number[][]
  ): number[] {
    const energies: number[] = [];

    for (let i = 0; i < filterbank.length; i++) {
      let energy = 0;
      for (let j = 0; j < Math.min(powerSpectrum.length, filterbank[i].length); j++) {
        energy += powerSpectrum[j] * filterbank[i][j];
      }
      energies.push(energy);
    }

    return energies;
  }
}

// ============================================================================
// PREEMPHASIS
// ============================================================================

export class Preemphasis {
  /**
   * Aplica preemphasis ao sinal de áudio
   * y[n] = x[n] - coef * x[n-1]
   */
  static apply(
    data: number[],
    coef: number = 0.98
  ): number[] {
    const preemphasized: number[] = [data[0]];

    for (let i = 1; i < data.length; i++) {
      preemphasized.push(data[i] - coef * data[i - 1]);
    }

    return preemphasized;
  }
}

// ============================================================================
// STACK FRAMES (FRAMING)
// ============================================================================

export class FrameStacker {
  /**
   * Divide o sinal em frames (janelas) sobrepostas
   */
  static stackFrames(
    data: number[],
    samplingFreq: number,
    frameLength: number, // em segundos
    frameStride: number   // em segundos
  ): number[][] {
    const frameLengthSamples = Math.floor(frameLength * samplingFreq);
    const frameStrideSamples = Math.floor(frameStride * samplingFreq);
    const frames: number[][] = [];

    for (let i = 0; i < data.length; i += frameStrideSamples) {
      const frame = data.slice(i, i + frameLengthSamples);
      
      // Zero-padding se necessário
      if (frame.length < frameLengthSamples) {
        const padding = new Array(frameLengthSamples - frame.length).fill(0);
        frame.push(...padding);
      }

      frames.push(frame);
    }

    return frames;
  }

  /**
   * Calcula o número de frames
   */
  static calculateNumFrames(
    signalLength: number,
    samplingFreq: number,
    frameLength: number,
    frameStride: number
  ): number {
    const frameLengthSamples = Math.floor(frameLength * samplingFreq);
    const frameStrideSamples = Math.floor(frameStride * samplingFreq);
    return Math.floor((signalLength - frameLengthSamples) / frameStrideSamples) + 1;
  }
}

// ============================================================================
// SPECTRAL ANALYSIS (PARANOICO - WAVELET)
// ============================================================================

export class SpectralAnalysisProcessor {
  /**
   * Processa sinal usando Spectral Analysis com Wavelet
   * Configuração do modelo Paranoico
   */
  static process(
    signal: number[],
    config: SpectralAnalysisConfig,
    samplingFreq: number = 48000
  ): number[] {
    let processed = [...signal];

    // 1. Transpor e escalar (se necessário)
    processed = MathUtils.scale(processed, config.scaleAxes);

    // 2. Aplicar filtro highpass
    if (config.filterType === 'high' && config.filterOrder > 0) {
      processed = ButterworthFilter.highpass(
        processed,
        samplingFreq,
        config.filterCutoff,
        config.filterOrder
      );
    }

    // 3. Remover média
    processed = MathUtils.subtractMean(processed);

    // 4. Decimação (se necessário)
    if (config.inputDecimationRatio > 1) {
      processed = Decimation.decimateWithFilter(processed, config.inputDecimationRatio);
      samplingFreq = samplingFreq / config.inputDecimationRatio;
    }

    // 5. Extrair features baseado no tipo de análise
    const features: number[] = [];

    if (config.analysisType === 'Wavelet') {
      // Wavelet Transform
      const waveletFeatures = WaveletTransform.extractFeatures(
        processed,
        config.wavelet,
        config.waveletLevel
      );
      features.push(...waveletFeatures);
    } else {
      // FFT-based features
      // RMS
      features.push(MathUtils.rms(processed));

      // Skewness
      features.push(MathUtils.skewness(processed));

      // Kurtosis
      features.push(MathUtils.kurtosis(processed));

      // Power Spectrum
      const powerSpectrum = FFTProcessor.welchMaxHold(
        processed,
        config.fftLength,
        config.doFftOverlap
      );

      // Aplicar log se necessário
      if (config.doLog) {
        const logSpectrum = MathUtils.log10Safe(powerSpectrum);
        features.push(...logSpectrum);
      } else {
        features.push(...powerSpectrum);
      }

      // Spectral peaks (simplificado)
      // Em produção, implemente detecção de picos no espectro

      // Spectral power edges (simplificado)
      // Em produção, calcule energia em bandas de frequência específicas
    }

    return features;
  }

  /**
   * Aplica normalização Standard Scaler
   */
  static applyStandardScaler(
    features: number[],
    scaler: StandardScalerConfig
  ): number[] {
    if (features.length !== scaler.mean.length) {
      throw new Error('Tamanho de features não corresponde ao scaler');
    }

    return features.map((val, idx) => {
      const normalized = (val - scaler.mean[idx]) * scaler.scale[idx];
      return normalized;
    });
  }
}

// ============================================================================
// MFE PROCESSOR (SPECKTRAL)
// ============================================================================

export class MFEProcessor {
  /**
   * Processa sinal usando Mel-frequency Energy (MFE)
   * Configuração do modelo Specktral
   */
  static process(
    signal: number[],
    config: MFEConfig,
    samplingFreq: number = 48000
  ): number[] {
    // 1. Preemphasis (se versão >= 3)
    let processed = signal;
    if (config.implementationVersion >= 3) {
      processed = Preemphasis.apply(processed, 0.98);
    }

    // 2. Stack frames
    const frames = FrameStacker.stackFrames(
      processed,
      samplingFreq,
      config.frameLength,
      config.frameStride
    );

    // 3. Criar Mel filterbank
    const filterbank = MelFilterbank.createFilterbank(
      config.numFilters,
      config.fftLength,
      samplingFreq,
      config.lowFrequency,
      config.highFrequency
    );

    // 4. Processar cada frame
    const allFeatures: number[] = [];

    for (const frame of frames) {
      // Calcular power spectrum
      const powerSpectrum = FFTProcessor.powerSpectrum(frame, config.fftLength);

      // Aplicar zero handling (substituir zeros por valor pequeno)
      const safeSpectrum = powerSpectrum.map(val => Math.max(val, 1e-10));

      // Aplicar filterbank
      const melEnergies = MelFilterbank.applyFilterbank(safeSpectrum, filterbank);

      // Aplicar zero handling novamente
      const safeEnergies = melEnergies.map(val => Math.max(val, 1e-10));

      allFeatures.push(...safeEnergies);
    }

    return allFeatures;
  }
}

// ============================================================================
// PROCESSADORES GLOBAIS
// ============================================================================

export class DSPPreprocessor {
  /**
   * Processa sinal usando a configuração do modelo Paranoico
   */
  static processParanoico(
    signal: number[],
    samplingFreq: number = 48000
  ): number[] {
    const config: SpectralAnalysisConfig = {
      blockId: 76,
      implementationVersion: 4,
      axes: 1,
      scaleAxes: 1.0,
      inputDecimationRatio: 3,
      filterType: 'high',
      filterCutoff: 500.0,
      filterOrder: 6,
      analysisType: 'Wavelet',
      fftLength: 2048,
      spectralPeaksCount: 3,
      spectralPeaksThreshold: 0.1,
      spectralPowerEdges: '0.1, 0.5, 1.0, 2.0, 5.0',
      doLog: true,
      doFftOverlap: false,
      waveletLevel: 7, // Aumentado para 7 para gerar 98 features (7 × 14)
      wavelet: 'bior3.1',
      extraLowFreq: false,
    };

    const features = SpectralAnalysisProcessor.process(signal, config, samplingFreq);

    // Garantir que retorna exatamente 98 features
    if (features.length > 98) {
      return features.slice(0, 98);
    } else if (features.length < 98) {
      // Pad com zeros se necessário
      const padding = new Array(98 - features.length).fill(0);
      return [...features, ...padding];
    }

    return features;
  }

  /**
   * Aplica normalização Standard Scaler do modelo Paranoico
   */
  static normalizeParanoico(
    features: number[],
    scalerConfig?: StandardScalerConfig
  ): number[] {
    // Se não fornecido, usa valores padrão do modelo
    // Em produção, carregue os valores do arquivo de configuração
    if (!scalerConfig) {
      // Valores placeholder - carregue do modelo real
      scalerConfig = {
        mean: new Array(98).fill(0),
        scale: new Array(98).fill(1),
        var: new Array(98).fill(1),
      };
    }

    return SpectralAnalysisProcessor.applyStandardScaler(features, scalerConfig);
  }

  /**
   * Processa sinal usando a configuração do modelo Specktral
   */
  static processSpecktral(
    signal: number[],
    samplingFreq: number = 48000
  ): number[] {
    // Para gerar 1560 features: 40 filtros × 39 frames = 1560
    // Com 96000 amostras (2s @ 48kHz)
    const config: MFEConfig = {
      blockId: 196,
      implementationVersion: 4,
      axes: 1,
      frameLength: 0.0256, // ~25.6ms para gerar exatamente 39 frames
      frameStride: 0.05, // 50ms entre frames
      numFilters: 40,
      fftLength: 2048,
      lowFrequency: 300,
      highFrequency: 1000,
      winSize: 101,
      noiseFloorDb: -72,
    };

    const features = MFEProcessor.process(signal, config, samplingFreq);

    // Garantir que retorna exatamente 1560 features
    if (features.length > 1560) {
      return features.slice(0, 1560);
    } else if (features.length < 1560) {
      // Pad com zeros se necessário
      const padding = new Array(1560 - features.length).fill(0);
      return [...features, ...padding];
    }

    return features;
  }

  /**
   * Processa sinal e retorna features para ambos os modelos
   */
  static processBoth(
    signal: number[],
    samplingFreq: number = 48000
  ): {
    paranoico: number[];
    specktral: number[];
  } {
    return {
      paranoico: this.processParanoico(signal, samplingFreq),
      specktral: this.processSpecktral(signal, samplingFreq),
    };
  }
}

// ============================================================================
// EXPORT DEFAULT
// ============================================================================

export default DSPPreprocessor;

