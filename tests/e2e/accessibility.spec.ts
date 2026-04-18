import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PUBLIC_ROUTES = ['/', '/apartamentos', '/contacto', '/faq'];

test.describe('Accesibilidad WCAG 2.1 AA', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route} — sin violaciones críticas`, async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState('networkidle').catch(() => {});

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      // Solo fallamos en violaciones con impact "critical" para no bloquear por issues menores
      const critical = results.violations.filter(v => v.impact === 'critical');

      if (critical.length > 0) {
        console.error(
          `[axe] Violaciones críticas en ${route}:\n` +
          critical.map(v => `  • ${v.id}: ${v.description} (${v.nodes.length} nodo/s)`).join('\n')
        );
      }

      expect(critical, `Violaciones críticas de accesibilidad en ${route}`).toHaveLength(0);
    });
  }
});
