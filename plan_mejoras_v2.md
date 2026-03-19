# Plan de Mejoras v2 — Web Apartamentos Illa Pancha
_Generado: 2026-02-27 · Basado en auditoría completa del código_

---

## Estado actual (v0.1.8)

El proyecto tiene la estructura base funcionando: routing, Supabase, Stripe, panel de gestión y admin. Sin embargo quedan muchos issues críticos, páginas con datos mockeados presentados como reales, y problemas de i18n en EN.

---

## CRÍTICO — Funcionalidad rota

| # | Archivo | Problema | Fix |
|---|---------|----------|-----|
| C1 | `Apartments.jsx` | `T.seo.aptsTitle` y `T.seo.aptsDesc` no existen en locale EN → título de página renderiza "undefined \| Illa Pancha" en inglés | Añadir claves a `en.json` |
| C2 | `Apartments.jsx` | `T.detail.perNight` no existe → texto en blanco en cards EN | Corregir nombre de clave (`pricePerNight` → `perNight`) |
| C3 | `Contact.jsx` | WhatsApp href = `34982XXXXXX` → enlace roto en producción | Conectar a `settings.site_phone` igual que hace Footer |
| C4 | `PortalReserva.jsx` | `useState(() => {...}, [])` es uso incorrecto de React — el `[]` se ignora, settings nunca se recargan | Mover a `useEffect` |
| C5 | `Dashboard.jsx` | `w-[${p}%]` — Tailwind no procesa clases interpoladas dinámicamente; las barras de ocupación no tienen ancho | Usar `style={{ width: p + '%' }}` o clases estáticas |
| C6 | `App.jsx` | `/admin/pagos` no tiene ruta definida — `Pagos.jsx` es inaccesible | Añadir ruta en App.jsx |
| C7 | `BookingModal.jsx` | Instrucciones de tarjeta de prueba Stripe (`4242 4242...`) visibles en producción | Condicionar con `import.meta.env.DEV` |
| C8 | `ApartmentDetail.jsx` / `BookingModal.jsx` | `T.detail.depositPct` vs `T.detail.depositNow` — nombre de clave distinto en ES y EN → campo en blanco en EN | Unificar nombre de clave en ambos locales |

---

## ALTO — UX significativamente afectada

| # | Archivo | Problema | Fix |
|---|---------|----------|-----|
| A1 | `Dashboard.jsx` | `Math.random()` en barras de ocupación → números aleatorios cada render | Calcular ocupación real desde reservas |
| A2 | `Dashboard.jsx` | iCal status hardcodeado: "Todo OK", "hace 4 minutos", "en 26 minutos" | Conectar a datos reales o eliminar sección |
| A3 | `About.jsx` | Los 3 cards de "valores" muestran el mismo título y descripción (`A.title` / `A.ctaDesc`) — copy-paste placeholder | Crear claves de traducción dedicadas para cada valor |
| A4 | `Home.jsx` | Fechas iniciales hardcodeadas `2026-07-12` / `2026-07-19` — caducarán | Usar `today + 7` y `today + 14` calculados en `useMemo` |
| A5 | `Home.jsx` | Sección de reseñas no traducida a EN: "Lo que dicen nuestros huéspedes", "Opiniones reales", "4.9 ★..." hardcodeados en español | Usar `T.home.whatGuestsSay`, `T.home.realOpinions`, `T.home.verifiedReviews` |
| A6 | `BookingModal.jsx` | Contador de huéspedes hardcodeado a `2` en la cabecera del panel | Usar el valor real de `guests` del estado |
| A7 | `Sync.jsx` (gestion) | Página completamente mockeada — sync times y nombres de apts hardcodeados, botón "Sincronizar" solo hace `setTimeout` | Conectar a datos reales de iCal o marcarlo claramente como "próximamente" |
| A8 | `Usuarios.jsx` (admin) | Lista de usuarios hardcodeada con 2 usuarios fake; botones no funcionales | Conectar a Supabase Auth admin API |
| A9 | `ApartmentDetail.jsx` | Estado de carga: cuando `loading=true` pero `apt` aún es null, muestra "Apartment not found" brevemente antes de cargar | Añadir rama `if (loading) return <Spinner>` |
| A10 | `BookingModal.jsx` | Step 3 (pantalla de confirmación verde dentro del modal) es código muerto — nunca se alcanza porque hay redirect | Eliminar el JSX del step 3 o re-activarlo |

