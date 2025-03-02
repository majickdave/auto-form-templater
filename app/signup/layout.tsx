'use client';

import Navigation from '@/components/Navigation';

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <Navigation />
      <main className="container mx-auto p-4">
        {children}
      </main>
    </div>
  );
} 