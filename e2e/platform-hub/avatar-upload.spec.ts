import { test, expect } from '../fixtures/auth';

test.describe('Avatar Upload (BEA-322)', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings');
    await authenticatedPage.waitForLoadState('networkidle');
  });

  test('should display avatar upload section', async ({ authenticatedPage: page }) => {
    // Check for Profile Picture heading
    const heading = page.getByRole('heading', { name: 'Profile Picture' });
    await expect(heading).toBeVisible();

    // Check for description
    await expect(
      page.getByText('Upload a photo to personalize your profile')
    ).toBeVisible();

    // Check for Upload Photo button
    const uploadButton = page.getByRole('button', { name: 'Upload Photo' });
    await expect(uploadButton).toBeVisible();
  });

  test('should display avatar placeholder with initials', async ({ authenticatedPage: page }) => {
    // Avatar component should show initials when no image uploaded
    const avatar = page.locator('[class*="rounded-full"]').first();
    await expect(avatar).toBeVisible();

    // Should contain initials (facility name or email initials)
    const initialsText = await avatar.textContent();
    expect(initialsText).toBeTruthy();
    expect(initialsText?.length).toBeGreaterThanOrEqual(1);
  });

  test('should validate file type on upload', async ({ authenticatedPage: page }) => {
    // Try to upload a non-image file (mock with invalid extension)
    const fileInput = page.locator('input[type="file"]');

    // Create a mock file with invalid type
    const buffer = Buffer.from('fake file content');
    await fileInput.setInputFiles({
      name: 'test.txt',
      mimeType: 'text/plain',
      buffer: buffer,
    });

    // Should show error toast
    await expect(
      page.getByText('Please upload a JPEG, PNG, or WebP image')
    ).toBeVisible({ timeout: 3000 });
  });

  test('should validate file size on upload', async ({ authenticatedPage: page }) => {
    const fileInput = page.locator('input[type="file"]');

    // Create a file larger than 2MB
    const largeBuffer = Buffer.alloc(3 * 1024 * 1024); // 3MB
    await fileInput.setInputFiles({
      name: 'large-image.jpg',
      mimeType: 'image/jpeg',
      buffer: largeBuffer,
    });

    // Should show error toast
    await expect(
      page.getByText('File size must be less than 2MB')
    ).toBeVisible({ timeout: 3000 });
  });

  test('should upload valid image file', async ({ authenticatedPage: page }) => {
    const fileInput = page.locator('input[type="file"]');

    // Create a small valid JPEG file
    const validBuffer = Buffer.from('fake jpeg data');
    await fileInput.setInputFiles({
      name: 'avatar.jpg',
      mimeType: 'image/jpeg',
      buffer: validBuffer,
    });

    // In E2E mode, API returns mock success
    // Wait for success toast
    await expect(
      page.getByText('Avatar uploaded successfully')
    ).toBeVisible({ timeout: 5000 });
  });

  test('should show Remove Photo button after upload', async ({ authenticatedPage: page }) => {
    const fileInput = page.locator('input[type="file"]');

    // Upload a valid image
    const validBuffer = Buffer.from('fake jpeg data');
    await fileInput.setInputFiles({
      name: 'avatar.jpg',
      mimeType: 'image/jpeg',
      buffer: validBuffer,
    });

    // Wait for upload success
    await expect(
      page.getByText('Avatar uploaded successfully')
    ).toBeVisible({ timeout: 5000 });

    // Remove Photo button should be visible
    const removeButton = page.getByRole('button', { name: 'Remove Photo' });
    await expect(removeButton).toBeVisible();
  });

  test('should remove avatar when clicking Remove Photo', async ({ authenticatedPage: page }) => {
    // First upload an image
    const fileInput = page.locator('input[type="file"]');
    const validBuffer = Buffer.from('fake jpeg data');
    await fileInput.setInputFiles({
      name: 'avatar.jpg',
      mimeType: 'image/jpeg',
      buffer: validBuffer,
    });

    // Wait for upload success
    await expect(
      page.getByText('Avatar uploaded successfully')
    ).toBeVisible({ timeout: 5000 });

    // Click Remove Photo
    const removeButton = page.getByRole('button', { name: 'Remove Photo' });
    await removeButton.click();

    // Should show success toast
    await expect(
      page.getByText('Avatar removed successfully')
    ).toBeVisible({ timeout: 3000 });
  });

  test('should have accessible upload button (44x44px minimum)', async ({
    page,
  }) => {
    const uploadButton = page.getByRole('button', { name: 'Upload Photo' });
    const box = await uploadButton.boundingBox();

    expect(box).toBeTruthy();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.width).toBeGreaterThanOrEqual(44);
  });

  test('should disable buttons during upload', async ({ authenticatedPage: page }) => {
    const uploadButton = page.getByRole('button', { name: 'Upload Photo' });

    // Initially enabled
    await expect(uploadButton).toBeEnabled();

    // Start upload
    const fileInput = page.locator('input[type="file"]');
    const validBuffer = Buffer.from('fake jpeg data');
    await fileInput.setInputFiles({
      name: 'avatar.jpg',
      mimeType: 'image/jpeg',
      buffer: validBuffer,
    });

    // Button should show "Uploading..." during upload
    const uploadingButton = page.getByRole('button', { name: 'Uploading...' });
    await expect(uploadingButton).toBeVisible({ timeout: 1000 });
    await expect(uploadingButton).toBeDisabled();
  });
});
