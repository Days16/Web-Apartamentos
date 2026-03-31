import { test, expect } from '@playwright/test';

test.describe('Tests Cara Pública - Illa Pancha', () => {

  test.beforeEach(async ({ page }) => {
    // Inyectar bandera para saltar captchas en Turnstile.tsx
    await page.addInitScript(() => {
      (window as any).isPlaywright = true;
    });
  });

  test('Home carga correctamente y verifica apartados principales', async ({ page }) => {
    await page.goto('/');
    
    // Validar el título del navegador
    await expect(page).toHaveTitle(/Inicio | Illa Pancha/i);
    
    // Validar que el botón de búsqueda central existe
    const searchBtn = page.locator('text=/Buscar apartamentos/i').first(); 
    await expect(searchBtn).toBeVisible({ timeout: 15000 });
  });

  test('Detalle de un alojamiento particular carga bien', async ({ page }) => {
    // Escogemos un slug genérico que deberías tener (ej: el-faro, o illa-pancha)
    // Usamos el listado público primero por si el nombre cambia
    await page.goto('/apartamentos');
    const firstApartment = page.locator('a[href^="/apartamentos/"]').first();
    
    // Si hay apartamentos, entra a ver el detalle
    if (await firstApartment.isVisible()) {
      await firstApartment.click();
      // El botón real dice "Reservar" en la sección de disponibilidad
      await expect(page.getByRole('button', { name: 'Reservar', exact: true }).first()).toBeVisible({ timeout: 10000 });
    } else {
      console.log('No hay apartamentos activos generados en test, saltando visita individual.');
    }
  });

  test('Módulo de enviar formulario de Contacto', async ({ page }) => {
    await page.goto('/contacto');
    await expect(page.locator('form')).toBeVisible();

    // Rellenamos el form (Labels reales en la web con *)
    await page.getByLabel(/nombre \*/i).fill('Robot E2E');
    await page.getByLabel(/email \*/i).fill('robot@illapancha.test');
    await page.getByLabel(/mensaje \*/i).fill('Prueba automática lanzada desde la suite de Playwright.');

    // IMPORTANTE: Interceptamos la llamada de red hacia Supabase Functions
    await page.route('**/functions/v1/submit-contact', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: "Mocked interceptado" })
      });
    });

    await page.locator('button:has-text("Enviar")').first().click();
    
    // Debería aparecer un toast o mensaje indicando éxito
    await expect(page.locator('text=/enviado|éxito|success/i').first()).toBeVisible();
  });

  test('Flujo de Reserva Simulado (Steps Checkout)', async ({ page }) => {
    // En vez de lidiar con el click de los calendarios, inyectamos la orden
    // por URL como lo haría el panel de precios dinámicos (Deep linking)
    await page.goto('/reserva/el-faro?checkin=2026-05-10&checkout=2026-05-15&guests=2');

    // Comprobar que entramos en la pasarela, buscar palabras típicas
    const resumeHeading = page.locator('text=/paso 1|detalles|resumen de reserva/i').first();
    if (await resumeHeading.isVisible()) {
      await page.locator('button:has-text("Siguiente")').first().click();

      // Completar Formulario Huesped
      await page.getByLabel(/nombre completo/i).fill('Tester E2E');
      await page.getByLabel(/email/i).fill('tester@example.com');
      await page.getByLabel(/teléfono/i).fill('+34600000000');
      
      await page.locator('button:has-text("Siguiente")').first().click();
      
      // En este punto llegamos al pago (y vemos condiciones).
      // Nos frenamos aquí para no ensuciar logs de Stripe ni crear intención real de pago.
      await expect(page.locator('text=/tarjeta|pago|condiciones/i').first()).toBeVisible();
    }
  });

});
