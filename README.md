# Apartamentos Illa Pancha — Web de Reserva Directa

Sitio web de reserva directa para apartamentos turísticos en Ribadeo (Galicia).

**Stack:** React 18 + TypeScript + Vite · Supabase · Stripe · Netlify

---

## Inicio rápido

```bash
npm install
cp .env.example .env   # rellenar con claves de Supabase y Stripe
npm run dev
```

## Comandos principales

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor local (Vite, puerto 5173) |
| `npm run build` | Genera sitemap + build de producción |
| `npm run typecheck` | Comprobación de tipos TypeScript |
| `npm run test:unit` | Tests unitarios (Vitest) |
| `npm run test:e2e` | Tests E2E (Playwright) |

## Variables de entorno (`.env`)

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_STRIPE_PUBLISHABLE_KEY=
VITE_TURNSTILE_SITE_KEY=
```

## Estructura principal

```
src/
  components/   # BookingWidget, BookingModal, Navbar, CheckInForm, …
  pages/        # Públicas + admin (/admin/*) + gestión (/gestion/*)
  contexts/     # Lang, Theme, Auth, Currency, Discount, Settings, Toast
  utils/        # pricing, format, generateInvoice, exportExcel, …
  services/     # supabaseService, dataService, resendService
  i18n/         # 5 idiomas: es / en / fr / de / pt
supabase/
  functions/    # 17 Edge Functions (Deno)
tests/
  unit/         # Vitest — lógica de precios
  e2e/          # Playwright — público, admin, gestión, accesibilidad
```

## Roles de usuario

| Rol | Acceso |
|---|---|
| `admin` | `/admin/*` + `/gestion/*` |
| `gestion` | `/gestion/*` |

Los roles se asignan en Supabase con SQL (`raw_app_meta_data`).

## Idiomas soportados

ES · EN · FR · DE · PT — todas las claves deben estar en los 5 ficheros de `src/i18n/locales/`.

## Licencia

Propietario — todos los derechos reservados.
