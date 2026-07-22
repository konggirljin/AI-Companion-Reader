import type { Metadata } from 'next';
import { Nunito } from 'next/font/google';
import { PwaRegister } from '@/components/pwa-register';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-nunito',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AI Reading Companion',
  description: 'Read together with AI companions',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={nunito.variable}>
      <body className="flex min-h-[100dvh] flex-col bg-background font-sans antialiased">
        <main className="flex flex-1 flex-col">{children}</main>
        <Toaster richColors position="top-center" />
        <PwaRegister />
      </body>
    </html>
  );
}
