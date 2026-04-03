import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from './lib/stripe';
import { lazy, Suspense, useEffect, useState } from 'react';
import './index.css';
import Maintenance from './pages/Maintenance';

// Páginas públicas — importación estática (carga inmediata)
import Home from './pages/Home';
import Apartments from './pages/Apartments';
import ApartmentDetail from './pages/ApartmentDetail';
import About from './pages/About';
import Contact from './pages/Contact';
import Privacy from './pages/Privacy';
import Cookies from './pages/Cookies';
import Terminos from './pages/Terminos';
import ProteccionDatos from './pages/ProteccionDatos';
import ReservaConfirmada from './pages/ReservaConfirmada';
import PortalReserva from './pages/PortalReserva';
import Reservar from './pages/Reservar';
import Faq from './pages/Faq';
import ComoLlegar from './pages/ComoLlegar';
import LeaveReview from './pages/LeaveReview';

// Auth — lazy (raramente visitadas)
const Login = lazy(() => import('./pages/Login'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Panel de gestión — lazy
const GestionLayout = lazy(() => import('./pages/gestion/GestionLayout'));
const Dashboard = lazy(() => import('./pages/gestion/Dashboard'));
const Reservas = lazy(() => import('./pages/gestion/Reservas'));
const Calendario = lazy(() => import('./pages/gestion/Calendario'));
const Mensajes = lazy(() => import('./pages/gestion/Mensajes'));

// Panel de administración — lazy
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const ApartamentosAdmin = lazy(() => import('./pages/admin/ApartamentosAdmin'));
const Precios = lazy(() => import('./pages/admin/Precios'));
const ConfiguracionGeneral = lazy(() => import('./pages/admin/ConfiguracionGeneral'));
const Usuarios = lazy(() => import('./pages/admin/Usuarios'));
const ReglasReserva = lazy(() => import('./pages/admin/ReglasReserva'));
const Cancelacion = lazy(() => import('./pages/admin/Cancelacion'));
const Changelog = lazy(() => import('./pages/admin/Changelog'));
const WebTextos = lazy(() => import('./pages/admin/WebTextos'));
const ExtrasAdmin = lazy(() => import('./pages/admin/ExtrasAdmin'));
const ResenasAdmin = lazy(() => import('./pages/admin/ResenasAdmin'));
const OfertasAdmin = lazy(() => import('./pages/admin/OfertasAdmin'));
const Pagos = lazy(() => import('./pages/admin/Pagos'));
const FaqAdmin = lazy(() => import('./pages/admin/FaqAdmin'));
const Analytics = lazy(() => import('./pages/admin/Analytics'));
const IcalAdmin = lazy(() => import('./pages/admin/IcalAdmin'));
const RegistroAdmin = lazy(() => import('./pages/admin/RegistroAdmin'));

// Componentes
import CookieBanner from './components/CookieBanner';
import WhatsAppButton from './components/WhatsAppButton';
import { LangProvider } from './contexts/LangContext';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import { DiscountProvider } from './contexts/DiscountContext';
import { CurrencyProvider } from './contexts/CurrencyContext';
import { ToastProvider } from './contexts/ToastContext';
import OffersBanner from './components/OffersBanner';
import PreviewBanner from './components/PreviewBanner';

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal" />
    </div>
  );
}

function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const { settings, loading: settingsLoading } = useSettings();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const { pathname } = useLocation();

  useEffect(() => {
    if (!settingsLoading) {
      setLoading(false);
    }
  }, [settingsLoading]);

  // Solo chequear mantenimiento si NO estamos en admin o gestión
  const isProtectedPath =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/gestion') ||
    pathname.startsWith('/login');
  const isPreview = sessionStorage.getItem('maintenance_preview') === 'true' || !!user;

  if (loading) return null;
  if (!isProtectedPath && settings?.maintenance_mode === true && !isPreview) {
    return <Maintenance />;
  }
  return children;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <ThemeProvider>
      <Elements stripe={stripePromise}>
        <AuthProvider>
          <SettingsProvider>
            <LangProvider>
              <DiscountProvider>
                <CurrencyProvider>
                  <ToastProvider>
                    <BrowserRouter>
                      <ScrollToTop />
                      <OffersBanner />
                      <MaintenanceGuard>
                        <Suspense fallback={<PageLoader />}>
                          <Routes>
                            {/* ─── WEB PÚBLICA ─────────────────────────────────── */}
                            <Route path="/" element={<Home />} />
                            <Route path="/apartamentos" element={<Apartments />} />
                            <Route path="/apartamentos/:slug" element={<ApartmentDetail />} />
                            <Route path="/nosotros" element={<About />} />
                            <Route path="/contacto" element={<Contact />} />
                            <Route path="/privacidad" element={<Privacy />} />
                            <Route path="/cookies" element={<Cookies />} />
                            <Route path="/terminos" element={<Terminos />} />
                            <Route path="/proteccion-datos" element={<ProteccionDatos />} />
                            <Route path="/reserva-confirmada/:id" element={<ReservaConfirmada />} />
                            <Route path="/mi-reserva" element={<PortalReserva />} />
                            <Route path="/reservar" element={<Reservar />} />
                            <Route path="/faq" element={<Faq />} />
                            <Route path="/como-llegar" element={<ComoLlegar />} />
                            <Route path="/dejar-resena" element={<LeaveReview />} />

                            <Route path="/login" element={<Login />} />
                            <Route path="/reset-password" element={<ResetPassword />} />
                            <Route path="/forgot-password" element={<ForgotPassword />} />

                            {/* ─── PANEL GESTIÓN (PROTEGIDO) ────────────────────── */}
                            <Route element={<ProtectedRoute />}>
                              <Route path="/gestion" element={<GestionLayout />}>
                                <Route index element={<Dashboard />} />
                                <Route path="reservas" element={<Reservas />} />
                                <Route path="calendario" element={<Calendario />} />
                                <Route path="mensajes" element={<Mensajes />} />
                              </Route>

                              {/* ─── PANEL ADMIN (PROTEGIDO) ──────────────────────── */}
                              <Route path="/admin" element={<AdminLayout />}>
                                <Route index element={<ApartamentosAdmin />} />
                                <Route path="precios" element={<Precios />} />
                                <Route path="configuracion" element={<ConfiguracionGeneral />} />
                                <Route path="usuarios" element={<Usuarios />} />
                                <Route path="ofertas" element={<OfertasAdmin />} />
                                <Route path="extras" element={<ExtrasAdmin />} />
                                <Route path="reglas" element={<ReglasReserva />} />
                                <Route path="resenas" element={<ResenasAdmin />} />
                                <Route path="cancelacion" element={<Cancelacion />} />
                                <Route path="changelog" element={<Changelog />} />
                                <Route path="pagos" element={<Pagos />} />
                                <Route path="web" element={<WebTextos />} />
                                <Route path="faq" element={<FaqAdmin />} />
                                <Route path="analytics" element={<Analytics />} />
                                <Route path="ical" element={<IcalAdmin />} />
                                <Route path="registro" element={<RegistroAdmin />} />
                              </Route>
                            </Route>

                            {/* ─── FALLBACK ────────────────────────────────────── */}
                            <Route path="*" element={<NotFound />} />
                          </Routes>
                        </Suspense>
                        <PreviewBanner />
                      </MaintenanceGuard>
                      <WhatsAppButton />
                      <CookieBanner />
                    </BrowserRouter>
                  </ToastProvider>
                </CurrencyProvider>
              </DiscountProvider>
            </LangProvider>
          </SettingsProvider>
        </AuthProvider>
      </Elements>
    </ThemeProvider>
  );
}
