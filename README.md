# Illa Pancha — Web de Reservas Directas

Aplicación web completa para gestión y reserva directa de apartamentos turísticos en Ribadeo (Galicia). Stack moderno con React 18 + TypeScript, Supabase y Stripe.

---

## Stack

- **Frontend:** React 18 + TypeScript + Vite 6
- **Backend / DB:** Supabase (PostgreSQL + RLS + 14 Edge Functions + Auth)
- **Pagos:** Stripe (PaymentIntents API)
- **Email:** Resend
- **Tests E2E:** Playwright (Chromium)
- **Tests unitarios:** Vitest
- **Estilos:** Tailwind CSS + CSS vanilla (`src/index.css`)
- **Internacionalización:** 5 idiomas (ES / EN / FR / DE / PT)

---

## Inicio rápido

```bash
npm install
cp .env.example .env   # Rellenar las variables
npm run dev            # http://localhost:5173
```

---

## Variables de entorno

| Variable | Descripción |
|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clave anon pública de Supabase |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Clave pública de Stripe |
| `VITE_OG_IMAGE_URL` | URL absoluta para Open Graph (og:image) |
| `TEST_ADMIN_EMAIL` | Email admin para tests E2E |
| `TEST_ADMIN_PASSWORD` | Contraseña admin para tests E2E |
| `TEST_MANAGER_EMAIL` | Email gestor para tests E2E |
| `TEST_MANAGER_PASSWORD` | Contraseña gestor para tests E2E |

---

## Comandos

```bash
npm run dev          # Servidor local (Vite)
npm run build        # Genera sitemap + build de producción en /dist
npm run typecheck    # Comprueba TypeScript sin emitir (tsc --noEmit)
npm run test:unit    # Tests unitarios con Vitest
npm run test:e2e     # Tests E2E con Playwright (requiere dev activo)
npx supabase functions serve          # Sirve Edge Functions localmente
npx supabase functions deploy <name>  # Despliega una Edge Function
```

---

## Estructura del proyecto

```
src/
  App.tsx                  # Rutas React Router (lazy loading páginas secundarias)
  types.ts                 # Tipos globales: Apartment, Booking, DbReservation…
  index.css                # TODO el CSS + media queries (único archivo de estilos)
  components/
    BookingWidget.tsx      # Widget de reserva (fechas, extras, precio)
    BookingModal.tsx       # Modal reserva 4 pasos + anti-doble-booking
    MiniCalendar.tsx       # Calendario de disponibilidad interactivo
    Navbar.tsx             # Nav responsive + dark mode toggle
    SEO.tsx                # Meta tags, Open Graph, hreflang, JSON-LD
    ProtectedRoute.tsx     # Guards de ruta por rol (admin / gestion)
  contexts/
    LangContext.tsx         # Idioma activo (ES/EN/FR/DE/PT)
    ThemeContext.tsx        # Dark mode (localStorage + prefers-color-scheme)
    AuthContext.tsx         # Sesión Supabase
  pages/
    Home.tsx               # Hero, buscador, grid, reseñas, banner
    Apartments.tsx         # Listado con buscador de disponibilidad
    ApartmentDetail.tsx    # Detalle + widget reserva + amenidades multi-lang
    ReservaConfirmada.tsx  # Confirmación con polling (5 reintentos × 1,5 s)
    admin/                 # Panel privado (/admin/*) — solo rol admin
    gestion/               # Panel gestión (/gestion/*) — rol admin o gestion
  i18n/
    translations.ts        # Hook useT(lang) — acceso tipado a los 5 JSON
    locales/
      es.json / en.json / fr.json / de.json / pt.json
  utils/
    pricing.ts             # calculateBookingPrice() — función pura, testeable
    format.ts / analytics.ts / generateInvoice.ts
  services/
    dataService.ts         # Normalización camelCase ↔ snake_case
    supabaseService.ts     # Llamadas Supabase tipadas
supabase/functions/        # 14 Edge Functions Deno
tests/
  unit/pricing.test.ts     # Vitest — 9 casos de cálculo de precios
  e2e/public.spec.ts       # Playwright — flujos públicos (home, reserva, contacto)
  e2e/admin.spec.ts        # Playwright — panel admin (requiere TEST_ADMIN_*)
  e2e/gestion.spec.ts      # Playwright — panel gestión (requiere TEST_MANAGER_*)
  e2e/accessibility.spec.ts # axe-core WCAG 2.1 AA (falla en violaciones critical)
scripts/
  generate-sitemap.js      # Genera public/sitemap.xml y public/robots.txt
```

