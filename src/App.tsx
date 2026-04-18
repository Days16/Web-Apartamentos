import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from './lib/stripe';
import { lazy, Suspense, useEffect, useState } from 'react';
import './index.css';
import Maintenance from './pages/Maintenance';

// Main pages — static import (critical LCP)
import Home from './pages/Home';
import Apartments from './pages/Apartments';
import ApartmentDetail from './pages/ApartmentDetail';

// Secondary pages — lazy (not primary traffic landing pages)
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Cookies = lazy(() => import('./pages/Cookies'));
const Terms = lazy(() => import('./pages/Terms'));
const DataProtection = lazy(() => import('./pages/DataProtection'));
const BookingConfirmed = lazy(() => import('./pages/BookingConfirmed'));
const BookingPortal = lazy(() => import('./pages/BookingPortal'));
const Book = lazy(() => import('./pages/Book'));
const Faq = lazy(() => import('./pages/Faq'));
const Directions = lazy(() => import('./pages/Directions'));
const LeaveReview = lazy(() => import('./pages/LeaveReview'));

// Auth — lazy (rarely visited)
const Login = lazy(() => import('./pages/Login'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Management panel — lazy
const ManagementLayout = lazy(() => import('./pages/management/ManagementLayout'));
const Dashboard = lazy(() => import('./pages/management/Dashboard'));
const Reservations = lazy(() => import('./pages/management/Reservations'));
const Calendar = lazy(() => import('./pages/management/Calendar'));
const Messages = lazy(() => import('./pages/management/Messages'));
const Tasks = lazy(() => import('./pages/management/Tasks'));

// Admin panel — lazy
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const ApartmentsAdmin = lazy(() => import('./pages/admin/ApartmentsAdmin'));
const Pricing = lazy(() => import('./pages/admin/Pricing'));
const GeneralSettings = lazy(() => import('./pages/admin/GeneralSettings'));
const Users = lazy(() => import('./pages/admin/Users'));
const BookingRules = lazy(() => import('./pages/admin/BookingRules'));
const Cancellation = lazy(() => import('./pages/admin/Cancellation'));
const Changelog = lazy(() => import('./pages/admin/Changelog'));
const WebContent = lazy(() => import('./pages/admin/WebContent'));
const ExtrasAdmin = lazy(() => import('./pages/admin/ExtrasAdmin'));
const ReviewsAdmin = lazy(() => import('./pages/admin/ReviewsAdmin'));
const OffersAdmin = lazy(() => import('./pages/admin/OffersAdmin'));
const FaqAdmin = lazy(() => import('./pages/admin/FaqAdmin'));
const Analytics = lazy(() => import('./pages/admin/Analytics'));
const IcalAdmin = lazy(() => import('./pages/admin/IcalAdmin'));
const CheckInAdmin = lazy(() => import('./pages/admin/CheckInAdmin'));
const EmailConfig = lazy(() => import('./pages/admin/EmailConfig'));
const DiscountCodes = lazy(() => import('./pages/admin/DiscountCodes'));
const AuditLog = lazy(() => import('./pages/admin/AuditLog'));
const PdfEditorAdmin = lazy(() => import('./pages/admin/PdfEditorAdmin'));

// Components
import CookieBanner from './components/CookieBanner';
import WhatsAppButton from './components/WhatsAppButton';
import { LangProvider } from './contexts/LangContext';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import { DiscountProvider } from './contexts/DiscountContext';
import { CurrencyProvider } from './contexts/CurrencyContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { registerPanelToast } from './utils/panelAction';
import OffersBanner from './components/OffersBanner';
import PreviewBanner from './components/PreviewBanner';

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal" />
    </div>
  );
}

class ChunkErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError(error: Error) {
    const isChunkError =
      error.message.includes('Failed to fetch dynamically imported module') ||
      error.message.includes('Loading chunk') ||
      error.name === 'ChunkLoadError';
    return isChunkError ? { hasError: true } : null;
  }

  componentDidUpdate(_: unknown, prev: { hasError: boolean }) {
    if (this.state.hasError && !prev.hasError) {
      window.location.reload();
    }
  }

  render() {
    if (this.state.hasError) return <PageLoader />;
    return this.props.children;
  }
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

  // Only check maintenance if NOT on admin or management paths
  const isProtectedPath =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/gestion') ||
    pathname.startsWith('/login');
  const userRole = user?.app_metadata?.role;
  const isStaff = userRole === 'admin' || userRole === 'gestion';
  const isPreview = sessionStorage.getItem('maintenance_preview') === 'true' || isStaff;

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

