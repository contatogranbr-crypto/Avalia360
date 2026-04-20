import * as React from 'react';
import { useState } from 'react';
import { useAuth } from './AuthContext';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { ShieldCheck, Mail, Key } from 'lucide-react';
import { loginWithAccessKey } from './services';

export const Login = () => {
  const { profile, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setError(null);
    try {
      await loginWithAccessKey(email, password);
      window.location.reload(); // Reload to pick up the new profile from localStorage
    } catch (err: any) {
      setError(err.message || "E-mail ou chave de acesso inválidos.");
    } finally {
      setAuthLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen">Carregando...</div>;

  return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <Card className="w-[400px] shadow-xl border-t-4 border-t-primary">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <img 
                src="https://twxdjqsggoavycuudwzt.supabase.co/storage/v1/object/public/system/logo.png" 
                className="h-20 w-auto object-contain mx-auto"
                alt="Logo"
                onError={(e) => {
                  (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                  (e.target as HTMLImageElement).nextElementSibling!.classList.remove('hidden');
                }}
              />
              <div className="p-4 bg-primary/10 rounded-full hidden">
                <ShieldCheck className="w-12 h-12 text-primary" />
              </div>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Avalia360 - Gran Bernardo</CardTitle>
          <CardDescription>Sistema Interno de Avaliação de Desempenho</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="seu@email.com" 
                  className="pl-10"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Chave de Accesso</Label>
              <div className="relative">
                <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="password" 
                  type="text" 
                  placeholder="Sua chave de acesso" 
                  className="pl-10"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required 
                />
              </div>
            </div>
            <Button type="submit" className="w-full h-11" disabled={authLoading}>
              {authLoading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          {error && <p className="mt-4 text-sm text-destructive text-center font-medium">{error}</p>}
          
          <p className="mt-6 text-xs text-center text-muted-foreground">
            Acesso restrito a colaboradores autorizados.
          </p>

          <div className="mt-8 pt-6 border-t flex flex-col items-center">
            <p className="text-sm text-slate-500 mb-3 font-medium">Outros Canais</p>
            <Button 
              variant="outline" 
              className="w-full gap-2 border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary"
              onClick={() => (window as any).showOmbudsman()}
            >
              <ShieldCheck className="w-4 h-4" /> Canal de Ouvidoria (Anônimo)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
