import { test, expect } from '@playwright/test'

async function signInAsDemoAdmin(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Sign in to TaskFlow' })).toBeVisible()
  await page.getByRole('button', { name: 'Use demo admin account' }).click()
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(/\/tasks$/)
}

test('signs in with the demo account and opens the task board', async ({ page }) => {
  await signInAsDemoAdmin(page)
  await expect(page.getByRole('heading', { name: 'Tasks', exact: true })).toBeVisible()
  await expect(page.getByRole('main').getByRole('button', { name: 'New task' })).toBeVisible()
})

test('creates a task from the task board', async ({ page }) => {
  await signInAsDemoAdmin(page)

  await page.getByRole('main').getByRole('button', { name: 'New task' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Create a task' })).toBeVisible()

  await dialog.getByPlaceholder('e.g. Finalize the Q3 roadmap').fill('Playwright smoke task')
  await dialog.getByRole('button', { name: 'Create task' }).click()

  await expect(page.getByText('Task created successfully.')).toBeVisible()
  await expect(page.getByRole('cell', { name: /Playwright smoke task/ })).toBeVisible()
})
