# Illa Pancha — Web de Apartamentos Turísticos

Aplicación web completa para la gestión y reserva de apartamentos turísticos en Ribadeo. Incluye web pública bilingüe (ES/EN), panel de administración, panel de gestión de reservas e integración con Supabase y Stripe.

---

## Tecnologías

- **Frontend:** React 18 + Vite 6
- **Base de datos / Backend:** Supabase (PostgreSQL + Edge Functions)
- **Pagos:** Stripe
- **Email:** Resend
- **Estilos:** CSS propio (index.css)
- **Routing:** React Router DOM v7
- **PWA:** vite-plugin-pwa
- **Otros:** jsPDF (facturas), xlsx (exportación Excel), React Datepicker

---

## Estructura del proyecto

```
src/
├── pages/
│   ├── Home.jsx               # Página de inicio
│   ├── Apartments.jsx         # Listado de apartamentos
│   ├── ApartmentDetail.jsx    # Detalle + reserva
│   ├── About.jsx              # Nosotros
│   ├── Contact.jsx            # Contacto
│   ├── Maintenance.jsx        # Pantalla de mantenimiento
│   ├── Login.jsx              # Autenticación
│   ├── admin/                 # Panel de administración
│   │   ├── ApartamentosAdmin.jsx
│   │   ├── Precios.jsx
│   │   ├── OfertasAdmin.jsx
│   │   ├── ExtrasAdmin.jsx
│   │   └── WebTextos.jsx      # CMS de textos e imágenes
│   └── gestion/               # Panel de gestión diaria
│       ├── Dashboard.jsx
│       ├── Reservas.jsx
│       ├── Calendario.jsx
│       └── Mensajes.jsx
├── components/
│   ├── Navbar.jsx
│   ├── Footer.jsx
│   ├── BookingModal.jsx
│   ├── OffersBanner.jsx
│   ├── PreviewBanner.jsx      # Banner de modo vista previa
│   ├── CookieBanner.jsx
│   └── WhatsAppButton.jsx
├── contexts/
│   ├── AuthContext.jsx
│   ├── LangContext.jsx        # Idioma ES/EN
│   └── DiscountContext.jsx
├── services/
│   ├── supabaseService.js     # Todas las operaciones de BD
│   └── resendService.js
├── i18n/                      # Traducciones
└── lib/
    ├── supabase.js
    └── stripe.js
```

---

## Rutas

### Públicas
| Ruta | Descripción |
|------|-------------|
| `/` | Inicio |
| `/apartamentos` | Listado de apartamentos |
| `/apartamentos/:slug` | Detalle y reserva |
| `/nosotros` | Sobre nosotros |
| `/contacto` | Formulario de contacto |
| `/privacidad` | Política de privacidad |
| `/cookies` | Política de cookies |
| `/terminos` | Términos y condiciones |

### Panel de gestión (protegido)
| Ruta | Descripción |
|------|-------------|
| `/gestion` | Dashboard |
| `/gestion/reservas` | Gestión de reservas |
| `/gestion/calendario` | Vista de calendario |
| `/gestion/mensajes` | Mensajes de contacto |

### Panel de administración (protegido)
| Ruta | Descripción |
|------|-------------|
| `/admin` | Gestión de apartamentos |
| `/admin/precios` | Precios y temporadas |
| `/admin/ofertas` | Ofertas y descuentos |
| `/admin/extras` | Servicios adicionales |
| `/admin/web` | Textos e imágenes (CMS) |

---

## Variables de entorno

Crea un archivo `.env` en la raíz del proyecto con:

```env
# Supabase
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key

# Stripe (clave pública)
VITE_STRIPE_PUBLIC_KEY=pk_live_...

# Configuración del sitio
VITE_SITE_URL=https://tudominio.com
VITE_WHATSAPP_PHONE=34XXXXXXXXX
```

Las claves secretas (`STRIPE_SECRET_KEY`, `RESEND_API_KEY`) van en los **Secrets de Supabase**, no en el `.env`.

---

## Base de datos (Supabase)

Tablas principales:

| Tabla | Descripción |
|-------|-------------|
| `apartments` | Apartamentos con descripción bilingüe, precios y comodidades |
| `season_prices` | Precios por temporada por apartamento |
| `apartment_photos` | Fotos de cada apartamento |
| `reservations` | Reservas con estado, pagos y extras |
| `extras` | Servicios adicionales disponibles |
| `offers` | Descuentos por código o porcentaje |
| `messages` | Mensajes del formulario de contacto |
| `site_settings` | Configuración general del sitio (clave-valor) |
| `website_content` | Textos editables del CMS (bilingüe) |
| `site_pages` | Páginas legales editables |

El script SQL completo consolidado está en [`docs/database_schema_completo.sql`](docs/database_schema_completo.sql). Este archivo incluye todas las tablas, vistas, políticas RLS y datos iniciales necesarios para levantar el proyecto desde cero.

---

## Instalación y desarrollo

```bash
# Instalar dependencias
npm install

# Servidor de desarrollo
npm run dev

# Build de producción
npm run build

# Vista previa del build
npm run preview
```

---

## Funcionalidades principales

- **Bilingüe ES/EN** con cambio de idioma en tiempo real
- **Modo mantenimiento** activable desde el panel con vista previa
- **Reservas online** con pago via Stripe (señal o total)
- **Calendario de disponibilidad** por apartamento
- **Sistema de ofertas** con códigos de descuento
- **CMS** para editar textos de la web sin tocar código
- **Emails automáticos** de confirmación via Resend
- **Exportación** de reservas a Excel y facturas PDF
- **PWA** — instalable como app en móvil
- **SEO** con meta tags dinámicos por página

---

## Despliegue

El proyecto incluye `vercel.json` para despliegue en Vercel. También puede desplegarse en Netlify o cualquier hosting estático con soporte para SPAs (configurar redirección de todas las rutas a `index.html`).

---

## Licencia

Proyecto privado — todos los derechos reservados.
