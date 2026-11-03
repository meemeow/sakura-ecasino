import { expect, test } from '@playwright/test'

test('the lobby lists the playable games', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Sakura/)
  await expect(page.getByRole('img', { name: 'Gates of Olympus 1000' }).first()).toBeVisible()
})

test('lobby tabs are routes', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Slots' }).click()
  await expect(page).toHaveURL(/\/slots$/)
  await page.getByRole('tab', { name: 'All' }).click()
  await expect(page).toHaveURL(/\/$/)
})

test('a guarded tab sends guests to the login modal', async ({ page }) => {
  await page.goto('/favorites')
  await expect(page).toHaveURL(/\/login\?redirect=\/favorites$/)
  await expect(page.locator('.sakura-auth')).toBeVisible()
})
