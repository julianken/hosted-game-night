import { test, expect } from '@playwright/test';
import { waitForHydration } from '../utils/helpers';

test.describe('Question Set Editor Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/question-sets');
    await waitForHydration(page);
  });

  test('displays question editor modal when Create Question Set is clicked', async ({ page }) => {
    // Click create button
    const createButton = page.getByRole('button', { name: /create question set/i });
    await createButton.click();

    // Modal should appear
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog').getByText(/create question set/i)).toBeVisible();
  });

  test('can create a new question set with 2 rounds and 3 questions total', async ({ page }) => {
    // Open modal
    await page.getByRole('button', { name: /create question set/i }).click();

    // Fill in question set name
    const nameInput = page.getByLabel(/question set name/i);
    await nameInput.fill('E2E Test Set');

    // Add description
    const descriptionInput = page.getByLabel(/description/i);
    await descriptionInput.fill('A test question set created via E2E test');

    // Add first category (Science)
    const scienceButton = page.getByRole('button', { name: /\+ science/i });
    await scienceButton.click();

    // Expand Science category (should be auto-expanded)
    await expect(page.getByText(/science \(0 questions\)/i)).toBeVisible();

    // Add first question to Science
    const addQuestionButtons = page.getByRole('button', { name: /\+ add question/i });
    await addQuestionButtons.first().click();

    // Fill first question
    const questionInputs = page.getByLabel(/question text/i);
    await questionInputs.first().fill('What is H2O?');

    // Fill options for first question
    const optionInputs = page.locator('input[placeholder*="Option"]');
    await optionInputs.nth(0).fill('Water');
    await optionInputs.nth(1).fill('Carbon Dioxide');
    await optionInputs.nth(2).fill('Oxygen');
    await optionInputs.nth(3).fill('Hydrogen');

    // Select correct answer (first radio button for first option)
    const radioButtons = page.locator('input[type="radio"]');
    await radioButtons.nth(0).check();

    // Add second question to Science
    await addQuestionButtons.first().click();

    // Fill second question
    await questionInputs.nth(1).fill('What is the speed of light?');
    await optionInputs.nth(4).fill('299,792 km/s');
    await optionInputs.nth(5).fill('150,000 km/s');
    await optionInputs.nth(6).fill('400,000 km/s');
    await optionInputs.nth(7).fill('200,000 km/s');

    // Select correct answer for second question
    await radioButtons.nth(4).check();

    // Add second category (History)
    const historyButton = page.getByRole('button', { name: /\+ history/i });
    await historyButton.click();

    // Add question to History
    await addQuestionButtons.nth(1).click();

    // Fill third question
    await questionInputs.nth(2).fill('When did World War 2 end?');
    await optionInputs.nth(8).fill('1945');
    await optionInputs.nth(9).fill('1944');
    await optionInputs.nth(10).fill('1946');
    await optionInputs.nth(11).fill('1943');

    // Select correct answer for third question
    await radioButtons.nth(8).check();

    // Verify summary
    await expect(page.getByText(/categories:\s*2/i)).toBeVisible();
    await expect(page.getByText(/total questions:\s*3/i)).toBeVisible();

    // Save the question set
    const saveButton = page.getByRole('button', { name: /^save$/i });
    await saveButton.click();

    // Wait for success message
    await expect(page.getByText(/question set "e2e test set" created successfully/i)).toBeVisible();

    // Modal should close
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Question set should appear in the list
    await expect(page.getByText('E2E Test Set')).toBeVisible();
    await expect(page.getByText(/3 questions/i)).toBeVisible();
  });

  test('can edit existing question set and modify a question', async ({ page }) => {
    // First, ensure we have a question set to edit
    // We'll use the one created in the previous test, but let's create a fresh one
    await page.getByRole('button', { name: /create question set/i }).click();

    const nameInput = page.getByLabel(/question set name/i);
    await nameInput.fill('Edit Test Set');

    // Add Science category with one question
    const scienceButton = page.getByRole('button', { name: /\+ science/i });
    await scienceButton.click();

    const addQuestionButtons = page.getByRole('button', { name: /\+ add question/i });
    await addQuestionButtons.first().click();

    const questionInputs = page.getByLabel(/question text/i);
    await questionInputs.first().fill('Original Question');

    const optionInputs = page.locator('input[placeholder*="Option"]');
    await optionInputs.nth(0).fill('Option A');
    await optionInputs.nth(1).fill('Option B');
    await optionInputs.nth(2).fill('Option C');
    await optionInputs.nth(3).fill('Option D');

    const radioButtons = page.locator('input[type="radio"]');
    await radioButtons.nth(0).check();

    // Save
    await page.getByRole('button', { name: /^save$/i }).click();
    await expect(page.getByText(/question set "edit test set" created successfully/i)).toBeVisible();

    // Wait for modal to close and page to refresh
    await page.waitForTimeout(1000);

    // Now edit the question set
    const editButtons = page.getByRole('button', { name: /^edit$/i });
    await editButtons.first().click();

    // Modal should open with "Edit Question Set" title
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog').getByText(/edit question set/i)).toBeVisible();

    // Wait for data to load
    await page.waitForTimeout(1000);

    // Verify the data is loaded
    await expect(page.getByLabel(/question set name/i)).toHaveValue('Edit Test Set');

    // Modify the name
    await page.getByLabel(/question set name/i).fill('Edit Test Set - Modified');

    // Expand the Science category if not already expanded
    const scienceCategory = page.getByText(/science \(\d+ questions\)/i);
    await scienceCategory.click();

    // Modify the question text
    const modifiedQuestionInput = page.getByLabel(/question text/i).first();
    await modifiedQuestionInput.clear();
    await modifiedQuestionInput.fill('Modified Question Text');

    // Modify one option
    const modifiedOptionInputs = page.locator('input[placeholder*="Option"]');
    await modifiedOptionInputs.nth(0).clear();
    await modifiedOptionInputs.nth(0).fill('Modified Option A');

    // Save the changes
    await page.getByRole('button', { name: /^save$/i }).click();

    // Verify success message
    await expect(page.getByText(/question set "edit test set - modified" updated successfully/i)).toBeVisible();

    // Modal should close
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Verify the modified name appears in the list
    await expect(page.getByText('Edit Test Set - Modified')).toBeVisible();
  });

  test('validates required fields when creating', async ({ page }) => {
    // Open modal
    await page.getByRole('button', { name: /create question set/i }).click();

    // Try to save without filling anything
    await page.getByRole('button', { name: /^save$/i }).click();

    // Should show validation error for name
    await expect(page.getByText(/question set name is required/i)).toBeVisible();

    // Fill name but no categories
    await page.getByLabel(/question set name/i).fill('Test');
    await page.getByRole('button', { name: /^save$/i }).click();

    // Should show validation error for categories
    await expect(page.getByText(/at least one category is required/i)).toBeVisible();

    // Add category but no questions
    await page.getByRole('button', { name: /\+ science/i }).click();
    await page.getByRole('button', { name: /^save$/i }).click();

    // Should show validation error for questions
    await expect(page.getByText(/at least one question is required/i)).toBeVisible();
  });

  test('can remove a category', async ({ page }) => {
    // Open modal
    await page.getByRole('button', { name: /create question set/i }).click();
    await page.getByLabel(/question set name/i).fill('Test Set');

    // Add two categories
    await page.getByRole('button', { name: /\+ science/i }).click();
    await page.getByRole('button', { name: /\+ history/i }).click();

    // Should show both categories
    await expect(page.getByText(/science \(0 questions\)/i)).toBeVisible();
    await expect(page.getByText(/history \(0 questions\)/i)).toBeVisible();

    // Remove Science category
    const removeButtons = page.getByRole('button', { name: /remove/i });
    await removeButtons.first().click();

    // Science should be gone, History should remain
    await expect(page.getByText(/science \(0 questions\)/i)).not.toBeVisible();
    await expect(page.getByText(/history \(0 questions\)/i)).toBeVisible();
  });

  test('cancel button closes modal without saving', async ({ page }) => {
    // Open modal
    await page.getByRole('button', { name: /create question set/i }).click();

    // Fill some data
    await page.getByLabel(/question set name/i).fill('Should Not Save');
    await page.getByRole('button', { name: /\+ science/i }).click();

    // Click cancel
    await page.getByRole('button', { name: /cancel/i }).click();

    // Modal should close
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Question set should not appear in the list
    await expect(page.getByText('Should Not Save')).not.toBeVisible();
  });
});
