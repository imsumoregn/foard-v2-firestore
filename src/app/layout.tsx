import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppShell } from '@/components/app-shell';
import { Toaster } from '@/components/ui/toaster';

const APP_NAME = "Foard: Functional Dashboard";
const APP_DESCRIPTION = "A functional dashboard to organize your life.";

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: APP_NAME,
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#73A79D',
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <AppShell>{children}</AppShell>
        <Toaster />
      </body>
    </html>
  );
}
