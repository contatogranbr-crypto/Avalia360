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
import { LogOut, Shield, ShieldCheck } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OmbudsmanPage } from './components/OmbudsmanPage';
import { useState, useEffect } from 'react';

function AppContent() {
  const { profile, loading, isAdmin } = useAuth();
  const [view, setView] = useState<'auth' | 'ombudsman'>('auth');

  // Expose setView to window for access from Login component
  useEffect(() => {
    (window as any).showOmbudsman = () => setView('ombudsman');
  }, []);

  if (view === 'ombudsman') {
    return <OmbudsmanPage onBack={() => setView('auth')} />;
  }

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
          <div className="flex items-center space-x-3">
            <div className="relative">
              <img 
                src="https://twxdjqsggoavycuudwzt.supabase.co/storage/v1/object/public/system/logo.png" 
                className="h-9 w-auto object-contain"
                alt="Logo"
                onError={(e) => {
                  (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                  (e.target as HTMLImageElement).nextElementSibling!.classList.remove('hidden');
                }}
              />
              <div className="bg-primary p-1.5 rounded-lg hidden">
                <Shield className="w-6 h-6 text-white" />
              </div>
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-800">Avalia360 - Gran Bernardo</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex flex-col items-end mr-2">
              <span className="text-sm font-semibold">{profile.name}</span>
              <span className="text-xs text-muted-foreground capitalize">
                {profile.role === 'admin' ? 'Administrador' : 'Colaborador'}
              </span>
            </div>
            {!isAdmin && (
              <Button 
                variant="ghost" 
                className="gap-2 text-slate-600 hidden sm:flex" 
                onClick={() => setView('ombudsman')}
              >
                <ShieldCheck className="h-5 w-5 text-primary" />
                <span>Ouvidoria</span>
              </Button>
            )}
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
          &copy; {new Date().getFullYear()} Avalia360 - Gran Bernardo - Sistema Interno de Avaliação.
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

