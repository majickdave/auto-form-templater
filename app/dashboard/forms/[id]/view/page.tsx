'use client';

import FormViewer from '@/components/forms/FormViewer';
import { useParams } from 'next/navigation';
import { notFound } from 'next/navigation';

export default function FormViewPage() {
  const params = useParams();
  const formId = Array.isArray(params.id) ? params.id[0] : params.id;
  
  if (!formId) {
    notFound();
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <FormViewer formId={formId} isOwner={true} />
    </div>
  );
} 