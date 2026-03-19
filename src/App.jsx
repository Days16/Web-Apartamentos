import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from './lib/stripe';
import { useEffect, useState } from 'react';
import './index.css';
import { fetchSettings } from './services/supabaseService';
import Maintenance from './pages/Maintenance';

// Páginas públicas
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

// Panel de gestión
import GestionLayout from './pages/gestion/GestionLayout';
import Dashboard from './pages/gestion/Dashboard';
import Reservas from './pages/gestion/Reservas';
import Calendario from './pages/gestion/Calendario';
import Mensajes from './pages/gestion/Mensajes';

// Panel de administración
import AdminLayout from './pages/admin/AdminLayout';
import ApartamentosAdmin from './pages/admin/ApartamentosAdmin';
import Precios from './pages/admin/Precios';
import ConfiguracionGeneral from './pages/admin/ConfiguracionGeneral';
import Usuarios from './pages/admin/Usuarios';
import ReglasReserva from './pages/admin/ReglasReserva';
import Cancelacion from './pages/admin/Cancelacion';
import Changelog from './pages/admin/Changelog';

// Componentes
import CookieBanner from './components/CookieBanner';
import WhatsAppButton from './components/WhatsAppButton';
import { LangProvider } from './contexts/LangContext';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';

// Admin
import ExtrasAdmin from './pages/admin/ExtrasAdmin';
import ResenasAdmin from './pages/admin/ResenasAdmin';
import OfertasAdmin from './pages/admin/OfertasAdmin';
import Pagos from './pages/admin/Pagos';
import { DiscountProvider } from './contexts/DiscountContext';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import OffersBanner from './components/OffersBanner';

function MaintenanceGuard({ children }) {
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
  const isProtectedPath = pathname.startsWith('/admin') || pathname.startsWith('/gestion') || pathname.startsWith('/login');
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

import PreviewBanner from './components/PreviewBanner';

export default function App() {
  return (
    <ThemeProvider>
    <Elements stripe={stripePromise}>
      <AuthProvider>
        <SettingsProvider>
          <LangProvider>
            <DiscountProvider>
              <BrowserRouter>
                <ScrollToTop />
                <OffersBanner />
                <MaintenanceGuard>
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

                    <Route path="/login" element={<Login />} />
                    <Route path="/reset-password" element={<ResetPassword />} />

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
                      </Route>
                    </Route>

                    {/* ─── FALLBACK ────────────────────────────────────── */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                  <PreviewBanner />
                </MaintenanceGuard>
                <WhatsAppButton />
                <CookieBanner />
              </BrowserRouter>
            </DiscountProvider>
          </LangProvider>
        </SettingsProvider>
      </AuthProvider>
    </Elements>
    </ThemeProvider>
  );
}