---

## MEDIO — Inconsistencias y gaps

| # | Archivo | Problema | Fix |
|---|---------|----------|-----|
| M1 | `translations.js` | `common.seeMore` usado en `Apartments.jsx` pero ausente en ambos locales | Añadir a ES y EN |
| M2 | `translations.js` | `booking.extrasSelected` / `booking.extraSelected` usados pero no declarados en ningún locale | Añadir o eliminar su uso |
| M3 | `Dashboard.jsx` / `Reservas.jsx` | Parsers de fecha inconsistentes: uno espera `"DD Ene"` (español), otro espera `"DD Jan"` (inglés). Si Supabase guarda ISO `YYYY-MM-DD`, ambos fallan | Unificar usando `new Date(isoString)` directamente |
| M4 | `Reservas.jsx` | `window.confirm()` para borrar reservas — existe `ConfirmDialog` que no se usa aquí | Usar `ConfirmDialog` |
| M5 | `Reservas.jsx` | Solo filtra por estado; sin búsqueda por apartamento, nombre de huésped ni rango de fechas | Añadir buscador de texto libre + filtro de fechas |
| M6 | `Navbar.jsx` | `aria-controls="mobile-menu"` pero el div target no tiene `id="mobile-menu"` — ARIA rota | Añadir `id="mobile-menu"` al div colapsable |
| M7 | `CookieBanner.jsx` | Todo hardcodeado en español — usuarios EN ven banner de cookies en español | Añadir i18n al banner |
| M8 | `Footer.jsx` | Links de apartamentos hardcodeados (`['Cantábrico', 'Ribadeo'...]`) y todos apuntan a `/apartamentos` | Cargar desde Supabase con slugs reales |
| M9 | `Footer.jsx` | "FAQ" y "Cómo llegar" son `<span>` no funcionales con flechas de enlace | Eliminarlos o crear las páginas |
| M10 | `Footer.jsx` | "Booking.com" y "Airbnb" son `<span>` con `↗` pero sin href | Añadir links reales o eliminar |
| M11 | `WhatsAppButton.jsx` | Mensaje de WhatsApp hardcodeado en español | Pasar mensaje desde `useLang` según idioma |
| M12 | `Calendario.jsx` | Botón "Mostrar" sin `onClick` — no hace nada | Conectar al estado de período o eliminar |
| M13 | `Calendario.jsx` | `daysToShow` fijo en 25 sin control en UI | Añadir selector (15/25/45 días) |
| M14 | `ApartmentDetail.jsx` | `blockReason`, "Fechas no disponibles", "Impuestos y tasas" hardcodeados en español | Usar claves de traducción |
| M15 | `About.jsx` | `description={T.seo.homeDesc}` en SEO — reutiliza descripción de Home | Crear `T.seo.aboutTitle` / `T.seo.aboutDesc` |
| M16 | `Reservas.jsx` | Depósito hardcodeado al 50% en resumen de pago | Leer `depositPct` de settings |
| M17 | `Apartments.jsx` | No hay estado vacío cuando todos los apartamentos son filtrados | Añadir mensaje "No hay apartamentos disponibles con estos filtros" |
| M18 | `Apartments.jsx` | `apt.bedrooms` en cards pero el campo en DB es `apt.beds` | Unificar nombre de campo |

---

## MENOR — Código limpio / deuda técnica

