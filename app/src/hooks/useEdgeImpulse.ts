import { useState, useCallback } from 'react';
import { edgeImpulseService } from '../services/EdgeImpulseModule';
import { InferenceResult, ModelInfo } from '../types';

// Function to log comparative uncertainty analysis between both models
function logComparativeUncertainty(
  model1Result: InferenceResult,
  model2Result: InferenceResult,
  model1Info: ModelInfo | null,
  model2Info: ModelInfo | null
): void {
  const model1Threshold = model1Info?.threshold ?? 0.7;
  const model2Threshold = model2Info?.threshold ?? 0.9;

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

  return {
    isInitialized,
    isLoading,
    error,
    model1Info,
    model2Info,
    initializeModels,
    runInference,
  };
}
