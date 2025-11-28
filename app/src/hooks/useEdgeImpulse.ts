import { useState, useCallback } from 'react';
import { edgeImpulseService } from '../services/EdgeImpulseModule';
import { InferenceResult, ModelInfo } from '../types';

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
      console.log('[useEdgeImpulse] Inicializando Modelo 1 (Séptico) e Modelo 2 (Paranoico)...');

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

      console.log('[useEdgeImpulse] Chamando Modelo 1 (Séptico)...');
      const model1Start = Date.now();
      const model1Result = await edgeImpulseService.runInferenceModel1(audioData);
      console.log('[useEdgeImpulse] Modelo 1 respondeu em', Date.now() - model1Start, 'ms');

      console.log('[useEdgeImpulse] Chamando Modelo 2 (Paranoico)...');
      const model2Start = Date.now();
      const model2Result = await edgeImpulseService.runInferenceModel2(audioData);
      console.log('[useEdgeImpulse] Modelo 2 respondeu em', Date.now() - model2Start, 'ms');

      console.log('[useEdgeImpulse] Inferência total concluída em', Date.now() - startTime, 'ms');

      return { model1Result, model2Result };
    },
    [isInitialized]
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