| # | Archivo | Problema |
|---|---------|----------|
| L1 | `Apartments.jsx` lines 55, 63 | `console.warn` / `console.error` en producción |
| L2 | `BookingModal.jsx` lines 60, 207, 239, 250 | `console.log` en producción |
| L3 | `ApartmentDetail.jsx` line 402 | `console.log` en producción |
| L4 | `Dashboard.jsx`, `Reservas.jsx`, `Calendario.jsx` | `console.log` / `console.error` en producción |
| L5 | `Calendario.jsx` | `Math.random()` para IDs de bloqueo — posibles colisiones; usar `crypto.randomUUID()` |
| L6 | `ApartmentDetail.jsx` line 346 | `Promise.all([singleCall])` innecesario — llamada única en array |
| L7 | `Home.jsx` | Doble patrón i18n: mezcla `t('es', 'en')` inline con `T.home.key` — elegir uno |
| L8 | `Calendario.jsx` lines 399-402 | Div vacío con comentario TODO — dead markup |
| L9 | `Navbar.jsx` lines 86-90 | `setTimeout(500)` para scroll a `#experiencias` — frágil |
| L10 | `About.jsx` lines 124, 136 | Clases `animate-in slide-in-from-left` requieren plugin `tailwindcss-animate` — confirmar que está instalado |
| L11 | `App.jsx` | `import PreviewBanner` en medio del archivo en vez de al principio |
| L12 | Múltiples | Fotos de Unsplash genéricas como fallback — reemplazar con fotos reales de los apartamentos |

---

## NUEVAS MEJORAS PROPUESTAS (v2)

### UX / Funcionalidad
| # | Mejora | Prioridad |
|---|--------|-----------|
| N1 | **Mapa real embebido** — Sustituir los 3 placeholders de mapa (Contact, About, ApartmentDetail) por Leaflet + OpenStreetMap (sin API key, gratuito, GDPR-friendly) | Alta |
| N2 | **SEO avanzado** — Añadir Open Graph tags, Twitter Cards, y Schema.org `LodgingBusiness` / `ApartmentComplex` structured data al componente `SEO.jsx` | Alta |
| N3 | **`hreflang` ES/EN** — Añadir `<link rel="alternate" hreflang="es/en">` para SEO multilingual en `index.html` o `SEO.jsx` | Alta |
| N4 | **Galería mejorada en mobile** — El lightbox de fotos en `ApartmentDetail` no tiene swipe gesture en móvil; añadir touch swipe | Media |
| N5 | **Política de cancelación en detalle de apartamento** — Mostrar claramente las condiciones de cancelación (ya existe `Cancelacion.jsx` en admin) | Media |
| N6 | **Página FAQ** — Preguntas frecuentes (check-in/out, parking, mascotas, pagos) — Footer ya tiene el link muerto | Media |
| N7 | **Página "Cómo llegar"** — Link ya existe en Footer como span muerto | Baja |
| N8 | **Reviews con paginación** — `getReviews()` sin filtro trae todas; añadir paginación o `limit` | Baja |
| N9 | **Canonical URL** — `SEO.jsx` no establece URL canónica; añadir `<link rel="canonical">` | Media |
| N10 | **Animaciones de entrada accesibles** — Respetar `prefers-reduced-motion` en las animaciones CSS | Baja |

### Panel de Gestión
| # | Mejora | Prioridad |
|---|--------|-----------|
| N11 | **Dashboard con datos reales** — Calcular KPIs (ocupación, ingresos, reservas próximas) desde Supabase en vez de datos fake/random | Alta |
| N12 | **Sync.jsx real** — Implementar pull de iCal feeds real (ya existe infraestructura en `IcalAdmin.jsx`) | Alta |
| N13 | **Gestión de usuarios real** — Conectar `Usuarios.jsx` a Supabase Auth admin (`listUsers`, `inviteUserByEmail`) | Alta |
| N14 | **Búsqueda y filtros avanzados en Reservas** — Por apartamento, nombre, email, rango de fechas | Media |
| N15 | **Vista de pagos accesible** — Añadir ruta `/admin/pagos` y completar la página `Pagos.jsx` | Media |
| N16 | **Notificaciones en tiempo real** — Usar Supabase Realtime para nuevas reservas y mensajes sin recargar | Baja |

### Performance / Técnico
| # | Mejora | Prioridad |
|---|--------|-----------|
| N17 | **Lazy loading de imágenes** — Añadir `loading="lazy"` y tamaños responsive en `<img>` de Home, Apartments y About | Alta |
| N18 | **Code splitting por ruta** — `React.lazy()` + `Suspense` para páginas de admin y gestion (ahorrar ~40% del bundle inicial) | Media |
| N19 | **Purgar console.logs** — Configurar Vite para eliminar `console.log` en build de producción (`drop: ['console', 'debugger']` en `vite.config.js`) | Media |
| N20 | **PWA básica** — Service Worker + manifest para "Añadir a pantalla de inicio" (mejora experiencia mobile) | Baja |
| N21 | **Variables de entorno** — Auditar que ninguna clave de Supabase/Stripe esté en código fuente; todas deben venir de `import.meta.env` | Alta |

