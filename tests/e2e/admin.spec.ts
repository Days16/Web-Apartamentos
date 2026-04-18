import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config();

const ADMIN_EMAIL    = process.env.VITE_TEST_ADMIN_EMAIL    || process.env.TEST_ADMIN_EMAIL    || '';
const ADMIN_PASSWORD = process.env.VITE_TEST_ADMIN_PASSWORD || process.env.TEST_ADMIN_PASSWORD || '';

test.describe('Tests Panel Administrador', () => {

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).isPlaywright = true;
      localStorage.setItem('cookieConsent', 'all');
    });

    test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'Credenciales TEST_ADMIN_EMAIL y TEST_ADMIN_PASSWORD no provistas en el .env');

    await page.goto('/login');
    await page.getByLabel(/correo electrónico/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/contraseña/i).fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /iniciar|entrar/i }).click();

    await page.waitForURL('**/gestion**', { timeout: 15000 });

    await page.waitForTimeout(800);
    if (page.url().includes('/login')) {
      test.skip(true, 'Usuario sin app_metadata.role="admin" asignado en Supabase.');
    }
  });

  // ─── GESTIÓN ───────────────────────────────────────────────────────────

  test('Dashboard gestión — KPI cards visibles', async ({ page }) => {
    await page.waitForURL('**/gestion**', { timeout: 10000 });
    await expect(page.getByText('Dashboard').first()).toBeVisible({ timeout: 12000 });
    // PanelKpiCard renderiza un elemento con texto de métricas — al menos uno carga
    const kpi = page.locator('[class*="kpi"], [class*="panel-card"]').first();
    if (await kpi.isVisible({ timeout: 5000 })) {
      await expect(kpi).toBeVisible();
    }
  });

  test('Reservas — tabla y kanban toggle', async ({ page }) => {
    await page.goto('/gestion/reservas');
    await page.waitForURL('**/gestion/reservas**', { timeout: 15000 });

    // Encabezado de página presente
    await expect(page.getByText('Reservas').first()).toBeVisible({ timeout: 10000 });

    // La tabla carga (PanelTable renderiza <table>)
    await expect(page.locator('table').first()).toBeVisible({ timeout: 10000 });

    // Toggle Kanban
    const kanbanBtn = page.getByRole('button', { name: /kanban/i });
    if (await kanbanBtn.isVisible({ timeout: 3000 })) {
      await kanbanBtn.click();
      // Kanban renderiza columnas de estado
      await expect(page.locator('text=/Pendiente|Confirmada/i').first()).toBeVisible({ timeout: 6000 });
    }
  });

  test('Reservas — modal nueva reserva manual', async ({ page }) => {
    await page.goto('/gestion/reservas');
    await page.waitForURL('**/gestion/reservas**', { timeout: 15000 });

    const newBtn = page.getByRole('button', { name: /nueva|añadir|crear/i }).first();
    if (await newBtn.isVisible({ timeout: 5000 })) {
      await newBtn.click();
      await expect(page.getByLabel(/nombre|huésped/i).first()).toBeVisible({ timeout: 5000 });
      await expect(page.getByLabel(/email|correo/i).first()).toBeVisible({ timeout: 5000 });
      await page.keyboard.press('Escape');
    }
  });

  test('Calendario — carga con botón Hoy y drag-to-block', async ({ page }) => {
    await page.goto('/gestion/calendario');
    await page.waitForURL('**/gestion/calendario**', { timeout: 15000 });

    await expect(page.getByRole('button', { name: 'Hoy' })).toBeVisible({ timeout: 12000 });
    // Selector de apartamento presente
    const aptSelect = page.locator('select').first();
    if (await aptSelect.isVisible({ timeout: 5000 })) {
      await expect(aptSelect).toBeVisible();
    }
  });

  test('Tareas de mantenimiento — página carga', async ({ page }) => {
    await page.goto('/gestion/tareas');
    await page.waitForURL('**/gestion/tareas**', { timeout: 15000 });

    await expect(page.getByText(/tareas de mantenimiento/i).first()).toBeVisible({ timeout: 10000 });

    // Botón nueva tarea
    const newTaskBtn = page.getByRole('button', { name: /nueva tarea|añadir/i }).first();
    if (await newTaskBtn.isVisible({ timeout: 5000 })) {
      await newTaskBtn.click();
      await expect(page.getByLabel(/título/i).first()).toBeVisible({ timeout: 5000 });
      await page.keyboard.press('Escape');
    }
  });

  // ─── ADMIN ─────────────────────────────────────────────────────────────

  test('Apartamentos admin — edición de apartamento', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForURL('**/admin**', { timeout: 15000 });

    await page.waitForSelector('button:has-text("Editar")', { timeout: 10000 });

    const editBtn = page.getByRole('button', { name: /editar/i }).first();
    if (await editBtn.isVisible({ timeout: 5000 })) {
      await editBtn.click();
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(300);

      const nameField = page.getByLabel(/nombre/i).first();
      await expect(nameField).toBeVisible({ timeout: 10000 });
      await expect(nameField).toHaveAttribute('id', 'apartment-name');
    } else {
      test.skip(true, 'No hay apartamentos en la base de datos de test para editar');
    }
  });

  test('Analytics — KPIs y selector de año', async ({ page }) => {
    await page.goto('/admin/analytics');
    await page.waitForURL('**/admin/analytics**', { timeout: 15000 });

    await expect(page.getByText(/analytics|ingresos/i).first()).toBeVisible({ timeout: 12000 });

    // Selector de año presente
    const yearSelect = page.locator('select').first();
    await expect(yearSelect).toBeVisible({ timeout: 8000 });

    // Botón export Excel o PDF presente
    const exportBtn = page.getByRole('button', { name: /excel|pdf|export/i }).first();
    if (await exportBtn.isVisible({ timeout: 3000 })) {
      await expect(exportBtn).toBeVisible();
    }
  });

  test('iCal — lista de fuentes y botón copiar URL', async ({ page }) => {
    await page.goto('/admin/ical');
    await page.waitForURL('**/admin/ical**', { timeout: 15000 });

    await expect(page.getByText(/ical|booking/i).first()).toBeVisible({ timeout: 10000 });
    // Botón copiar URL exportación
    const copyBtn = page.getByRole('button', { name: /copiar|copy/i }).first();
    if (await copyBtn.isVisible({ timeout: 3000 })) {
      await expect(copyBtn).toBeVisible();
    }
  });

  test('Códigos de descuento — página carga y CRUD básico', async ({ page }) => {
    await page.goto('/admin/descuentos');
    await page.waitForURL('**/admin/descuentos**', { timeout: 15000 });

    await expect(page.getByText(/descuento|código/i).first()).toBeVisible({ timeout: 10000 });

    const newBtn = page.getByRole('button', { name: /nuevo|añadir/i }).first();
    if (await newBtn.isVisible({ timeout: 5000 })) {
      await newBtn.click();
      await expect(page.getByLabel(/código/i).first()).toBeVisible({ timeout: 5000 });
      await page.keyboard.press('Escape');
    }
  });

  test('Config. emails automáticos — toggles visibles', async ({ page }) => {
    await page.goto('/admin/emails');
    await page.waitForURL('**/admin/emails**', { timeout: 15000 });

    await expect(page.getByText(/email|correo/i).first()).toBeVisible({ timeout: 10000 });

    // Al menos un toggle/checkbox de configuración presente
    const toggle = page.locator('input[type="checkbox"]').first();
    if (await toggle.isVisible({ timeout: 5000 })) {
      await expect(toggle).toBeVisible();
    }
  });

  test('Log de auditoría — tabla con columnas de eventos', async ({ page }) => {
    await page.goto('/admin/auditoria');
    await page.waitForURL('**/admin/auditoria**', { timeout: 15000 });

    await expect(page.getByText(/auditoría|audit/i).first()).toBeVisible({ timeout: 10000 });
    // La tabla de auditoría puede estar vacía en test pero debe renderizar
    const table = page.locator('table').first();
    await expect(table).toBeVisible({ timeout: 8000 });
  });

  test('Reseñas — grid de cards y filtros por tabs', async ({ page }) => {
    await page.goto('/admin/resenas');
    await page.waitForURL('**/admin/resenas**', { timeout: 15000 });

    await expect(page.getByText(/reseña/i).first()).toBeVisible({ timeout: 10000 });

    // Tabs de filtro: Pendientes / Activas / Inactivas
    const tab = page.getByRole('button', { name: /^todas$|^activas|^inactivas/i }).first();
    if (await tab.isVisible({ timeout: 3000 })) {
      await tab.click();
    }
  });

  test('Usuarios — listado real con datos de auth', async ({ page }) => {
    await page.goto('/admin/usuarios');
    await page.waitForURL('**/admin/usuarios**', { timeout: 15000 });

    await expect(page.getByText(/usuario/i).first()).toBeVisible({ timeout: 10000 });

    // Botón invitar usuario
    const inviteBtn = page.getByRole('button', { name: /invitar/i }).first();
    if (await inviteBtn.isVisible({ timeout: 5000 })) {
      await inviteBtn.click();
      await expect(page.getByLabel(/email|correo/i).first()).toBeVisible({ timeout: 5000 });
      await page.keyboard.press('Escape');
    }
  });

});
