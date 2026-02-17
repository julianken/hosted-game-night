'use client';

import { RoomSetupModal as SharedRoomSetupModal, type RoomSetupModalProps as SharedRoomSetupModalProps } from '@joolie-boolie/ui';
import { TemplateSelector } from './TemplateSelector';

export interface RoomSetupModalProps extends Omit<SharedRoomSetupModalProps, 'gameLabel' | 'children' | 'templateSelectorPosition'> {}

export function RoomSetupModal(props: RoomSetupModalProps) {
  const { isLoading = false } = props;

  return (
    <SharedRoomSetupModal
      {...props}
      gameLabel="trivia"
      templateSelectorPosition="top"
    >
      <TemplateSelector disabled={isLoading} />
    </SharedRoomSetupModal>
  );
}
