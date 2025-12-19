
'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogOut, Key } from 'lucide-react';

export function Header() {
  const { data: session } = useSession() || {};
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const handleLogout = () => {
    signOut({ callbackUrl: '/' });
  };

  const openPasswordDialog = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(null);
    setPasswordSuccess(false);
    setShowPasswordDialog(true);
  };

  const handleChangePassword = async () => {
    setPasswordError(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Tutti i campi sono obbligatori');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('La nuova password deve essere di almeno 6 caratteri');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Le password non coincidono');
      return;
    }

    setChangingPassword(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await response.json();

      if (!response.ok) {
        setPasswordError(data.error || 'Errore nel cambio password');
        return;
      }

      setPasswordSuccess(true);
      setTimeout(() => {
        setShowPasswordDialog(false);
        setPasswordSuccess(false);
      }, 2000);
    } catch {
      setPasswordError('Errore di connessione');
    } finally {
      setChangingPassword(false);
    }
  };

  const getUserInitials = (name?: string | null) => {
    if (!name) return 'AD';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="h-16 border-b border-gray-200 bg-white px-6 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center space-x-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Sistema Monitoraggio Reputazionale
          </h1>
          <p className="text-sm text-gray-500">
            Consorzio per la tutela dell'Olio Extravergine Roma-Lazio
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center space-x-2 px-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-gradient-to-r from-green-600 to-blue-600 text-white text-sm">
                  {getUserInitials(session?.user?.name)}
                </AvatarFallback>
              </Avatar>
              <div className="text-left">
                <p className="text-sm font-medium">{session?.user?.name || 'Utente'}</p>
                <p className="text-xs text-gray-500">
                  {session?.user?.role === 'ADMIN' ? 'Amministratore' : 'Operatore'}
                </p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div>
                <p className="font-medium">{session?.user?.name}</p>
                <p className="text-xs text-gray-500">{session?.user?.email}</p>
                {session?.user?.organization && (
                  <p className="text-xs text-blue-600 mt-1">{session.user.organization}</p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer" onClick={openPasswordDialog}>
              <Key className="mr-2 h-4 w-4" />
              Cambia Password
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-red-600 focus:text-red-600"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Esci
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Dialog Cambio Password */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cambia Password</DialogTitle>
            <DialogDescription>
              Inserisci la password attuale e la nuova password desiderata.
            </DialogDescription>
          </DialogHeader>
          {passwordSuccess ? (
            <div className="py-6 text-center">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Key className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-green-600 font-medium">Password cambiata con successo!</p>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Password Attuale</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Inserisci password attuale"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">Nuova Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Inserisci nuova password (min. 6 caratteri)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Conferma Nuova Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Conferma nuova password"
                />
              </div>
              {passwordError && (
                <p className="text-sm text-red-600">{passwordError}</p>
              )}
            </div>
          )}
          {!passwordSuccess && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
                Annulla
              </Button>
              <Button onClick={handleChangePassword} disabled={changingPassword}>
                {changingPassword ? 'Salvataggio...' : 'Cambia Password'}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </header>
  );
}
