import { File } from 'expo-file-system/next';
import { NativeModules, Platform } from 'react-native';

// Formatos de áudio suportados
export const SUPPORTED_AUDIO_FORMATS = [
  '.wav',
  '.mp3',
  '.m4a',
  '.aac',
  '.ogg',
  '.flac',
  '.3gp',
  '.amr',
  '.wma',
] as const;

export type SupportedAudioFormat = typeof SUPPORTED_AUDIO_FORMATS[number];

// MIME types para o document picker
export const AUDIO_MIME_TYPES = [
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/aac',
  'audio/ogg',
  'audio/flac',
  'audio/x-flac',
  'audio/3gpp',
  'audio/amr',
  'audio/x-ms-wma',
  'audio/*',
];

/**
 * Verifica se um arquivo tem uma extensão de áudio suportada
 */
export function isSupportedAudioFormat(filename: string): boolean {
  const lowerName = filename.toLowerCase();
  return SUPPORTED_AUDIO_FORMATS.some(ext => lowerName.endsWith(ext));
}

/**
 * Obtém a extensão do arquivo
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filename.substring(lastDot).toLowerCase();
}

/**
 * Parse de arquivo WAV para obter amostras de áudio normalizadas
 */
export async function parseWavFile(uri: string): Promise<number[]> {
  console.log('[AudioParser] Parsing WAV:', uri);

  const file = new File(uri);
  const base64 = await file.base64();
  const binaryString = atob(base64);

  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const dataView = new DataView(bytes.buffer);

  // Validar header RIFF/WAVE
  const riff = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  const wave = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);

  if (riff !== 'RIFF' || wave !== 'WAVE') {
    throw new Error('Arquivo WAV inválido: header RIFF/WAVE não encontrado');
  }

  // Ler metadados do formato
  const numChannels = dataView.getUint16(22, true);
  const sampleRate = dataView.getUint32(24, true);
  const bitsPerSample = dataView.getUint16(34, true);

  console.log(`[AudioParser] WAV: ${numChannels} canais, ${sampleRate}Hz, ${bitsPerSample}-bit`);

  // Encontrar chunk "data"
  let dataOffset = 12;
  let dataSize = 0;

  while (dataOffset < bytes.length - 8) {
    const chunkId = String.fromCharCode(
      bytes[dataOffset],
      bytes[dataOffset + 1],
      bytes[dataOffset + 2],
      bytes[dataOffset + 3]
    );
    const chunkSize = dataView.getUint32(dataOffset + 4, true);

    if (chunkId === 'data') {
      dataSize = chunkSize;
      dataOffset += 8;
      break;
    }
    dataOffset += 8 + chunkSize;
  }

  if (dataSize === 0) {
    throw new Error('Arquivo WAV inválido: chunk de dados não encontrado');
  }

  // Extrair amostras de áudio
  const audioData: number[] = [];
  const bytesPerSample = bitsPerSample / 8;
  const endOffset = Math.min(dataOffset + dataSize, bytes.length);

  for (let i = dataOffset; i < endOffset; i += bytesPerSample * numChannels) {
    let sample: number;

    if (bitsPerSample === 16) {
      sample = dataView.getInt16(i, true) / 32768;
    } else if (bitsPerSample === 8) {
      sample = (bytes[i] - 128) / 128;
    } else if (bitsPerSample === 24) {
      // 24-bit PCM
      const low = bytes[i];
      const mid = bytes[i + 1];
      const high = bytes[i + 2];
      const value = (high << 16) | (mid << 8) | low;
      // Converter para signed
      sample = (value > 0x7FFFFF ? value - 0x1000000 : value) / 8388608;
    } else if (bitsPerSample === 32) {
      // 32-bit PCM (integer)
      sample = dataView.getInt32(i, true) / 2147483648;
    } else {
      // Fallback para 16-bit
      sample = dataView.getInt16(i, true) / 32768;
    }

    audioData.push(sample);
  }

  console.log(`[AudioParser] WAV parsed: ${audioData.length} amostras`);
  return audioData;
}

/**
 * Decodifica arquivos de áudio não-WAV usando módulo nativo Android
 */
async function decodeAudioNative(uri: string): Promise<number[]> {
  if (Platform.OS !== 'android') {
    throw new Error('Decodificação nativa só suportada no Android');
  }

  const { AudioDecoderModule } = NativeModules;

  if (!AudioDecoderModule || !AudioDecoderModule.decodeAudioFile) {
    throw new Error(
      'Módulo AudioDecoder não disponível. ' +
      'Para formatos não-WAV, por favor converta o arquivo para WAV.'
    );
  }

  console.log('[AudioParser] Decodificando via módulo nativo:', uri);
  const samples = await AudioDecoderModule.decodeAudioFile(uri);
  console.log(`[AudioParser] Decodificado: ${samples.length} amostras`);
  return samples;
}

/**
 * Parse de qualquer arquivo de áudio suportado
 * Retorna amostras normalizadas entre -1.0 e 1.0
 */
export async function parseAudioFile(uri: string, filename: string): Promise<number[]> {
  const extension = getFileExtension(filename);

  console.log(`[AudioParser] Processando arquivo: ${filename} (${extension})`);

  if (!isSupportedAudioFormat(filename)) {
    const supportedList = SUPPORTED_AUDIO_FORMATS.join(', ');
    throw new Error(
      `Formato não suportado: ${extension}\n` +
      `Formatos aceitos: ${supportedList}`
    );
  }

  // WAV pode ser parseado diretamente em JS
  if (extension === '.wav') {
    return parseWavFile(uri);
  }

  // Outros formatos precisam de decodificação nativa
  return decodeAudioNative(uri);
}

/**
 * Retorna uma string amigável com os formatos suportados
 */
export function getSupportedFormatsString(): string {
  return SUPPORTED_AUDIO_FORMATS.map(f => f.toUpperCase().replace('.', '')).join(', ');
}