---

## SEGURIDAD (S-series) — Nuevos hallazgos

| # | Archivo | Problema | Fix |
|---|---------|----------|-----|
| S1 | `.env` / Supabase | La anon key de Supabase está en `VITE_` → se embebe en el bundle JS y es visible en DevTools para cualquier usuario. La seguridad depende **exclusivamente** de las políticas RLS de Supabase. Si alguna tabla carece de RLS o está mal configurada, cualquier visitante puede leer/escribir datos | Auditar todas las tablas en Supabase Dashboard → RLS debe estar activo en `apartments`, `reservations`, `messages`, `offers`, `settings`, `extras`, `reviews` |
| S2 | `Contact.jsx:84` | XSS: `form.email` (input del usuario) se inserta raw en `dangerouslySetInnerHTML` sin sanitizar. El resto del código usa `safeHtml()` de `sanitize.js` pero aquí se salta | Reemplazar con `safeHtml(C.sentDesc.replace('{email}', form.email))` |
| S3 | `OfertasAdmin.jsx`, `ConfiguracionGeneral.jsx` | Llamadas directas a Supabase client-side para delete/update en tablas de negocio sin verificación de rol adicional | Asegurarse de que las políticas RLS de `offers` y `apartments` sólo permiten escritura con `auth.role() = 'authenticated'` y que sea el rol correcto |
| S4 | `stripe.js:5` | Si `VITE_STRIPE_PUBLIC_KEY` no está definida en producción, Stripe se inicializa con `'pk_test_placeholder'` sin lanzar error — el flujo de pago falla silenciosamente con mensajes confusos | Cambiar el fallback a `throw new Error('Missing VITE_STRIPE_PUBLIC_KEY')` |

---

## LÓGICA DE NEGOCIO (B-series) — Nuevos hallazgos

| # | Archivo | Problema | Fix |
|---|---------|----------|-----|
| B1 | `PortalReserva.jsx:27-29` | (Relacionado con C4) El bug de `useState` hace que `settings` sea siempre `null` → la política de cancelación mostrada al huésped es siempre el fallback hardcodeado de 14 días, aunque el admin la haya cambiado | Fix ya en C4; confirmar que la política cargada se muestre correctamente |
| B2 | `PortalReserva.jsx:113-123` | La cancelación sólo tiene dos estados (gratis / bloqueada) pero `Terminos.jsx` describe tres tramos: reembolso total, 50% retenido, y 100% retenido. El tramo intermedio nunca se muestra al huésped | Añadir tramo intermedio en `canCancel()` y mostrar mensaje adecuado |
| B3 | `generateInvoice.js:10,118` | **Bug en facturas**: `siteSettings.cleaningFee = 0` → el `\|\| 40` activa y **añade siempre €40 de limpieza** que no se mostraron ni acordaron durante el proceso de reserva en `BookingModal` | Leer el cleaning fee real de `settings` o eliminar la línea si no aplica |
| B4 | `generateInvoice.js:183-184` | **Bug en facturas**: el "resto a pagar a la llegada" muestra de nuevo `deposit` en vez de `total - deposit` → las cifras del PDF son incorrectas | Cambiar a `reservation.total - deposit` |
| B5 | `exportExcel.js:44` | La fila de totales suma `reservation.total` de **todas** las reservas incluyendo canceladas, pero `deposit` sólo suma las confirmadas → totales de ingresos engañosos en el Excel del gestor | Filtrar ambas columnas con el mismo criterio (`status !== 'cancelled'`) |
| B6 | `Reservas.jsx:131-148` | El parser de fechas `"DD MMM"` asigna el año actual a fechas sin año. Reservas de diciembre 2025 en enero 2026 aparecen como 11 meses en el futuro | Usar ISO strings directamente (`new Date(isoString)`) |
| B7 | `ConfiguracionGeneral.jsx:62-68` | Guardar configuración global sobrescribe **todos** los apartamentos con `cancellation_days` y `deposit_percentage` globales, eliminando cualquier override por apartamento. El diálogo de confirmación no advierte de esto | Añadir aviso explícito en `ConfirmDialog` o cambiar la lógica para sólo actualizar apartamentos sin override |
| B8 | `BookingModal.jsx` + `ReglasReserva.jsx` | Las reglas de estancia mínima definidas en el admin **nunca se comprueban** en `BookingModal` → un huésped puede reservar 2 noches en agosto aunque la regla exija 7 | Consultar `min_stay_rules` para el apartamento y rango de fechas elegido antes de permitir confirmar |
| B9 | `BookingModal.jsx:274` | El número de huéspedes está hardcodeado a `2` en el resumen y **no se guarda en la reserva en Supabase** → el propietario nunca sabe cuántas personas esperan, imposibilitando el registro de viajeros obligatorio | Añadir campo `guests` al formulario del modal y guardarlo en la reserva |
| B10 | `OfertasAdmin.jsx` | No existe validación de que sólo haya una oferta global activa (sin código) a la vez → si hay dos, se usa la primera arbitrariamente, ignorando la segunda sin aviso | Advertir en la UI o prevenir la activación de una segunda oferta global |

