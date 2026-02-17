export type { PooledAudio } from './pool';
export {
  getPooledAudio,
  releasePooledAudio,
  cleanupAudioElement,
  cleanupAllPools,
  pauseAllActiveAudio,
  getActiveAudioCount,
} from './pool';
export { playAudioFile } from './play-audio-file';
export { stopAllSpeech } from './speech';
