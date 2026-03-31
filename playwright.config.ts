import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config(); // Cargar variables de entorno (como los usuarios de test)

export default defineConfig({
  testDir: './tests/e2e',
  // Ejecutar tests concurrentemente
  // Ejecutar tests secuencialmente para evitar bloqueos por login concurrente
  fullyParallel: false,
  // Fallar build en CI si hay test.only
  forbidOnly: !!process.env.CI,
  // Reintentos solo en CI
  retries: process.env.CI ? 1 : 0,
  // Optimizaciones de workers
  // Usamos 2 workers máximo en local para no saturar Supabase con logins simultáneos
  workers: 2,
  /* Reporter usado (HTML) */
  reporter: 'html',
  
  /* Timeout global por test */
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  
  use: {
    /* Base URL central para todos los tests (usando 5173 que es el puerto activo confirmado) */
    baseURL: 'http://localhost:5173',
    /* Forzar idioma español para los tests */
    locale: 'es-ES',
    /* Acción por defecto si no carga */
    navigationTimeout: 15000,
    /* Coleccionar trazabilidad si un test falla el primer intento. */
    trace: 'on-first-retry',
  },

  /* Usamos solo Chromium por velocidad, pero se podrían añadir Safari/Firefox */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Esto levanta tu npm run dev automáticamente antes de correr los tests si no está levantado */
  webServer: {
    command: 'npm run dev -- --port 5173',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
