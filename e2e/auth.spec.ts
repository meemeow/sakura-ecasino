import { expect, test } from '@playwright/test'

test('/login opens the auth modal over the lobby', async ({ page }) => {
  await page.goto('/login')
  const modal = page.locator('.sakura-auth')
  await expect(modal).toBeVisible()
  await expect(modal.getByPlaceholder('9171234567')).toBeVisible()
  await expect(page.getByRole('img', { name: 'Gates of Olympus 1000' }).first()).toBeAttached()
})

test('closing the auth modal returns guests to the lobby', async ({ page }) => {
  await page.goto('/login?redirect=/wallet')
  const modal = page.locator('.sakura-auth')
  await expect(modal).toBeVisible()
  await modal.getByRole('button', { name: 'Close' }).click()
  await expect(modal).toBeHidden()
  await expect(page).toHaveURL(/\/$/)
})
