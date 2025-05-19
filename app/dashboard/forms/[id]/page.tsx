'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import FormBuilder from '@/components/forms/FormBuilder';
import TemplateSelector from '@/components/templates/TemplateSelector';
import { v4 as uuidv4 } from 'uuid';

interface Field {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  defaultValue?: string | string[];
}

interface FormData {
  id: string;
  title: string;
  description: string;
  fields: Field[];
  public: boolean;
  created_at: string;
  user_id: string;
  template_id?: string;
  fields_metadata?: {
    labels: string[];
    types: string[];
    default_values: (string | string[] | null)[];
    required: boolean[];
    options: (string[] | null)[];
    placeholders: (string | null)[];
  };
}

interface Template {
  id: string;
  name: string;
  description: string;
  user_id: string;
}

export default function FormPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const formId = params?.id === 'new' ? null : (Array.isArray(params?.id) ? params?.id[0] : params?.id);
  const isNewForm = formId === null || params?.id === 'new';
  const fromTemplate = searchParams.get('fromTemplate') === 'true';
  
  const [form, setForm] = useState<FormData | null>(null);
  const [initialFormData, setInitialFormData] = useState<any>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [template, setTemplate] = useState<Template | null>(null);

  useEffect(() => {
    // For new forms from template
    if (isNewForm && fromTemplate) {
      try {
        const templateFormData = localStorage.getItem('templateFormData');
        if (templateFormData) {
          const parsedData = JSON.parse(templateFormData);
          setInitialFormData(parsedData);
          
          // Clear the localStorage after loading
          localStorage.removeItem('templateFormData');
        }
      } catch (err) {
        console.error('Error loading template data:', err);
      }
      setLoading(false);
      return;
    }

    // For existing forms
    if (!isNewForm && formId) {
      const fetchForm = async () => {
        try {
          // Get current user
          const { data: { user } } = await supabase.auth.getUser();
          
          if (!user) {
            router.push('/login');
            return;
          }

          // Fetch form data
          const { data, error } = await supabase
            .from('forms')
            .select('*')
            .eq('id', formId)
            .single();

          if (error) {
            if (error.code === 'PGRST116') {
              notFound();
            } else {
              throw error;
            }
          }
          
          // Check if form belongs to current user
          if (data.user_id !== user.id) {
            throw new Error('You do not have permission to edit this form');
          }

          setForm(data);
          setInitialFormData(data);
          
          // If form has a template_id, fetch the template
          if (data.template_id) {
            setSelectedTemplateId(data.template_id);
            const { data: templateData, error: templateError } = await supabase
              .from('templates')
              .select('*')
              .eq('id', data.template_id)
              .single();
            
            if (!templateError) {
              setTemplate(templateData);
            }
          }
        } catch (err: any) {
          console.error('Error fetching form:', err);
          setError(err.message || 'Failed to load form');
        } finally {
          setLoading(false);
        }
      };

      fetchForm();
    } else {
      // For new forms without template
      setLoading(false);
    }
  }, [formId, router, isNewForm, fromTemplate]);

  const handleFormSubmit = async (formData: any) => {
    setIsSubmitting(true);
    setError('');

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('User not authenticated');

      // If a template is selected for a new form, check if it's already associated with a form
      if (isNewForm && selectedTemplateId) {
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

      if (isNewForm) {
        // Create a new form
        const { data, error } = await supabase
          .from('forms')
          .insert({
            id: uuidv4(),
            user_id: user.id,
            title: formData.title,
            description: formData.description,
            fields: formData.fields.map((field: any) => ({
              ...field,
              metadata: {
                label: field.label,
                type: field.type,
                default_value: field.defaultValue || null,
                required: field.required,
                options: field.options || null,
                placeholder: field.placeholder || null
              }
            })),
            public: formData.isPublic,
            template_id: formData.template_id || (initialFormData?.templateId || selectedTemplateId || null),
          })
          .select();

        if (error) throw error;

        // Redirect to the form page
        router.push(`/dashboard/forms/${data[0].id}`);
      } else {
        // Update existing form
        const { error } = await supabase
          .from('forms')
          .update({
            title: formData.title,
            description: formData.description,
            fields: formData.fields.map((field: any) => ({
              ...field,
              metadata: {
                label: field.label,
                type: field.type,
                default_value: field.defaultValue || null,
                required: field.required,
                options: field.options || null,
                placeholder: field.placeholder || null
              }
            })),
            public: formData.isPublic,
          })
          .eq('id', formId);

        if (error) throw error;
      }
      
    } catch (err: any) {
      console.error(`Error ${isNewForm ? 'creating' : 'updating'} form:`, err);
      setError(err.message || `Failed to ${isNewForm ? 'create' : 'update'} form`);
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r-lg">
        <p className="text-red-700 dark:text-red-400">{error}</p>
        <Link href="/dashboard" className="text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {isNewForm ? 'Create New Form' : 'Edit Form'}
        </h1>
        <div className="flex gap-2">
          {!isNewForm && (
            <>
              <Link 
                href={`/dashboard/forms/${formId}/responses`}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                View Responses
              </Link>
              <Link 
                href={`/dashboard/forms/${formId}/new-response`}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                New Response
              </Link>
            </>
          )}
          <Link 
            href="/dashboard"
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </div>

      {isNewForm && !fromTemplate && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Template Selection</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Optionally select a template to use as a starting point for your form.
          </p>
          <TemplateSelector 
            onSelect={setSelectedTemplateId} 
            selectedTemplateId={selectedTemplateId} 
          />
        </div>
      )}
      
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <FormBuilder 
          onSubmit={handleFormSubmit} 
          isSubmitting={isSubmitting}
          template_id={selectedTemplateId || undefined}
          initialData={initialFormData}
        />
      </div>
    </div>
  );
} 