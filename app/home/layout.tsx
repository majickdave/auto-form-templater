'use client';

import Navigation from '@/components/Navigation';

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <Navigation />
      <main>
        {children}
      </main>
    </div>
  );
} 