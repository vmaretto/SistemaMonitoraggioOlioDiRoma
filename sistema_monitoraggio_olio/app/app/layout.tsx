
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Sistema Monitoraggio Reputazionale & Etichette Olio',
  description: 'Sistema di monitoraggio della reputazione online e verifica delle etichette per il Consorzio Olio Roma-Lazio',
  keywords: 'olio, monitoraggio, reputazione, etichette, Roma, Lazio, DOP, IGP',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
