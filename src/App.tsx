/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthProvider, useAuth } from './AuthContext';
import { Login } from './Login';
import { AdminDashboard } from './components/AdminDashboard';
import { EmployeeDashboard } from './components/EmployeeDashboard';
import { Toaster } from './components/ui/sonner';
import { Button } from './components/ui/button';
import { LogOut, Shield } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';

function AppContent() {
  const { profile, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 bg-primary/20 rounded-full mb-4"></div>
          <div className="h-4 w-32 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <Login />;
  }

  const handleLogout = () => {
    localStorage.removeItem('auth_fallback_user');
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navbar */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-primary p-1.5 rounded-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">Avalia360</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex flex-col items-end mr-2">
              <span className="text-sm font-semibold">{profile.name}</span>
              <span className="text-xs text-muted-foreground capitalize">
                {profile.role === 'admin' ? 'Administrador' : 'Colaborador'}
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Sair">
              <LogOut className="h-5 w-5 text-slate-500" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <ErrorBoundary>
          {isAdmin ? <AdminDashboard /> : <EmployeeDashboard />}
        </ErrorBoundary>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Avalia360 - Sistema Interno de Avaliação.
        </div>
      </footer>
      <Toaster position="top-right" />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

