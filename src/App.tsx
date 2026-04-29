import React, { Suspense, lazy } from 'react';
import {
  BrowserRouter,
  Navigate,
  Routes,
  Route,
  useLocation,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import DesktopLayout from './layouts/DesktopLayout';
import MobilePwaLayout from './layouts/MobilePwaLayout';

import DashboardPage from './pages/DashboardPage';
import AtencionMedicaPage from './pages/AtencionMedicaPage';
import BoxEcografiaPage from './pages/BoxEcografiaPage';
import BoxEnfermeriaPage from './pages/BoxEnfermeriaPage';
import SetmPage from './pages/SetmPage';
import InventarioPage from './pages/InventarioPage';
import ProtocolosPage from './pages/ProtocolosPage';
import ReportesPage from './pages/ReportesPage';
import NuevoPacientePage from './pages/NuevoPacientePage';
import AgendaPage from './pages/AgendaPage';
import ProfesionalesPage from './pages/profesionales/ProfesionalesPage';
import ProfesionalPerfilPage from './pages/profesionales/ProfesionalPerfilPage';
// const MamografiaPage = lazy(() => import('./pages/mamografia'));
// const MamografiaMobilePage = lazy(() => import('./pages/mamografia-mobile'));
const ActivarCuenta = lazy(() => import('./pages/activar-cuenta'));

const EcoMobileDashboard = lazy(() => import('./pages/eco-mobile/EcoMobileDashboard'));
const MobileProfilePage = lazy(() => import('./pages/eco-mobile/MobileProfilePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const LoginIntroPage = lazy(() => import('./pages/LoginIntroPage'));
const RegistroProfesionalPage = lazy(() => import('./pages/RegistroProfesionalPage'));

const FullScreenLoader: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#F3F4F6]">
    <div className="w-10 h-10 rounded-full border-2 border-[#0E7490] border-t-transparent animate-spin" />
  </div>
);


const NotFoundPage: React.FC = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-[#F3F4F6] text-slate-800 gap-4">
    <p className="text-6xl font-bold text-slate-200">404</p>
    <p className="text-slate-500">Página no encontrada.</p>
  </div>
);

interface RequireAuthProps {
  children: React.ReactNode;
}

const RequireAuth: React.FC<RequireAuthProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => (
  <Routes>
    {/* ── Desktop routes ─────────────────────────────────────────────
        Layout: Sidebar + Header clásico, optimizado para mouse y teclado.
        Todas las rutas bajo "/" son exclusivas del entorno de escritorio.
    ──────────────────────────────────────────────────────────────── */}
    <Route
      path="/"
      element={
        <RequireAuth>
          <DesktopLayout />
        </RequireAuth>
      }
    >
      <Route index element={<Navigate to="/dashboard" replace />} />
      <Route path="dashboard" element={<DashboardPage />} />
      <Route path="atencion-medica" element={<AtencionMedicaPage />} />
      <Route path="box-ecografia" element={<BoxEcografiaPage />} />
      <Route path="box-enfermeria" element={<BoxEnfermeriaPage />} />
      <Route path="setm" element={<SetmPage />} />
      <Route path="inventario" element={<InventarioPage />} />
      <Route path="protocolos" element={<ProtocolosPage />} />
      <Route path="reportes" element={<ReportesPage />} />
      <Route path="nuevopaciente" element={<NuevoPacientePage />} />
      <Route path="agenda" element={<AgendaPage />} />
      <Route path="profesionales" element={<ProfesionalesPage />} />
      <Route path="profesionales/:profesionalId" element={<ProfesionalPerfilPage />} />
      {/* <Route
        path="mamografia"
        element={
          <Suspense fallback={<FullScreenLoader />}>
            <MamografiaPage />
          </Suspense>
        }
      /> */}
    </Route>

    {/* ── Mobile PWA routes ──────────────────────────────────────────
        Layout: Full-screen, sin sidebar, App Bar + Bottom Nav.
        Optimizado para pulgares. Manifiesto PWA de alcance /eco-mobile/.
        Todas las rutas bajo "/eco-mobile" son exclusivas del entorno móvil.
    ──────────────────────────────────────────────────────────────── */}
    <Route
      path="/eco-mobile"
      element={
        <RequireAuth>
          <MobilePwaLayout />
        </RequireAuth>
      }
    >
      <Route
        index
        element={
          <Suspense fallback={<FullScreenLoader />}>
            <EcoMobileDashboard />
          </Suspense>
        }
      />
      <Route
        path="historial"
        element={
          <div className="p-6 text-slate-300">Historial de informes.</div>
        }
      />
      <Route
        path="perfil"
        element={
          <Suspense fallback={<FullScreenLoader />}>
            <MobileProfilePage />
          </Suspense>
        }
      />
    </Route>

    {/* ── Auth ───────────────────────────────────────────────────────── */}
    <Route
      path="/login"
      element={
        <Suspense fallback={<FullScreenLoader />}>
          <LoginPage />
        </Suspense>
      }
    />
    <Route
      path="/registro"
      element={
        <Suspense fallback={<FullScreenLoader />}>
          <RegistroProfesionalPage />
        </Suspense>
      }
    />

    {/* ── Login intro ────────────────────────────────────────────────── */}
    <Route
      path="/intro"
      element={
        <RequireAuth>
          <Suspense fallback={<FullScreenLoader />}>
            <LoginIntroPage />
          </Suspense>
        </RequireAuth>
      }
    />

    {/* <Route
      path="/mamografia-mobile"
      element={
        <RequireAuth>
          <Suspense fallback={<FullScreenLoader />}>
            <MamografiaMobilePage />
          </Suspense>
        </RequireAuth>
      }
    /> */}

    {/* Ruta pública de activación de cuenta */}
    <Route
      path="/activar-cuenta"
      element={
        <ActivarCuenta />
      }
    />

    {/* ── Fallback ───────────────────────────────────────────────────── */}
    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);

const App: React.FC = () => (
  <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  </BrowserRouter>
);

export default App;