---

## ACCESIBILIDAD (AC-series) — Nuevos hallazgos

| # | Archivo | Problema | Fix |
|---|---------|----------|-----|
| AC1 | `BookingModal.jsx:257` | El modal no tiene `role="dialog"`, `aria-modal="true"`, ni `aria-label`. No hay focus trap ni gestión del foco al abrir/cerrar. Falla WCAG 2.1 criterios 1.3.1, 2.1.1, 4.1.2 | Añadir atributos ARIA y focus trap (librería `focus-trap-react` o implementación manual) |
| AC2 | `BookingModal.jsx:360-379` | El campo teléfono no tiene `type="tel"` → teclado numérico no aparece en móvil. Ningún campo tiene `autocomplete` | Añadir `type="tel"` y atributos `autocomplete` apropiados |
| AC3 | `BookingModal.jsx:404-409` | El botón "Continuar" se desactiva cuando hay errores pero sin mensaje explicativo → el usuario no sabe qué campo falta. WCAG 3.3.1 | Mostrar texto de error inline debajo de cada campo inválido |
| AC4 | `Footer.jsx:52-55` | El botón de sección colapsable tiene `aria-expanded` pero sin `aria-controls` apuntando al contenido. El div controlado no tiene `id` | Añadir `id` al div colapsable y `aria-controls` al botón |
| AC5 | `Terminos.jsx`, `Privacy.jsx`, `Cookies.jsx`, `ProteccionDatos.jsx` | **Bug visual grave**: todas las páginas legales tienen `<style>` con directivas `@apply` dentro del JSX. `@apply` es PostCSS/build-time y no funciona en `<style>` tags de runtime → las páginas legales se renderizan sin ningún estilo aplicado (texto plano sin formato) | Reemplazar los bloques `<style>` + `@apply` por clases Tailwind directamente en el JSX |
| AC6 | `ReservaConfirmada.jsx:70-154` | La página de confirmación de reserva está completamente en español hardcodeado. Usuarios EN reciben toda la confirmación en español | Usar el objeto `T` (ya importado) para todos los textos |

---

## VALIDACIÓN DE FORMULARIOS (FV-series) — Nuevos hallazgos

| # | Archivo | Problema | Fix |
|---|---------|----------|-----|
| FV1 | `BookingModal.jsx` | Si checkin = checkout, `calculateNights()` devuelve `0` → reserva de 0 noches con `total = 0` → cargo de €0 a Stripe | Validar que `nights >= 1` (y aplicar `min_stay`) antes de habilitar el botón |
| FV2 | `BookingModal.jsx:406` | Email sólo se valida comprobando que contiene `@` → `a@` pasa la validación | Usar regex básico o `type="email"` en el input |
| FV3 | `Contact.jsx:144-155` | El textarea no tiene `maxLength`. No hay rate limiting, CAPTCHA ni honeypot → formulario vulnerable a spam/flood | Añadir `maxLength={2000}`, considerar honeypot field |
| FV4 | `ReglasReserva.jsx:36-51` | No valida que `end_date > start_date` al crear/editar reglas de estancia mínima | Añadir validación antes de `handleSubmit` |

