'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface Form {
  id: string;
  title: string;
  description: string;
  user_id: string;
  fields: any[];
  fields_metadata?: {
    labels: string[];
    types: string[];
    default_values: (string | string[] | null)[];
    required: boolean[];
    options: (string[] | null)[];
    placeholders: (string | null)[];
  };
}

interface FormSelectorProps {
  onSelect: (formId: string | null) => void;
  selectedFormId: string | null;
}

export default function FormSelector({ onSelect, selectedFormId }: FormSelectorProps) {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [useForm, setUseForm] = useState(selectedFormId !== null);

  useEffect(() => {
    async function fetchForms() {
      setLoading(true);
      
      try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          setError('You must be logged in to view forms');
          setLoading(false);
          return;
        }
        
        // Fetch all forms owned by the user
        const { data: formData, error: formError } = await supabase
          .from('forms')
          .select('*')
          .eq('user_id', user.id);
        
        if (formError) throw formError;
        
        setForms(formData || []);
        
        // Auto-select the first form if we have forms and no form is currently selected
        if (formData && formData.length > 0 && !selectedFormId && useForm) {
          onSelect(formData[0].id);
        }
        
      } catch (err: any) {
        console.error('Error fetching forms:', err);
        setError(err.message || 'Failed to load forms');
      } finally {
        setLoading(false);
      }
    }
    
    fetchForms();
  }, [selectedFormId, onSelect, useForm]);

  if (loading) {
    return <div className="animate-pulse h-10 bg-gray-200 rounded"></div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (forms.length === 0) {
    return (
      <div className="p-4 border rounded bg-gray-50">
        <p className="text-gray-600">No forms found. You need to create a form before you can create a template.</p>
        <Link href="/dashboard/forms/new" className="text-blue-600 hover:underline mt-2 inline-block link-hover">
          Create a new form
        </Link>
      </div>
    );
  }

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUseForm(e.target.checked);
    if (e.target.checked) {
      if (forms.length > 0) {
        onSelect(forms[0].id);
      }
    } else {
      onSelect(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="use-form"
          checked={useForm}
          onChange={handleCheckboxChange}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="use-form" className="text-sm font-medium text-gray-700">
          Use fields from an existing form
        </label>
      </div>
      
      {useForm && (
        <div className="pl-6">
          <label htmlFor="form-select" className="block text-sm font-medium text-gray-700 mb-1">
            Select a form <span className="text-red-500">*</span>
          </label>
          <select
            id="form-select"
            value={selectedFormId || ''}
            onChange={(e) => onSelect(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          >
            <option value="" disabled>Select a form</option>
            {forms.map((form) => (
              <option key={form.id} value={form.id}>
                {form.title}
              </option>
            ))}
          </select>
          <p className="mt-1 text-sm text-gray-500">
            The template will use the fields defined in the selected form.
          </p>
        </div>
      )}
    </div>
  );
} 