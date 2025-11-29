import { useState, useCallback } from 'react';
import { edgeImpulseService } from '../services/EdgeImpulseModule';
import { InferenceResult, ModelInfo, WindowResult, AggregatedResult, SlidingWindowConfig } from '../types';
import { segmentAudio, validateAudioForSegmentation, DEFAULT_SLIDING_WINDOW_CONFIG } from '../utils/audioSegmentation';

/**
 * Logs comparative uncertainty analysis between both models
 *
 * Model 1 (Cético/Skeptic): MFE DSP, threshold 0.6
 * Model 2 (Paranoico/Paranoid): Wavelet DSP, threshold 0.4
 *
 * ⚠️ NOTE: Currently Model 2 uses same pipeline as Model 1 in native code,
 * so results may be identical/very similar. See KNOWN_ISSUES.md
 */
function logComparativeUncertainty(
  model1Result: InferenceResult,
  model2Result: InferenceResult,
  model1Info: ModelInfo | null,
  model2Info: ModelInfo | null
): void {
  const model1Threshold = model1Info?.threshold ?? 0.6;
  const model2Threshold = model2Info?.threshold ?? 0.4;

  const model1Uncertainty = 1 - model1Result.confidence;
  const model2Uncertainty = 1 - model2Result.confidence;
  const avgUncertainty = (model1Uncertainty + model2Uncertainty) / 2;
  const uncertaintyDiff = Math.abs(model1Uncertainty - model2Uncertainty);

  // Check agreement between models
  const modelsAgree = model1Result.label === model2Result.label;
  const bothAboveThreshold =
    model1Result.confidence >= model1Threshold &&
    model2Result.confidence >= model2Threshold;

  console.log('[Incerteza][Comparativo] ════════════════════════════════════════');
  console.log('[Incerteza][Comparativo] ANÁLISE COMPARATIVA DE INCERTEZA');
  console.log('[Incerteza][Comparativo] ════════════════════════════════════════');
  console.log('[Incerteza][Comparativo] Modelo 1 (Cético):');
  console.log(`[Incerteza][Comparativo]   - Label: ${model1Result.label}`);
  console.log(`[Incerteza][Comparativo]   - Confiança: ${(model1Result.confidence * 100).toFixed(2)}%`);
  console.log(`[Incerteza][Comparativo]   - Incerteza: ${(model1Uncertainty * 100).toFixed(2)}%`);
  console.log('[Incerteza][Comparativo] Modelo 2 (Paranoico):');
  console.log(`[Incerteza][Comparativo]   - Label: ${model2Result.label}`);
  console.log(`[Incerteza][Comparativo]   - Confiança: ${(model2Result.confidence * 100).toFixed(2)}%`);
  console.log(`[Incerteza][Comparativo]   - Incerteza: ${(model2Uncertainty * 100).toFixed(2)}%`);
  console.log('[Incerteza][Comparativo] ────────────────────────────────────────');
  console.log(`[Incerteza][Comparativo] Incerteza Média: ${(avgUncertainty * 100).toFixed(2)}%`);
  console.log(`[Incerteza][Comparativo] Diferença de Incerteza: ${(uncertaintyDiff * 100).toFixed(2)}%`);
  console.log(`[Incerteza][Comparativo] Modelos concordam: ${modelsAgree ? 'SIM' : 'NÃO'}`);
  console.log(`[Incerteza][Comparativo] Ambos acima do threshold: ${bothAboveThreshold ? 'SIM' : 'NÃO'}`);

  // Evaluate overall prediction reliability
  let reliabilityAssessment: string;
  if (modelsAgree && bothAboveThreshold && avgUncertainty < 0.2) {
    reliabilityAssessment = 'ALTA CONFIABILIDADE';
  } else if (modelsAgree && avgUncertainty < 0.35) {
    reliabilityAssessment = 'CONFIABILIDADE MODERADA';
  } else if (!modelsAgree) {
    reliabilityAssessment = 'BAIXA CONFIABILIDADE - Modelos discordam';
  } else if (avgUncertainty >= 0.35) {
    reliabilityAssessment = 'BAIXA CONFIABILIDADE - Alta incerteza média';
  } else {
    reliabilityAssessment = 'CONFIABILIDADE INCERTA';
  }

  console.log(`[Incerteza][Comparativo] AVALIAÇÃO: ${reliabilityAssessment}`);

  // Specific warnings
  if (!modelsAgree) {
    console.warn('[Incerteza][Comparativo] ⚠️ ALERTA: Os modelos discordam na classificação!');
    console.warn(`[Incerteza][Comparativo]    Modelo 1 diz: ${model1Result.label} (${(model1Result.confidence * 100).toFixed(1)}%)`);
    console.warn(`[Incerteza][Comparativo]    Modelo 2 diz: ${model2Result.label} (${(model2Result.confidence * 100).toFixed(1)}%)`);
  }

  if (uncertaintyDiff > 0.2) {
    console.warn('[Incerteza][Comparativo] ⚠️ ALERTA: Grande diferença de incerteza entre modelos!');
    console.warn(`[Incerteza][Comparativo]    Isso pode indicar comportamento instável para este tipo de áudio.`);
  }

  if (!bothAboveThreshold) {
    console.warn('[Incerteza][Comparativo] ⚠️ ALERTA: Nem todos os modelos atingiram seu threshold de confiança.');
    if (model1Result.confidence < model1Threshold) {
      console.warn(`[Incerteza][Comparativo]    Modelo 1: ${(model1Result.confidence * 100).toFixed(1)}% < ${(model1Threshold * 100).toFixed(0)}% (threshold)`);
    }
    if (model2Result.confidence < model2Threshold) {
      console.warn(`[Incerteza][Comparativo]    Modelo 2: ${(model2Result.confidence * 100).toFixed(1)}% < ${(model2Threshold * 100).toFixed(0)}% (threshold)`);
    }
  }

  console.log('[Incerteza][Comparativo] ════════════════════════════════════════');
}