---

## Edge Functions

| Función | Descripción |
|---|---|
| `process-payment` | Crea PaymentIntent en Stripe e inserta reserva |
| `sync-ical` | Sincroniza calendarios iCal externos (Booking, Airbnb) |
| `dynamic-pricing` | Reglas de precios por temporada / ocupación |
| `send-reservation-email` | Email de confirmación al huésped |
| `send-owner-notification` | Notificación al propietario por nueva reserva |
| `send-checkin-reminder` | Recordatorio check-in (disparado por pg_cron) |
| `send-checkin-info` | Instrucciones de acceso al apartamento |
| `send-contact-reply` | Respuesta a formulario de contacto |
| `submit-contact` | Recibe y guarda mensajes del formulario |
| `post-stay-review` | Solicita reseña post-estancia automáticamente |
| `monthly-report` | Informe mensual al propietario |
| `auto-translate` | Traducciones automáticas via DeepL |
| `export-ical` | Exporta reservas como calendario iCal |
| `drive-export` | Exporta datos a Google Drive |

---

## Flujo de reserva

```
BookingWidget (fechas + extras)
  → BookingModal (datos huésped + términos)
    → Verificación disponibilidad en Supabase (previene doble reserva)
      → Edge Function process-payment
        → Stripe PaymentIntent
          → Webhook → insert reservations
            → ReservaConfirmada (polling hasta 5 reintentos × 1,5 s)
```

SessionStorage guarda borrador (`booking_draft_<slug>`) por si se cierra el modal accidentalmente.

---

## Autenticación y roles

| Ruta | Rol necesario |
|---|---|
| `/admin/*` | `admin` |
| `/gestion/*` | `admin` o `gestion` |
| Resto | público |

`ProtectedRoute` lee `user.app_metadata.role`. Sin rol asignado = rebota a `/login` aunque las credenciales sean correctas.

**Asignar rol** en Supabase SQL Editor:
```sql
UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'),
  '{role}',
  '"admin"'
)
WHERE email = 'tu@email.com';
```

---

## Internacionalización

5 idiomas completos: **ES · EN · FR · DE · PT**

- Archivos: `src/i18n/locales/{es,en,fr,de,pt}.json`
- Hook: `const T = useT(lang)` — acceso tipado
- Formato fecha: `dd/MM/yyyy` para ES/FR/DE/PT · `MM/dd/yyyy` para EN
- Al añadir texto: actualizar los **5 archivos JSON** obligatoriamente

---

## Base de datos — notas importantes

- Campo slug en tabla `reservations`: **`apt_slug`** (no `apartment_slug`)
- Extensiones necesarias: **`pg_cron`** + **`pg_net`** (sin pg_net los crons fallan silenciosamente)
- `review_email_log`: RLS activo sin políticas = solo service role (correcto, no añadir políticas)
- Cron iCal: job `sync-ical-hourly` → `0 * * * *` → llama a la Edge Function `sync-ical`

---

## Tests

```bash
npm run test:unit                              # Vitest (no requiere servidor)
npm run test:e2e                               # Playwright completo
npx playwright test tests/e2e/accessibility.spec.ts  # Solo accesibilidad
```

Los tests de admin/gestion hacen **skip automático** si no hay credenciales en `.env`.
Los usuarios de test deben tener `app_metadata.role` asignado en Supabase.

---

## Despliegue

**Frontend**: Netlify
- Build command: `npm run build`
- Publish directory: `dist`

**Edge Functions**:
```bash
npx supabase functions deploy process-payment
npx supabase functions deploy sync-ical
# etc.
```

---

## Licencia

Proyecto privado de **Illa Pancha – Ribadeo**. Prohibida su distribución sin consentimiento.
