import { expect, test } from '@playwright/test'

const pesos = (text: string | null) => Number(text?.replace(/[^\d.]/g, ''))

test('a Gates of Olympus spin takes the stake and settles', async ({ page }) => {
  const errors: Error[] = []
  page.on('pageerror', (error) => errors.push(error))

  await page.goto('/play/gates-of-olympus-1000')
  const controls = page.getByRole('region', { name: 'Game controls' })
  const spin = controls.getByRole('button', { name: 'Spin', exact: true })
  await expect(spin).toBeVisible({ timeout: 45_000 })

  const [credit, stake] = [0, 1].map((i) => controls.locator('.wallet .value').nth(i))
  await expect(credit).toHaveText('₱100,000.00')
  await expect(stake).toHaveText('₱5.00')

  await spin.click()
  await expect(spin.locator('.stop')).toBeVisible()
  await expect(credit).not.toHaveText('₱100,000.00')
  await expect(spin.locator('.stop')).toBeHidden({ timeout: 60_000 })

  expect(pesos(await credit.textContent())).toBeGreaterThanOrEqual(99_995)
  expect(errors).toEqual([])
})
