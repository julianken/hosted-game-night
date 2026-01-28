'use client';

import { useState, useRef, ChangeEvent } from 'react';
import { Avatar } from './Avatar';
import { Button } from '@beak-gaming/ui';

export interface AvatarUploadProps {
  /** Current avatar URL */
  currentAvatarUrl?: string | null;
  /** User's name for fallback initials */
  userName?: string;
  /** Callback when upload succeeds */
  onUploadSuccess?: (url: string) => void;
  /** Callback when upload fails */
  onUploadError?: (error: string) => void;
  /** Callback when avatar is deleted */
  onDelete?: () => void;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * AvatarUpload component for user profile pictures
 *
 * Allows users to upload, preview, and delete avatars.
 * Validates file type (JPEG/PNG/WebP) and size (max 2MB).
 */
export function AvatarUpload({
  currentAvatarUrl,
  userName = '',
  onUploadSuccess,
  onUploadError,
  onDelete,
}: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      onUploadError?.('Please upload a JPEG, PNG, or WebP image');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      onUploadError?.('File size must be less than 2MB');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch('/api/profile/avatar', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload avatar');
      }

      onUploadSuccess?.(data.url);
      setPreviewUrl(null);
    } catch (error) {
      console.error('Avatar upload error:', error);
      onUploadError?.(
        error instanceof Error ? error.message : 'Failed to upload avatar'
      );
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async () => {
    if (!currentAvatarUrl) return;

    setIsUploading(true);
    try {
      const response = await fetch('/api/profile/avatar', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete avatar');
      }

      onDelete?.();
    } catch (error) {
      console.error('Avatar delete error:', error);
      onUploadError?.(
        error instanceof Error ? error.message : 'Failed to delete avatar'
      );
    } finally {
      setIsUploading(false);
    }
  };

  const displayUrl = previewUrl || currentAvatarUrl;

  return (
    <div className="flex items-start gap-6">
      {/* Avatar Preview */}
      <div className="flex-shrink-0">
        <Avatar src={displayUrl} name={userName} size="xl" />
      </div>

      {/* Upload Controls */}
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Profile Picture
        </h3>
        <p className="text-base text-muted-foreground mb-4">
          Upload a photo to personalize your profile. JPEG, PNG, or WebP up to 2MB.
        </p>

        <div className="flex flex-wrap gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            disabled={isUploading}
            className="hidden"
            id="avatar-upload-input"
          />

          <Button
            type="button"
            variant="primary"
            size="lg"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="min-h-[44px]"
          >
            {isUploading ? 'Uploading...' : 'Upload Photo'}
          </Button>

          {currentAvatarUrl && (
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={handleDelete}
              disabled={isUploading}
              className="min-h-[44px]"
            >
              Remove Photo
            </Button>
          )}
        </div>

        {isUploading && (
          <div className="mt-4 flex items-center gap-2 text-base text-muted-foreground">
            <svg
              className="w-5 h-5 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Uploading...</span>
          </div>
        )}
      </div>
    </div>
  );
}
