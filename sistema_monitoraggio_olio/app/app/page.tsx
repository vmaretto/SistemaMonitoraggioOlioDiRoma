
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LoginForm } from '@/components/auth/login-form';

export default function Home() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (status === 'authenticated' && session?.user && !isRedirecting) {
      setIsRedirecting(true);
      // Usa hard redirect per evitare problemi di cache
      window.location.href = '/dashboard';
    }
  }, [status, session, isRedirecting]);

  if (status === 'loading' || (status === 'authenticated' && session?.user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4" />
          <p className="text-gray-600">
            {status === 'loading' ? 'Caricamento...' : 'Reindirizzamento alla dashboard...'}
          </p>
        </div>
      </div>
    );
  }

  return <LoginForm />;
}
