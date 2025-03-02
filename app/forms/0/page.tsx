'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LegacyFormPage({ params }: { params: { id: string } }) {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new dynamic route
    router.replace(`/forms/${params.id}`);
  }, [params.id, router]);

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}
