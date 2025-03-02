import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { redirect } from 'next/navigation';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/context/ThemeContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Form Templater',
  description: 'Create and manage form templates and collect responses.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This layout is only used for routes that don't have a specific layout
  // We'll redirect to the home page
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider>
          {children}
          <Toaster position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
