'use client';

import { useId, useState, useEffect, useCallback } from 'react';
import { useGameStore } from '@/stores/game-store';
import { useAudioStore } from '@/stores/audio-store';
import { useToast } from "@joolie-boolie/ui";
import { patternRegistry } from '@/lib/game/patterns';
import type { BingoTemplate } from '@joolie-boolie/database/types';
import type { VoicePackId } from '@/types';

export interface TemplateSelectorProps {
  disabled?: boolean;
}

export function TemplateSelector({ disabled = false }: TemplateSelectorProps) {
  const id = useId();
  const { success, error: errorToast } = useToast();

  // Store actions
  const setPattern = useGameStore((state) => state.setPattern);
  const setAutoCallEnabled = useGameStore((state) => state.toggleAutoCall);
  const setAutoCallSpeed = useGameStore((state) => state.setAutoCallSpeed);
  const autoCallEnabled = useGameStore((s) => s.autoCallEnabled);
  const setVoicePack = useAudioStore((state) => state.setVoicePack);

  // Component state
  const [templates, setTemplates] = useState<BingoTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch templates on mount
  useEffect(() => {
    const fetchTemplates = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/templates');

        if (!response || !response.ok) {
          // Gracefully handle missing/unavailable template API (BEA-419)
          // Template API may not be available (e.g., no database connection)
          console.warn('Templates unavailable:', response?.status);
          setTemplates([]);
          return;
        }

        const data = await response.json();
        setTemplates(data.data || []);
      } catch (err) {
        console.error('Error fetching templates:', err);
        setError('Failed to load templates');
        // Toast removed - inline error message is sufficient (BEA-347)
      } finally {
        setIsLoading(false);
      }
    };

    fetchTemplates();
  }, [errorToast]);

  // Load template into stores
  const loadTemplate = useCallback(async (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);

    if (!template) {
      errorToast('Template not found');
      return;
    }

    try {
      // 1. Load pattern
      const pattern = patternRegistry.get(template.pattern_id);
      if (!pattern) {
        throw new Error(`Pattern "${template.pattern_id}" not found`);
      }
      setPattern(pattern);

      // 2. Load auto-call settings
      if (template.auto_call_enabled !== autoCallEnabled) {
        setAutoCallEnabled();
      }
      setAutoCallSpeed(template.auto_call_interval / 1000); // Convert milliseconds to seconds

      // 3. Load voice pack
      setVoicePack(template.voice_pack as VoicePackId);

      success(`Loaded template "${template.name}"`);
    } catch (err) {
      console.error('Error loading template:', err);
      errorToast('Failed to apply template settings');
    }
  }, [templates, setPattern, setAutoCallEnabled, setAutoCallSpeed, setVoicePack, autoCallEnabled, success, errorToast]);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value;
    setSelectedTemplateId(templateId);

    if (templateId) {
      await loadTemplate(templateId);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className={`text-lg font-medium ${disabled ? 'opacity-50' : ''}`}
      >
        Load Template
      </label>
      <select
        id={id}
        value={selectedTemplateId}
        onChange={handleChange}
        disabled={disabled || isLoading}
        tabIndex={-1}
        className={`
          min-h-[56px] px-4 py-3
          text-lg rounded-lg
          bg-background border-2 border-border
          focus:outline-none focus:ring-4 focus:ring-primary/50 focus:border-primary
          disabled:opacity-50 disabled:cursor-not-allowed
          cursor-pointer
        `}
      >
        <option value="">
          {isLoading ? 'Loading templates...' : 'Select a template...'}
        </option>
        {templates.map((template) => (
          <option key={template.id} value={template.id}>
            {template.name}{template.is_default ? ' (Default)' : ''}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-base text-destructive" role="alert">
          {error}
        </p>
      )}
      {templates.length === 0 && !isLoading && !error && (
        <p className="text-base text-muted-foreground">
          No saved templates. Save your first template below.
        </p>
      )}
    </div>
  );
}