// Function to aggregate results from all windows
function aggregateWindowResults(windowResults: WindowResult[]): AggregatedResult['combinedAverage'] & {
  model1Average: AggregatedResult['model1Average'];
  model2Average: AggregatedResult['model2Average'];
} {
  if (windowResults.length === 0) {
    return {
      model1Average: { leakConfidence: 0, noLeakConfidence: 0, dominantLabel: 'No_leak', windowCount: 0 },
      model2Average: { leakConfidence: 0, noLeakConfidence: 0, dominantLabel: 'No_leak', windowCount: 0 },
      leakConfidence: 0,
      noLeakConfidence: 0,
      finalLabel: 'No_leak',
    };
  }

  // Aggregate Model 1 results
  let model1LeakSum = 0;
  let model1NoLeakSum = 0;
  let model1LeakCount = 0;
  let model1NoLeakCount = 0;

  // Aggregate Model 2 results
  let model2LeakSum = 0;
  let model2NoLeakSum = 0;
  let model2LeakCount = 0;
  let model2NoLeakCount = 0;

  for (const window of windowResults) {
    // Model 1
    if (window.model1Result.label === 'Leak') {
      model1LeakSum += window.model1Result.confidence;
      model1LeakCount++;
    } else {
      model1NoLeakSum += window.model1Result.confidence;
      model1NoLeakCount++;
    }

    // Model 2
    if (window.model2Result.label === 'Leak') {
      model2LeakSum += window.model2Result.confidence;
      model2LeakCount++;
    } else {
      model2NoLeakSum += window.model2Result.confidence;
      model2NoLeakCount++;
    }
  }

  const windowCount = windowResults.length;

  // Calculate Model 1 average confidence for each label
  // If model said "Leak", use that confidence; if "No_leak", leak confidence is (1 - confidence)
  const model1LeakConfidence = windowResults.reduce((sum, w) => {
    return sum + (w.model1Result.label === 'Leak' ? w.model1Result.confidence : 1 - w.model1Result.confidence);
  }, 0) / windowCount;
  const model1NoLeakConfidence = 1 - model1LeakConfidence;
  const model1DominantLabel = model1LeakConfidence > 0.5 ? 'Leak' : 'No_leak';

  // Calculate Model 2 average confidence for each label
  const model2LeakConfidence = windowResults.reduce((sum, w) => {
    return sum + (w.model2Result.label === 'Leak' ? w.model2Result.confidence : 1 - w.model2Result.confidence);
  }, 0) / windowCount;
  const model2NoLeakConfidence = 1 - model2LeakConfidence;
  const model2DominantLabel = model2LeakConfidence > 0.5 ? 'Leak' : 'No_leak';

  // Combined average between both models
  const combinedLeakConfidence = (model1LeakConfidence + model2LeakConfidence) / 2;
  const combinedNoLeakConfidence = 1 - combinedLeakConfidence;
  const finalLabel = combinedLeakConfidence > 0.5 ? 'Leak' : 'No_leak';

  console.log('[Agregação] ════════════════════════════════════════');
  console.log('[Agregação] RESULTADOS AGREGADOS DE JANELA DESLIZANTE');
  console.log('[Agregação] ════════════════════════════════════════');
  console.log(`[Agregação] Total de janelas processadas: ${windowCount}`);
  console.log('[Agregação] ────────────────────────────────────────');
  console.log('[Agregação] Modelo 1 (Cético):');
  console.log(`[Agregação]   - Confiança média Leak: ${(model1LeakConfidence * 100).toFixed(2)}%`);
  console.log(`[Agregação]   - Confiança média No_leak: ${(model1NoLeakConfidence * 100).toFixed(2)}%`);
  console.log(`[Agregação]   - Label dominante: ${model1DominantLabel}`);
  console.log('[Agregação] Modelo 2 (Paranoico):');
  console.log(`[Agregação]   - Confiança média Leak: ${(model2LeakConfidence * 100).toFixed(2)}%`);
  console.log(`[Agregação]   - Confiança média No_leak: ${(model2NoLeakConfidence * 100).toFixed(2)}%`);
  console.log(`[Agregação]   - Label dominante: ${model2DominantLabel}`);
  console.log('[Agregação] ────────────────────────────────────────');
  console.log('[Agregação] MÉDIA COMBINADA (entre os dois modelos):');
  console.log(`[Agregação]   - Confiança Leak: ${(combinedLeakConfidence * 100).toFixed(2)}%`);
  console.log(`[Agregação]   - Confiança No_leak: ${(combinedNoLeakConfidence * 100).toFixed(2)}%`);
  console.log(`[Agregação]   - CLASSIFICAÇÃO FINAL: ${finalLabel}`);
  console.log('[Agregação] ════════════════════════════════════════');

  return {
    model1Average: {
      leakConfidence: model1LeakConfidence,
      noLeakConfidence: model1NoLeakConfidence,
      dominantLabel: model1DominantLabel,
      windowCount,
    },
    model2Average: {
      leakConfidence: model2LeakConfidence,
      noLeakConfidence: model2NoLeakConfidence,
      dominantLabel: model2DominantLabel,
      windowCount,
    },
    leakConfidence: combinedLeakConfidence,
    noLeakConfidence: combinedNoLeakConfidence,
    finalLabel,
  };
}