function ToastBridge() {
  const toast = useToast();
  useEffect(() => {
    registerPanelToast((msg, type) => {
      if (type === 'success') toast.success(msg);
      else toast.error(msg);
    });
  }, [toast]);
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
                    <ToastBridge />
                    <BrowserRouter>
                      <ScrollToTop />
                      <OffersBanner />
                      <MaintenanceGuard>
                        <ChunkErrorBoundary>
                        <Suspense fallback={<PageLoader />}>
                          <Routes>
                            {/* ─── PUBLIC WEB ─────────────────────────────────── */}
                            <Route path="/" element={<Home />} />
                            <Route path="/apartamentos" element={<Apartments />} />
                            <Route path="/apartamentos/:slug" element={<ApartmentDetail />} />
                            <Route path="/nosotros" element={<About />} />
                            <Route path="/contacto" element={<Contact />} />
                            <Route path="/privacidad" element={<Privacy />} />
                            <Route path="/cookies" element={<Cookies />} />
                            <Route path="/terminos" element={<Terms />} />
                            <Route path="/proteccion-datos" element={<DataProtection />} />
                            <Route path="/reserva-confirmada/:id" element={<BookingConfirmed />} />
                            <Route path="/mi-reserva" element={<BookingPortal />} />
                            <Route path="/reservar" element={<Book />} />
                            <Route path="/faq" element={<Faq />} />
                            <Route path="/como-llegar" element={<Directions />} />
                            <Route path="/dejar-resena" element={<LeaveReview />} />

                            <Route path="/login" element={<Login />} />
                            <Route path="/reset-password" element={<ResetPassword />} />
                            <Route path="/forgot-password" element={<ForgotPassword />} />

                            {/* ─── MANAGEMENT PANEL (PROTECTED) ────────────────── */}
                            <Route element={<ProtectedRoute requiredRole="gestion" />}>
                              <Route path="/gestion" element={<ManagementLayout />}>
                                <Route index element={<Dashboard />} />
                                <Route path="reservas" element={<Reservations />} />
                                <Route path="calendario" element={<Calendar />} />
                                <Route path="mensajes" element={<Messages />} />
                                <Route path="tareas" element={<Tasks />} />
                              </Route>
                            </Route>

                            {/* ─── ADMIN PANEL (PROTECTED) ──────────────────────── */}
                            <Route element={<ProtectedRoute requiredRole="admin" />}>
                              <Route path="/admin" element={<AdminLayout />}>
                                <Route index element={<ApartmentsAdmin />} />
                                <Route path="precios" element={<Pricing />} />
                                <Route path="configuracion" element={<GeneralSettings />} />
                                <Route path="usuarios" element={<Users />} />
                                <Route path="ofertas" element={<OffersAdmin />} />
                                <Route path="extras" element={<ExtrasAdmin />} />
                                <Route path="reglas" element={<BookingRules />} />
                                <Route path="resenas" element={<ReviewsAdmin />} />
                                <Route path="cancelacion" element={<Cancellation />} />
                                <Route path="changelog" element={<Changelog />} />
                                <Route path="web" element={<WebContent />} />
                                <Route path="faq" element={<FaqAdmin />} />
                                <Route path="analytics" element={<Analytics />} />
                                <Route path="ical" element={<IcalAdmin />} />
                                <Route path="registro" element={<CheckInAdmin />} />
                                <Route path="emails" element={<EmailConfig />} />
                                <Route path="descuentos" element={<DiscountCodes />} />
                                <Route path="auditoria" element={<AuditLog />} />
                                <Route path="pdf-editor" element={<PdfEditorAdmin />} />
                              </Route>
                            </Route>

                            {/* ─── FALLBACK ────────────────────────────────────── */}
                            <Route path="*" element={<NotFound />} />
                          </Routes>
                        </Suspense>
                        </ChunkErrorBoundary>
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
