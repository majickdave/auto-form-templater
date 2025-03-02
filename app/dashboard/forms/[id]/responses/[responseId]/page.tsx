'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import TemplateRenderer from '@/components/templates/TemplateRenderer';

interface FormResponse {
  id: string;
  form_id: string;
  respondent_email: string | null;
  data: Record<string, any>;
  created_at?: string;
}

interface FormData {
  id: string;
  title: string;
  fields: Array<{
    id: string;
    label: string;
    type: string;
  }>;
  user_id: string;
  template_id?: string;
}

export default function ResponseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const formId = Array.isArray(params.id) ? params.id[0] : params.id;
  const responseId = Array.isArray(params.responseId) ? params.responseId[0] : params.responseId;
  
  const [form, setForm] = useState<FormData | null>(null);
  const [response, setResponse] = useState<FormResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!formId || !responseId) {
      notFound();
      return;
    }

    const fetchData = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push('/login');
          return;
        }

        // Fetch form data
        const { data: formData, error: formError } = await supabase
          .from('forms')
          .select('id, title, fields, user_id, template_id')
          .eq('id', formId)
          .single();

        if (formError) throw formError;
        
        // Check if form belongs to current user
        if (formData.user_id !== user.id) {
          throw new Error('You do not have permission to view this response');
        }

        setForm(formData);

        // Fetch specific response
        const { data: responseData, error: responseError } = await supabase
          .from('form_responses')
          .select('*')
          .eq('id', responseId)
          .eq('form_id', formId)
          .single();

        if (responseError) throw responseError;
        
        setResponse(responseData);
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [formId, responseId, router]);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const deleteResponse = async () => {
    if (!response) return;
    
    if (!confirm('Are you sure you want to delete this response? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('form_responses')
        .delete()
        .eq('id', response.id);

      if (error) throw error;
      
      // Redirect to responses list
      router.push(`/dashboard/forms/${formId}/responses`);
      
    } catch (err: any) {
      console.error('Error deleting response:', err);
      alert('Failed to delete response');
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
      <div className="bg-red-50 border-l-4 border-red-500 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!form || !response) {
    return <div>Response not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Response Details</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Form: {form.title}
          </p>
        </div>
        <div className="space-x-3">
          <Link 
            href={`/dashboard/forms/${formId}/responses`}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Back to Responses
          </Link>
          <button
            onClick={deleteResponse}
            className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-800 transition-colors"
          >
            Delete Response
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Response Information</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Submitted on {formatDate(response.created_at || '')}</p>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {response.respondent_email ? (
                <span>From: {response.respondent_email}</span>
              ) : (
                <span>Anonymous submission</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <dl className="divide-y divide-gray-200 dark:divide-gray-700">
            {form.fields.map((field) => (
              <div key={field.id} className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{field.label}</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                  {renderResponseValue(response.data[field.id], field.type)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* Rendered Template Section */}
      {form.template_id && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Template with Response Data</h2>
          <TemplateRenderer templateId={form.template_id} formResponse={response} />
        </div>
      )}
    </div>
  );
}

function renderResponseValue(value: any, fieldType: string) {
  if (value === undefined || value === null) {
    return <span className="text-gray-400 dark:text-gray-500">No response</span>;
  }
  
  if (Array.isArray(value)) {
    return (
      <ul className="list-disc pl-5">
        {value.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    );
  }
  
  if (fieldType === 'checkbox') {
    if (Array.isArray(value)) {
      return (
        <ul className="list-disc pl-5">
          {value.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      );
    }
    return value;
  }
  
  return value.toString();
} 