interface UseEdgeImpulseResult {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  model1Info: ModelInfo | null;
  model2Info: ModelInfo | null;
  initializeModels: () => Promise<void>;
  runInference: (audioData: number[]) => Promise<{
    model1Result: InferenceResult | null;
    model2Result: InferenceResult | null;
  }>;
  runSlidingWindowInference: (
    audioData: number[],
    config?: SlidingWindowConfig,
    onWindowProcessed?: (windowIndex: number, totalWindows: number) => void
  ) => Promise<AggregatedResult>;
}

export function useEdgeImpulse(): UseEdgeImpulseResult {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [model1Info, setModel1Info] = useState<ModelInfo | null>(null);
  const [model2Info, setModel2Info] = useState<ModelInfo | null>(null);

  const initializeModels = useCallback(async () => {
    console.log('[useEdgeImpulse] Iniciando carregamento dos modelos de IA...');
    setIsLoading(true);
    setError(null);

    try {
      const startTime = Date.now();
      console.log('[useEdgeImpulse] Inicializando Modelo 1 (Cético) e Modelo 2 (Paranoico)...');

      const [model1Init, model2Init] = await Promise.all([
        edgeImpulseService.initializeModel1(),
        edgeImpulseService.initializeModel2(),
      ]);

      console.log('[useEdgeImpulse] Modelo 1 inicializado:', model1Init);
      console.log('[useEdgeImpulse] Modelo 2 inicializado:', model2Init);

      if (!model1Init || !model2Init) {
        throw new Error('Falha ao inicializar modelos');
      }

      const [info1, info2] = await Promise.all([
        edgeImpulseService.getModel1Info(),
        edgeImpulseService.getModel2Info(),
      ]);

      console.log('[useEdgeImpulse] Info Modelo 1:', JSON.stringify(info1));
      console.log('[useEdgeImpulse] Info Modelo 2:', JSON.stringify(info2));
      console.log('[useEdgeImpulse] Modelos carregados em', Date.now() - startTime, 'ms');

      setModel1Info(info1);
      setModel2Info(info2);
      setIsInitialized(true);
      console.log('[useEdgeImpulse] ✓ Modelos prontos para inferência!');
    } catch (err) {
      console.error('[useEdgeImpulse] Erro ao inicializar modelos:', err);
      setError(err instanceof Error ? err.message : 'Erro ao inicializar modelos');
      setIsInitialized(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const runInference = useCallback(
    async (audioData: number[]) => {
      if (!isInitialized) {
        throw new Error('Modelos não inicializados');
      }

      console.log('[useEdgeImpulse] Iniciando inferência com', audioData.length, 'amostras...');
      const startTime = Date.now();

      console.log('[useEdgeImpulse] Chamando Modelo 1 (Cético)...');
      const model1Start = Date.now();
      const model1Result = await edgeImpulseService.runInferenceModel1(audioData);
      console.log('[useEdgeImpulse] Modelo 1 respondeu em', Date.now() - model1Start, 'ms');

      console.log('[useEdgeImpulse] Chamando Modelo 2 (Paranoico)...');
      const model2Start = Date.now();
      const model2Result = await edgeImpulseService.runInferenceModel2(audioData);
      console.log('[useEdgeImpulse] Modelo 2 respondeu em', Date.now() - model2Start, 'ms');

      console.log('[useEdgeImpulse] Inferência total concluída em', Date.now() - startTime, 'ms');

      // Log comparative uncertainty analysis between both models
      logComparativeUncertainty(model1Result, model2Result, model1Info, model2Info);

      return { model1Result, model2Result };
    },
    [isInitialized, model1Info, model2Info]
  );

  const runSlidingWindowInference = useCallback(
    async (
      audioData: number[],
      config: SlidingWindowConfig = DEFAULT_SLIDING_WINDOW_CONFIG,
      onWindowProcessed?: (windowIndex: number, totalWindows: number) => void
    ): Promise<AggregatedResult> => {
      if (!isInitialized) {
        throw new Error('Modelos não inicializados');
      }

      const startTime = Date.now();

      console.log('[SlidingWindow] ════════════════════════════════════════');
      console.log('[SlidingWindow] INICIANDO CLASSIFICAÇÃO COM JANELA DESLIZANTE');
      console.log('[SlidingWindow] ════════════════════════════════════════');
      console.log(`[SlidingWindow] Total de amostras: ${audioData.length}`);
      console.log(`[SlidingWindow] Janela: ${config.windowDurationMs}ms`);
      console.log(`[SlidingWindow] Passo: ${config.stepDurationMs}ms`);

      // Validate audio
      const validation = validateAudioForSegmentation(audioData, config);
      if (!validation.isValid) {
        throw new Error(validation.message);
      }

      console.log(`[SlidingWindow] ${validation.message}`);

      // Segment the audio
      const segments = segmentAudio(audioData, config);
      const windowResults: WindowResult[] = [];

      console.log('[SlidingWindow] ────────────────────────────────────────');
      console.log('[SlidingWindow] Processando segmentos...');

      // Running totals for accumulated statistics
      let accumulatedModel1LeakConf = 0;
      let accumulatedModel2LeakConf = 0;
      let model1LeakVotes = 0;
      let model2LeakVotes = 0;

      // Process each segment
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const windowNum = i + 1;

        console.log('[SlidingWindow] ┌──────────────────────────────────────────────────────────────┐');
        console.log(`[SlidingWindow] │ JANELA ${windowNum}/${segments.length}                                                    │`);
        console.log('[SlidingWindow] ├──────────────────────────────────────────────────────────────┤');
        console.log(`[SlidingWindow] │ Intervalo: ${segment.startMs.toFixed(0)}ms - ${segment.endMs.toFixed(0)}ms (${segment.samples.length} amostras)`);

        // Run inference on both models IN PARALLEL for this window (much faster!)
        const inferenceStart = Date.now();
        const [model1Result, model2Result] = await Promise.all([
          edgeImpulseService.runInferenceModel1(segment.samples),
          edgeImpulseService.runInferenceModel2(segment.samples),
        ]);
        const inferenceTime = Date.now() - inferenceStart;

        // Calculate leak confidence for this window
        const model1LeakConf = model1Result.label === 'Leak' ? model1Result.confidence : 1 - model1Result.confidence;
        const model2LeakConf = model2Result.label === 'Leak' ? model2Result.confidence : 1 - model2Result.confidence;
        const windowLeakAvg = (model1LeakConf + model2LeakConf) / 2;

        // Calculate uncertainty for each model
        const model1Uncertainty = 1 - model1Result.confidence;
        const model2Uncertainty = 1 - model2Result.confidence;

        // Check if models agree
        const modelsAgree = model1Result.label === model2Result.label;

        // Update running totals
        accumulatedModel1LeakConf += model1LeakConf;
        accumulatedModel2LeakConf += model2LeakConf;
        if (model1Result.label === 'Leak') model1LeakVotes++;
        if (model2Result.label === 'Leak') model2LeakVotes++;

        // Running averages
        const runningModel1LeakAvg = accumulatedModel1LeakConf / windowNum;
        const runningModel2LeakAvg = accumulatedModel2LeakConf / windowNum;
        const runningCombinedAvg = (runningModel1LeakAvg + runningModel2LeakAvg) / 2;

        console.log('[SlidingWindow] │');
        console.log(`[SlidingWindow] │ ▸ Tempo de inferência (paralela): ${inferenceTime}ms`);
        console.log('[SlidingWindow] │');
        console.log('[SlidingWindow] │ ▸ MODELO 1 (Cético):');
        console.log(`[SlidingWindow] │   - Classificação: ${model1Result.label}`);
        console.log(`[SlidingWindow] │   - Confiança: ${(model1Result.confidence * 100).toFixed(2)}%`);
        console.log(`[SlidingWindow] │   - Incerteza: ${(model1Uncertainty * 100).toFixed(2)}%`);
        console.log(`[SlidingWindow] │   - Prob. Leak: ${(model1LeakConf * 100).toFixed(2)}%`);
        console.log('[SlidingWindow] │');
        console.log('[SlidingWindow] │ ▸ MODELO 2 (Paranoico):');
        console.log(`[SlidingWindow] │   - Classificação: ${model2Result.label}`);
        console.log(`[SlidingWindow] │   - Confiança: ${(model2Result.confidence * 100).toFixed(2)}%`);
        console.log(`[SlidingWindow] │   - Incerteza: ${(model2Uncertainty * 100).toFixed(2)}%`);
        console.log(`[SlidingWindow] │   - Prob. Leak: ${(model2LeakConf * 100).toFixed(2)}%`);
        console.log('[SlidingWindow] │');
        console.log('[SlidingWindow] │ ▸ ANÁLISE DA JANELA:');
        console.log(`[SlidingWindow] │   - Modelos concordam: ${modelsAgree ? '✓ SIM' : '✗ NÃO'}`);
        console.log(`[SlidingWindow] │   - Prob. Leak média (janela): ${(windowLeakAvg * 100).toFixed(2)}%`);
        console.log(`[SlidingWindow] │   - Decisão da janela: ${windowLeakAvg > 0.5 ? 'LEAK' : 'NO_LEAK'}`);
        console.log('[SlidingWindow] │');
        console.log('[SlidingWindow] │ ▸ ESTATÍSTICAS ACUMULADAS (até agora):');
        console.log(`[SlidingWindow] │   - Modelo 1 média Leak: ${(runningModel1LeakAvg * 100).toFixed(2)}% (${model1LeakVotes}/${windowNum} votos Leak)`);
        console.log(`[SlidingWindow] │   - Modelo 2 média Leak: ${(runningModel2LeakAvg * 100).toFixed(2)}% (${model2LeakVotes}/${windowNum} votos Leak)`);
        console.log(`[SlidingWindow] │   - Média combinada: ${(runningCombinedAvg * 100).toFixed(2)}%`);
        console.log(`[SlidingWindow] │   - Tendência atual: ${runningCombinedAvg > 0.5 ? 'LEAK' : 'NO_LEAK'}`);
        console.log('[SlidingWindow] └──────────────────────────────────────────────────────────────┘');

        windowResults.push({
          windowIndex: i,
          startMs: segment.startMs,
          endMs: segment.endMs,
          model1Result,
          model2Result,
        });

        // Notify progress callback
        if (onWindowProcessed) {
          onWindowProcessed(i + 1, segments.length);
        }
      }

      const processingTimeMs = Date.now() - startTime;

      console.log('[SlidingWindow] ────────────────────────────────────────');
      console.log(`[SlidingWindow] Processamento concluído em ${processingTimeMs}ms`);

      // Aggregate results
      const aggregated = aggregateWindowResults(windowResults);

      // Log comparative analysis for the aggregated results
      // Create synthetic InferenceResult from aggregated data for logging
      const syntheticModel1Result: InferenceResult = {
        label: aggregated.model1Average.dominantLabel,
        confidence: aggregated.model1Average.dominantLabel === 'Leak'
          ? aggregated.model1Average.leakConfidence
          : aggregated.model1Average.noLeakConfidence,
        timing: { dsp: 0, classification: processingTimeMs / 2, anomaly: 0 },
      };

      const syntheticModel2Result: InferenceResult = {
        label: aggregated.model2Average.dominantLabel,
        confidence: aggregated.model2Average.dominantLabel === 'Leak'
          ? aggregated.model2Average.leakConfidence
          : aggregated.model2Average.noLeakConfidence,
        timing: { dsp: 0, classification: processingTimeMs / 2, anomaly: 0 },
      };

      logComparativeUncertainty(syntheticModel1Result, syntheticModel2Result, model1Info, model2Info);

      return {
        model1Average: aggregated.model1Average,
        model2Average: aggregated.model2Average,
        combinedAverage: {
          leakConfidence: aggregated.leakConfidence,
          noLeakConfidence: aggregated.noLeakConfidence,
          finalLabel: aggregated.finalLabel,
        },
        windowResults,
        totalWindowsProcessed: windowResults.length,
        processingTimeMs,
      };
    },
    [isInitialized, model1Info, model2Info]
  );

  return {
    isInitialized,
    isLoading,
    error,
    model1Info,
    model2Info,
    initializeModels,
    runInference,
    runSlidingWindowInference,
  };
}
