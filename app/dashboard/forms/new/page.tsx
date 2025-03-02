'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import FormBuilder from '@/components/forms/FormBuilder';
import TemplateSelector from '@/components/templates/TemplateSelector';
import { v4 as uuidv4 } from 'uuid';

export default function NewFormPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const handleFormSubmit = async (formData: any) => {
    setIsSubmitting(true);
    setError('');

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('User not authenticated');

      // If a template is selected, check if it's already associated with a form
      if (selectedTemplateId) {
        const { data: existingForms, error: checkError } = await supabase
          .from('forms')
          .select('id')
          .eq('template_id', selectedTemplateId)
          .limit(1);
        
        if (checkError) throw checkError;
        
        if (existingForms && existingForms.length > 0) {
          throw new Error('This template is already associated with another form. Please select a different template.');
        }
      }

      // Create the form in the database
      const { data, error } = await supabase
        .from('forms')
        .insert({
          id: uuidv4(),
          user_id: user.id,
          title: formData.title,
          description: formData.description,
          fields: formData.fields,
          public: formData.isPublic,
          template_id: formData.template_id,
        })
        .select();

      if (error) throw error;

      // Redirect to the form page
      router.push(`/dashboard/forms/${data[0].id}`);
      
    } catch (err: any) {
      console.error('Error creating form:', err);
      setError(err.message || 'Failed to create form');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Create New Form</h1>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
        <h2 className="text-xl font-semibold mb-4">Template Selection</h2>
        <TemplateSelector 
          onSelect={setSelectedTemplateId} 
          selectedTemplateId={selectedTemplateId} 
        />
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-semibold mb-4">Form Builder</h2>
        <FormBuilder 
          onSubmit={handleFormSubmit} 
          isSubmitting={isSubmitting}
          template_id={selectedTemplateId || undefined}
        />
      </div>
    </div>
  );
}