---

## LEGAL / CUMPLIMIENTO (LC-series) — Nuevos hallazgos

| # | Archivo | Problema | Fix |
|---|---------|----------|-----|
| LC1 | `Cookies.jsx:60` | La política de cookies menciona un enlace "Gestionar cookies" en el pie de página que **no existe** en `Footer.jsx` → incumple LSSI Art. 22.2 (el consentimiento debe ser igual de fácil de retirar que de otorgar) | Añadir link "Gestionar cookies" en Footer o en el propio banner |
| LC2 | `CookieBanner.jsx` | (Verificado) El banner existe en el código pero está completamente en español (ver M7). Además solo tiene "Esenciales / Aceptar todas" sin categorías granulares | Añadir i18n y opcionalmente categorías (analytics, marketing) |
| LC3 | `Terminos.jsx:61-62` + `PortalReserva.jsx:113-123` | Las condiciones legales describen 3 tramos de cancelación pero el portal sólo implementa 2 → mostrar términos que no coinciden con el comportamiento real puede ser práctica comercial engañosa (Ley 3/2014) | Implementar el tramo del 50% en `PortalReserva` (ver B2) |
| LC4 | `Terminos.jsx:31-34`, `Privacy.jsx:27` | La entidad figura como "en constitución", NIF y teléfono son placeholders. Art. 10 LSSI exige NIF/CIF y datos reales antes de operar | Completar datos reales antes del lanzamiento |
| LC5 | `generateInvoice.js:202` | El PDF dice explícitamente "No tiene validez como factura fiscal" pero el site cobra IVA. Una vez la entidad esté constituida necesitará emitir facturas simplificadas con base imponible, tipo IVA y NIF separados (RD 1619/2012) | Crear plantilla de factura simplificada fiscal-compliant cuando la entidad esté registrada |

---

## PERFORMANCE / BUILD (PB-series) — Nuevos hallazgos

| # | Archivo | Problema | Fix |
|---|---------|----------|-----|
| PB1 | `vite.config.js` | Sin configuración de build: `jsPDF` (~300KB), `xlsx` (~800KB) y `@stripe/react-stripe-js` se incluyen en el bundle principal. Todo visitante descarga librerías de admin que quizás nunca usa | Añadir `build.rollupOptions.output.manualChunks` para separar vendor chunks |
| PB2 | `Reservas.jsx:5-6` | `generateInvoice` y `exportExcel` se importan estáticamente → `jsPDF` y `xlsx` se cargan al entrar al panel de gestión aunque no se genere nada | Cambiar a `await import(...)` dinámico en los handlers de "Generar PDF" y "Exportar Excel" |
| PB3 | `package.json:6-10` | Sin scripts de `lint`, `test` ni `typecheck`. Sin ESLint, Prettier ni TypeScript → bugs como el XSS (S2), cargos incorrectos en facturas (B3, B4) no tienen detección automatizada | Añadir ESLint + `eslint-plugin-react-hooks` como mínimo |
| PB4 | `index.html` | Sin favicon, sin `<link rel="manifest">`, sin Open Graph, sin `<meta name="theme-color">`. Los crawlers y scrapers sociales que no ejecutan JS ven una página completamente vacía | Añadir favicon, OG tags estáticos base, y manifest.json |

---

## UX / FUNCIONALIDAD (UX-series) — Nuevos hallazgos

