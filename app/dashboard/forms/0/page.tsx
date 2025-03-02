'use client';

import FormViewer from '@/components/forms/FormViewer';

export default function FormViewPage({ params }: { params: { id: string } }) {
  return (
    <div className="container mx-auto py-6 px-4">
      <FormViewer formId={params.id} />
    </div>
  );
}