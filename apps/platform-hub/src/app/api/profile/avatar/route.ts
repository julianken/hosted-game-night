import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function POST(request: Request) {
  try {
    // Check for E2E auth via custom SSO cookie
    const cookieStore = await cookies();
    const e2eToken = cookieStore.get('beak_access_token');
    const e2eUserId = cookieStore.get('beak_user_id');

    // E2E Testing Mode
    const isE2ETesting =
      process.env.E2E_TESTING === 'true' ||
      (process.env.NODE_ENV !== 'production' && e2eToken && e2eUserId);

    if (isE2ETesting && e2eToken && e2eUserId) {
      console.log('[Avatar Upload API] E2E testing mode: bypassing Supabase');

      return NextResponse.json({
        success: true,
        url: 'https://example.com/avatar.jpg',
        message: 'Avatar uploaded successfully (E2E mode)',
      });
    }

    // Normal flow: Check Supabase authentication
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('avatar') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload JPEG, PNG, or WebP' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size must be less than 2MB' },
        { status: 400 }
      );
    }

    // Derive extension from validated MIME type, not user input (OWASP A03:2021)
    const extensionMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };
    const extension = extensionMap[file.type];
    if (!extension) {
      return NextResponse.json(
        { error: 'Invalid file type' },
        { status: 400 }
      );
    }

    // Generate unique filename: {userId}/{timestamp}.{ext}
    const filename = `${user.id}/${Date.now()}.${extension}`;

    // Fetch current avatar URL BEFORE uploading new one
    const { data: profile } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .single();

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('avatars').getPublicUrl(uploadData.path);

    // Update profile with avatar URL
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id);

    if (updateError) {
      console.error('Profile update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    // Delete old avatar AFTER successful profile update
    if (profile?.avatar_url) {
      const url = new URL(profile.avatar_url);
      const oldPath = url.pathname.split('/avatars/')[1];
      if (oldPath) {
        const { error: deleteError } = await supabase.storage
          .from('avatars')
          .remove([oldPath]);
        // Don't fail the request if cleanup fails (log error instead)
        if (deleteError) {
          console.warn('Failed to delete old avatar:', deleteError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      message: 'Avatar uploaded successfully',
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    // Check for E2E auth via custom SSO cookie
    const cookieStore = await cookies();
    const e2eToken = cookieStore.get('beak_access_token');
    const e2eUserId = cookieStore.get('beak_user_id');

    // E2E Testing Mode
    const isE2ETesting =
      process.env.E2E_TESTING === 'true' ||
      (process.env.NODE_ENV !== 'production' && e2eToken && e2eUserId);

    if (isE2ETesting && e2eToken && e2eUserId) {
      console.log('[Avatar Delete API] E2E testing mode: bypassing Supabase');

      return NextResponse.json({
        success: true,
        message: 'Avatar deleted successfully (E2E mode)',
      });
    }

    // Normal flow: Check Supabase authentication
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current avatar URL
    const { data: profile } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .single();

    // Delete from storage if exists
    if (profile?.avatar_url) {
      // Extract path from URL
      const url = new URL(profile.avatar_url);
      const path = url.pathname.split('/avatars/')[1];

      if (path) {
        await supabase.storage.from('avatars').remove([path]);
      }
    }

    // Update profile to remove avatar URL
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: null })
      .eq('id', user.id);

    if (updateError) {
      console.error('Profile update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Avatar deleted successfully',
    });
  } catch (error) {
    console.error('Avatar delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