| # | Archivo | Problema | Fix |
|---|---------|----------|-----|
| UX1 | `App.jsx:146` | `<Route path="*">` redirige silenciosamente a `/` sin mostrar ningún mensaje → los usuarios con URLs incorrectas o stale no reciben feedback | Crear página `NotFound.jsx` con mensaje y navegación |
| UX2 | `PortalReserva.jsx:179` | El estado `pending` o `cancelled` muestra el valor raw de la DB (`pending`, `cancelled`) en vez de texto traducido | Mapear todos los estados a textos i18n en ES y EN |
| UX3 | `WebTextos.jsx:350-357` | **Bug de pérdida de datos**: los campos `about_hero_title` y `about_hero_desc` se renderizan en el tab "Nosotros" pero no están en el array `KEYS` → `handleSave()` nunca los persiste a Supabase. El admin edita el texto, da a Guardar, y los cambios desaparecen | Añadir `'about_hero_title'` y `'about_hero_desc'` al array `KEYS` |
| UX4 | `ReservaConfirmada.jsx:65-76` | El estado "not found" no actualiza el `<title>` de la página | Añadir `<SEO title="Reserva no encontrada">` en ese estado |
| UX5 | `Reservas.jsx:351-374` | El dropdown "Cambiar estado" es un `<div>` sin `role="menu"`, sin `aria-haspopup`, y sin handler de `Escape` → no es accesible por teclado | Añadir ARIA roles y keyboard handling |

---

## Priorización sugerida por sprints

### Sprint 1 — Bugs críticos + Seguridad (producción rota o datos incorrectos)
**i18n rotos:** C1, C2, C8
**Links rotos:** C3
**React mal uso:** C4
**Tailwind dinámico:** C5
**Ruta faltante:** C6
**Stripe test en prod:** C7
**XSS:** S2
**Facturas incorrectas:** B3, B4
**Pérdida de datos admin:** UX3
**Páginas legales sin estilo:** AC5
**Confirmación reserva sin i18n:** AC6

### Sprint 2 — Seguridad y compliance legal
**RLS Supabase:** S1, S3
**Stripe fallback:** S4
**Cookies LSSI:** LC1, LC2
**Datos legales placeholder:** LC4
**Min-stay no comprobado:** B8
**Guests no guardados en reserva:** B9

### Sprint 3 — UX y lógica de negocio
A1 (dashboard random), A3 (about valores), A4 (fechas home), A5 (reviews i18n), A6 (guest count), A9 (loading state)
B2 (cancelación 3 tramos), B5 (excel totales), B6 (parsers fecha), B7 (config global sobrescribe apts)
FV1 (0 noches), FV2 (email validación), FV3 (spam contact)
UX1 (404 page), UX2 (estados portal), UX5 (dropdown accesible)

### Sprint 4 — SEO y visibilidad
N1 (mapas Leaflet), N2 (OG/Schema.org), N3 (hreflang), N9 (canonical)
PB4 (favicon + OG en index.html), M15 (SEO About)
N17 (lazy loading imágenes)

### Sprint 5 — Panel de gestión completo
N11 (dashboard real), N12 (sync real), N13 (usuarios Supabase Auth)
N14 + M5 (búsqueda reservas), N15 (ruta pagos)
PB1, PB2 (code splitting, imports dinámicos)
B10 (conflicto ofertas globales)

### Sprint 6 — Pulido final
M8 (footer dinámico), M9/M10 (links footer reales), N4 (swipe galería)
N5 (política cancelación en detalle), N6 (FAQ), N7 (cómo llegar)
AC1-AC4 (accesibilidad modal y footer), M6, M7 (ARIA Navbar, CookieBanner i18n)
PB3 (ESLint), L1-L12 (limpieza código), L12 (fotos reales)
LC5 (factura fiscal simplificada)

---

## Estado de lo ya hecho (v0.1.1 – v0.1.8)

- [x] Estructura base: routing, Supabase, Stripe, i18n ES/EN
- [x] Home con buscador de disponibilidad
- [x] Apartments con filtros avanzados
- [x] ApartmentDetail con galería, booking widget, mini-calendario
- [x] Panel admin: apartamentos CRUD, precios, reseñas, extras, iCal, ofertas, textos web
- [x] Panel gestión: reservas, calendario timeline, mensajes, sync (mockup)
- [x] Hamburger menu responsive en Navbar
- [x] WhatsApp button flotante
- [x] Cookie banner
- [x] Modo mantenimiento
- [x] SEO básico (title + description)
- [x] Proceso de reserva completo: modal → Stripe → confirmación

---
_Próxima versión objetivo: v0.2.0 (Sprint 1 completado)_
