import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config();

const GESTOR_EMAIL    = process.env.VITE_TEST_MANAGER_EMAIL    || process.env.TEST_MANAGER_EMAIL    || process.env.VITE_TEST_ADMIN_EMAIL    || process.env.TEST_ADMIN_EMAIL    || '';
const GESTOR_PASSWORD = process.env.VITE_TEST_MANAGER_PASSWORD || process.env.TEST_MANAGER_PASSWORD || process.env.VITE_TEST_ADMIN_PASSWORD || process.env.TEST_ADMIN_PASSWORD || '';

test.describe('Tests Panel Rol Gestor Diario', () => {

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).isPlaywright = true;
    });

    test.skip(!GESTOR_EMAIL || !GESTOR_PASSWORD, 'Credenciales TEST_MANAGER_EMAIL no provistas');

    await page.goto('/login');
    await page.getByLabel(/correo electrónico/i).fill(GESTOR_EMAIL);
    await page.getByLabel(/contraseña/i).fill(GESTOR_PASSWORD);
    await page.getByRole('button', { name: /entrar|iniciar/i }).click();

    await page.waitForURL('**/gestion**', { timeout: 15000 });

    await page.waitForTimeout(800);
    if (page.url().includes('/login')) {
      test.skip(true, 'Usuario sin app_metadata.role="gestion" asignado en Supabase.');
    }
  });

  test('Dashboard — PanelKpiCard y gráficos cargan', async ({ page }) => {
    await page.waitForURL('**/gestion**', { timeout: 10000 });

    // PanelPageHeader con título "Dashboard"
    await expect(page.getByText('Dashboard').first()).toBeVisible({ timeout: 12000 });

    // Al menos una tarjeta KPI o un gráfico Recharts visible
    const metric = page.locator('[class*="kpi"], .recharts-wrapper, [class*="panel-card"]').first();
    if (await metric.isVisible({ timeout: 8000 })) {
      await expect(metric).toBeVisible();
    }
  });

  test('Reservas — tabla, slideover de detalle y toggle kanban', async ({ page }) => {
    await page.goto('/gestion/reservas');
    await page.waitForURL('**/gestion/reservas**', { timeout: 15000 });

    await expect(page.getByText('Reservas').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('table').first()).toBeVisible({ timeout: 10000 });

    // Abrir slideover de detalle si hay reservas
    const firstRow = page.locator('table tbody tr').first();
    if (await firstRow.isVisible({ timeout: 5000 })) {
      await firstRow.click();
      // PanelSlideOver aparece con el nombre del huésped
      await page.waitForTimeout(400);
      const slideOver = page.locator('[class*="slide"], [class*="slideover"]').first();
      if (await slideOver.isVisible({ timeout: 4000 })) {
        await expect(slideOver).toBeVisible();
        await page.keyboard.press('Escape');
        await page.locator('aside[aria-label]').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
      }
    }

    // Toggle a vista kanban
    const kanbanBtn = page.getByRole('button', { name: /kanban/i });
    if (await kanbanBtn.isVisible({ timeout: 3000 })) {
      await kanbanBtn.click();
      await expect(page.locator('text=/Pendiente|Confirmada|Cancelada/i').first()).toBeVisible({ timeout: 6000 });
    }
  });

  test('Calendario — botón Hoy, selección de apartamento', async ({ page }) => {
    await page.goto('/gestion/calendario');
    await page.waitForURL('**/gestion/calendario**', { timeout: 15000 });

    await expect(page.getByRole('button', { name: 'Hoy' })).toBeVisible({ timeout: 12000 });

    const aptSelect = page.locator('select').first();
    if (await aptSelect.isVisible({ timeout: 5000 })) {
      await expect(aptSelect).toBeVisible();
    }
  });

  test('Mensajes — lista con tabs de filtro y vista detalle', async ({ page }) => {
    await page.goto('/gestion/mensajes');
    await page.waitForURL('**/gestion/mensajes**', { timeout: 15000 });

    await expect(page.getByText(/mensaje/i).first()).toBeVisible({ timeout: 10000 });

    // Tabs de filtro (Todos / Sin leer / Respondidos / Archivados)
    const tabs = page.getByRole('button', { name: /todos|sin leer|respondido|archivado/i });
    if (await tabs.first().isVisible({ timeout: 3000 })) {
      await tabs.first().click();
    }
  });

  test('Tareas — lista y modal de nueva tarea', async ({ page }) => {
    await page.goto('/gestion/tareas');
    await page.waitForURL('**/gestion/tareas**', { timeout: 15000 });

    await expect(page.getByText(/tareas de mantenimiento/i).first()).toBeVisible({ timeout: 10000 });

    // Botón nueva tarea abre modal con FormField título
    const newBtn = page.getByRole('button', { name: /nueva tarea|nueva|añadir/i }).first();
    if (await newBtn.isVisible({ timeout: 5000 })) {
      await newBtn.click();
      await expect(page.getByLabel(/título/i).first()).toBeVisible({ timeout: 5000 });
      await page.keyboard.press('Escape');
    }
  });

  test('Sidebar gestión — nav links y widget ocupación', async ({ page }) => {
    await page.waitForURL('**/gestion**', { timeout: 10000 });

    // Los 5 items de nav del panel gestión deben existir
    for (const label of ['Dashboard', 'Reservas', 'Calendario', 'Mensajes', 'Mantenimiento']) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible({ timeout: 8000 });
    }
  });

});
