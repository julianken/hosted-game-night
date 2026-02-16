'use client';

import { Toggle, Slider } from '@beak-gaming/ui';
import { useAudioStore } from '@/stores/audio-store';
import {
  useTTS,
  filterVoicesByLanguage,
  sortVoicesByQuality,
  getVoiceDisplayName,
} from '@/hooks/use-tts';

export interface AudioSettingsPanelProps {
  onClose?: () => void;
}

export function AudioSettingsPanel({ onClose }: AudioSettingsPanelProps) {
  // Audio store state
  const enabled = useAudioStore((s) => s.enabled);
  const volume = useAudioStore((s) => s.volume);
  const ttsEnabled = useAudioStore((s) => s.ttsEnabled);
  const ttsVoice = useAudioStore((s) => s.ttsVoice);
  const ttsRate = useAudioStore((s) => s.ttsRate);
  const sfxEnabled = useAudioStore((s) => s.sfxEnabled);
  const sfxVolume = useAudioStore((s) => s.sfxVolume);

  // Audio store actions
  const setEnabled = useAudioStore((s) => s.setEnabled);
  const setVolume = useAudioStore((s) => s.setVolume);
  const setTtsEnabled = useAudioStore((s) => s.setTtsEnabled);
  const setTtsVoice = useAudioStore((s) => s.setTtsVoice);
  const setTtsRate = useAudioStore((s) => s.setTtsRate);
  const setSfxEnabled = useAudioStore((s) => s.setSfxEnabled);
  const setSfxVolume = useAudioStore((s) => s.setSfxVolume);
  const playSoundEffect = useAudioStore((s) => s.playSoundEffect);

  // TTS hook for voices
  const { voices, isAvailable, speak, isSpeaking, stop } = useTTS();

  // Filter and sort voices for English
  const englishVoices = sortVoicesByQuality(filterVoicesByLanguage(voices, 'en'));

  // Test TTS
  const handleTestTts = () => {
    if (isSpeaking) {
      stop();
    } else {
      speak('This is a test of the text to speech system.');
    }
  };

  // Test sound effects
  const handleTestSfx = () => {
    playSoundEffect('question-reveal');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Audio Settings</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
            aria-label="Close settings"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Master Audio Toggle */}
      <div className="p-4 bg-muted/10 rounded-xl space-y-4">
        <Toggle
          checked={enabled}
          onChange={setEnabled}
          label="Enable Audio"
        />
        {enabled && (
          <Slider
            value={Math.round(volume * 100)}
            onChange={(v) => setVolume(v / 100)}
            min={0}
            max={100}
            step={5}
            label="Master Volume"
            unit="%"
          />
        )}
      </div>

      {/* Text-to-Speech Settings */}
      <div className="p-4 bg-muted/10 rounded-xl space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Text-to-Speech</h3>

        <Toggle
          checked={ttsEnabled}
          onChange={setTtsEnabled}
          label="Enable TTS"
          disabled={!enabled}
        />

        {!isAvailable && ttsEnabled && (
          <p className="text-base text-warning-foreground bg-warning/20 p-2 rounded">
            Text-to-Speech is not available in this browser.
          </p>
        )}

        {enabled && ttsEnabled && isAvailable && (
          <>
            {/* Voice Selection */}
            <div className="space-y-2">
              <label htmlFor="voice-select" className="text-base font-medium">
                Voice
              </label>
              <select
                id="voice-select"
                value={ttsVoice || ''}
                onChange={(e) => setTtsVoice(e.target.value || null)}
                className="w-full p-3 rounded-lg bg-background border border-border text-lg
                  focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">System Default</option>
                {englishVoices.map((voice) => (
                  <option key={voice.voiceURI} value={voice.voiceURI}>
                    {getVoiceDisplayName(voice)} ({voice.lang})
                  </option>
                ))}
              </select>
            </div>

            {/* Speech Rate */}
            <Slider
              value={ttsRate}
              onChange={setTtsRate}
              min={0.5}
              max={2.0}
              step={0.1}
              label="Speech Rate"
              unit="x"
            />

            {/* Test Button */}
            <button
              onClick={handleTestTts}
              className={`
                w-full px-4 py-3 rounded-xl text-base font-medium
                transition-colors duration-200
                ${isSpeaking
                  ? 'bg-error hover:bg-error/90 text-white'
                  : 'bg-primary hover:bg-primary/80 text-primary-foreground'
                }
              `}
            >
              {isSpeaking ? 'Stop' : 'Test TTS'}
            </button>
          </>
        )}

        {/* TTS Usage Info */}
        <p className="text-base text-muted-foreground">
          When enabled, TTS will read questions aloud, announce answers, and
          announce scores and winners.
        </p>
      </div>

      {/* Sound Effects Settings */}
      <div className="p-4 bg-muted/10 rounded-xl space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Sound Effects</h3>

        <Toggle
          checked={sfxEnabled}
          onChange={setSfxEnabled}
          label="Enable Sound Effects"
          disabled={!enabled}
        />

        {enabled && sfxEnabled && (
          <>
            <Slider
              value={Math.round(sfxVolume * 100)}
              onChange={(v) => setSfxVolume(v / 100)}
              min={0}
              max={100}
              step={5}
              label="Effects Volume"
              unit="%"
            />

            {/* Test Button */}
            <button
              onClick={handleTestSfx}
              className="w-full px-4 py-3 rounded-xl text-base font-medium
                bg-primary hover:bg-primary/80 text-primary-foreground
                transition-colors duration-200"
            >
              Test Sound Effect
            </button>
          </>
        )}

        {/* SFX Info */}
        <p className="text-base text-muted-foreground">
          Sound effects play for timer warnings, answer reveals, round
          completions, and game end.
        </p>
      </div>
    </div>
  );
}
