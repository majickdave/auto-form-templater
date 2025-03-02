'use client';

import FormViewer from '@/components/forms/FormViewer';
import { useParams } from 'next/navigation';
import { notFound } from 'next/navigation';

export default function FormViewPage() {
  const params = useParams();
  const formId = '0'; // Hardcoded to 0 for this specific route
  
  if (!formId) {
    notFound();
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <FormViewer formId={formId} />
    </div>
  );
}