import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AudioSettingsPanel } from '../AudioSettingsPanel';
import { useAudioStore, AUDIO_DEFAULTS } from '@/stores/audio-store';
import { mockAudio } from '@joolie-boolie/testing';

// =============================================================================
// Mock SpeechSynthesisUtterance
// =============================================================================
class MockSpeechSynthesisUtterance {
  text: string;
  voice: SpeechSynthesisVoice | null = null;
  rate = 1;
  pitch = 1;
  volume = 1;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;

  constructor(text: string = '') {
    this.text = text;
  }
}

// =============================================================================
// Mock SpeechSynthesis
// =============================================================================
const mockSpeak = vi.fn();
const mockCancel = vi.fn();
const mockGetVoices = vi.fn(() => []);
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();

const mockSpeechSynthesis = {
  speak: mockSpeak,
  cancel: mockCancel,
  getVoices: mockGetVoices,
  addEventListener: mockAddEventListener,
  removeEventListener: mockRemoveEventListener,
  speaking: false,
  pending: false,
  paused: false,
  onvoiceschanged: null,
};

// Setup global mocks once
beforeAll(() => {
  mockAudio();
  // @ts-expect-error - Mock class
  global.SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;
  Object.defineProperty(window, 'speechSynthesis', {
    value: mockSpeechSynthesis,
    writable: true,
    configurable: true,
  });
});

describe('AudioSettingsPanel', () => {
  beforeEach(() => {
    // Reset store
    useAudioStore.setState({
      ...AUDIO_DEFAULTS,
    });

    // Clear mock calls
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the header', () => {
      render(<AudioSettingsPanel />);
      expect(screen.getByText('Audio Settings')).toBeInTheDocument();
    });

    it('renders master audio toggle', () => {
      render(<AudioSettingsPanel />);
      expect(screen.getByText('Enable Audio')).toBeInTheDocument();
    });

    it('renders TTS section', () => {
      render(<AudioSettingsPanel />);
      expect(screen.getByText('Text-to-Speech')).toBeInTheDocument();
    });

    it('renders SFX section', () => {
      render(<AudioSettingsPanel />);
      expect(screen.getByText('Sound Effects')).toBeInTheDocument();
    });

    it('renders close button when onClose is provided', () => {
      const onClose = vi.fn();
      render(<AudioSettingsPanel onClose={onClose} />);
      const closeButton = screen.getByLabelText('Close settings');
      expect(closeButton).toBeInTheDocument();
    });

    it('does not render close button when onClose is not provided', () => {
      render(<AudioSettingsPanel />);
      expect(screen.queryByLabelText('Close settings')).not.toBeInTheDocument();
    });
  });

  describe('master audio toggle', () => {
    it('reflects enabled state from store', () => {
      useAudioStore.setState({ enabled: true });
      render(<AudioSettingsPanel />);

      const toggle = screen.getByRole('switch', { name: /enable audio/i });
      expect(toggle).toHaveAttribute('aria-checked', 'true');
    });

    it('toggles enabled state', () => {
      useAudioStore.setState({ enabled: true });
      render(<AudioSettingsPanel />);

      const toggle = screen.getByRole('switch', { name: /enable audio/i });
      fireEvent.click(toggle);

      expect(useAudioStore.getState().enabled).toBe(false);
    });
  });

  describe('TTS settings', () => {
    it('shows TTS toggle', () => {
      render(<AudioSettingsPanel />);
      expect(screen.getByText('Enable TTS')).toBeInTheDocument();
    });

    it('TTS toggle reflects store state', () => {
      useAudioStore.setState({ ttsEnabled: true });
      render(<AudioSettingsPanel />);

      const toggle = screen.getByRole('switch', { name: /enable tts/i });
      expect(toggle).toHaveAttribute('aria-checked', 'true');
    });

    it('toggles TTS enabled state', () => {
      useAudioStore.setState({ ttsEnabled: false });
      render(<AudioSettingsPanel />);

      const toggle = screen.getByRole('switch', { name: /enable tts/i });
      fireEvent.click(toggle);

      expect(useAudioStore.getState().ttsEnabled).toBe(true);
    });

    it('shows speech rate slider when TTS is enabled', () => {
      useAudioStore.setState({ enabled: true, ttsEnabled: true });
      render(<AudioSettingsPanel />);

      expect(screen.getByText('Speech Rate')).toBeInTheDocument();
    });

    it('shows test TTS button when TTS is enabled', () => {
      useAudioStore.setState({ enabled: true, ttsEnabled: true });
      render(<AudioSettingsPanel />);

      expect(screen.getByRole('button', { name: /test tts/i })).toBeInTheDocument();
    });

    it('test TTS button speaks when clicked', () => {
      useAudioStore.setState({ enabled: true, ttsEnabled: true });
      render(<AudioSettingsPanel />);

      const testButton = screen.getByRole('button', { name: /test tts/i });
      fireEvent.click(testButton);

      expect(mockSpeak).toHaveBeenCalled();
    });
  });

  describe('SFX settings', () => {
    it('shows SFX toggle', () => {
      render(<AudioSettingsPanel />);
      expect(screen.getByText('Enable Sound Effects')).toBeInTheDocument();
    });

    it('SFX toggle reflects store state', () => {
      useAudioStore.setState({ sfxEnabled: true });
      render(<AudioSettingsPanel />);

      const toggle = screen.getByRole('switch', { name: /enable sound effects/i });
      expect(toggle).toHaveAttribute('aria-checked', 'true');
    });

    it('toggles SFX enabled state', () => {
      useAudioStore.setState({ sfxEnabled: true });
      render(<AudioSettingsPanel />);

      const toggle = screen.getByRole('switch', { name: /enable sound effects/i });
      fireEvent.click(toggle);

      expect(useAudioStore.getState().sfxEnabled).toBe(false);
    });

    it('shows effects volume slider when SFX is enabled', () => {
      useAudioStore.setState({ enabled: true, sfxEnabled: true });
      render(<AudioSettingsPanel />);

      expect(screen.getByText('Effects Volume')).toBeInTheDocument();
    });

    it('shows test SFX button when SFX is enabled', () => {
      useAudioStore.setState({ enabled: true, sfxEnabled: true });
      render(<AudioSettingsPanel />);

      expect(screen.getByRole('button', { name: /test sound effect/i })).toBeInTheDocument();
    });
  });

  describe('close button', () => {
    it('calls onClose when clicked', () => {
      const onClose = vi.fn();
      render(<AudioSettingsPanel onClose={onClose} />);

      const closeButton = screen.getByLabelText('Close settings');
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('disabled states', () => {
    it('disables TTS toggle when master audio is disabled', () => {
      useAudioStore.setState({ enabled: false });
      render(<AudioSettingsPanel />);

      const ttsToggle = screen.getByRole('switch', { name: /enable tts/i });
      expect(ttsToggle).toBeDisabled();
    });

    it('disables SFX toggle when master audio is disabled', () => {
      useAudioStore.setState({ enabled: false });
      render(<AudioSettingsPanel />);

      const sfxToggle = screen.getByRole('switch', { name: /enable sound effects/i });
      expect(sfxToggle).toBeDisabled();
    });
  });
});
