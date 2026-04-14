import { test, expect } from '../fixtures/base';
import { HomePage } from '../pages/home.page';
import { createSettingsStorage } from '../fixtures/test-data/settings';

// Inject settings so the app doesn't hit missing-config guards
const SETTINGS_STORAGE = createSettingsStorage();

test.describe('Home → Generation', () => {
  test.beforeEach(async ({ page, mockApi }) => {
    await page.addInitScript((settings) => {
      localStorage.setItem('settings-storage', settings);
    }, SETTINGS_STORAGE);

    // Mock syllabus generation so submit works without a real LLM
    await mockApi.mockGenerateSyllabus();
  });

  test('home page loads with core UI elements and submits requirement', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    // Core elements visible
    await expect(home.logo).toBeVisible();
    await expect(home.textarea).toBeVisible();
    await expect(home.enterButton).toBeDisabled();

    // Type requirement → button activates
    await home.fillRequirement('讲解光合作用');
    await expect(home.enterButton).toBeEnabled();

    // Submit → syllabus editor opens (new syllabus-first flow)
    await home.submit();
    const generateCourseBtn = page.getByRole('button', { name: /generate course/i });
    await expect(generateCourseBtn).toBeVisible({ timeout: 10_000 });

    // Click "Generate Course" → navigate to generation-preview
    await generateCourseBtn.click();
    await page.waitForURL(/\/generation-preview/);
    expect(page.url()).toContain('/generation-preview');
  });
});
