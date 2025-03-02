'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import DocumentGenerator from '@/components/templates/DocumentGenerator';

interface FormField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  options?: string[];
}

interface FormResponse {
  id: string;
  form_id: string;
  data: Record<string, any>;
  created_at: string;
  respondent_email?: string;
}

interface Form {
  id: string;
  title: string;
  description: string;
  fields: FormField[];
  template_id?: string;
  user_id: string;
}

interface Template {
  id: string;
  name: string;
  template_content: string;
  fields: any[];
}

export default function FormResponsesPage() {
  const params = useParams();
  const router = useRouter();
  const [form, setForm] = useState<Form | null>(null);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedResponse, setSelectedResponse] = useState<FormResponse | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      
      try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          router.push('/login');
          return;
        }
        
        // Fetch form
        const { data: formData, error: formError } = await supabase
          .from('forms')
          .select('*')
          .eq('id', params.id)
          .single();
        
        if (formError) {
          if (formError.code === 'PGRST116') {
            notFound();
          } else {
            throw formError;
          }
        }
        
        // Check if user owns this form
        if (formData.user_id !== user.id) {
          setError('You do not have permission to view responses for this form');
          setLoading(false);
          return;
        }
        
        setForm(formData);
        
        // Fetch responses
        const { data: responseData, error: responseError } = await supabase
          .from('form_responses')
          .select('*')
          .eq('form_id', params.id)
          .order('created_at', { ascending: false });
        
        if (responseError) throw responseError;
        
        setResponses(responseData || []);
        
        // If form has a template_id, fetch the template
        if (formData.template_id) {
          const { data: templateData, error: templateError } = await supabase
            .from('templates')
            .select('*')
            .eq('id', formData.template_id)
            .single();
          
          if (!templateError) {
            setTemplate(templateData);
          }
        }
        
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    
    if (params.id) {
      fetchData();
    }
  }, [params.id, router]);

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Format response data for display
  const formatResponseValue = (value: any) => {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    
    if (value === null || value === undefined) {
      return '-';
    }
    
    return String(value);
  };

  // Get response value by field ID or label
  const getResponseValue = (response: FormResponse, field: FormField) => {
    // First try to get by ID (for backward compatibility)
    if (response.data[field.id] !== undefined) {
      return response.data[field.id];
    }
    
    // Then try to get by label (new format)
    if (response.data[field.label] !== undefined) {
      return response.data[field.label];
    }
    
    return null;
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
        <p className="text-red-700">{error}</p>
        <Link href="/dashboard" className="text-blue-600 hover:underline mt-2 inline-block link-hover">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  if (!form) {
    return notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{form.title} - Responses</h1>
          {form.description && (
            <p className="text-gray-600 mt-1">{form.description}</p>
          )}
        </div>
        <Link
          href={`/dashboard/forms/${form.id}`}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 btn"
        >
          Back to Form
        </Link>
      </div>
      
      {responses.length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow-sm border text-center">
          <p className="text-gray-500">No responses yet for this form.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Responses list */}
          <div className="md:col-span-1">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h2 className="text-xl font-semibold mb-4">Responses ({responses.length})</h2>
              
              <div className="space-y-2">
                {responses.map((response) => (
                  <div 
                    key={response.id}
                    className={`p-3 border rounded cursor-pointer hover:bg-gray-50 ${
                      selectedResponse?.id === response.id ? 'ring-2 ring-blue-500' : ''
                    } clickable`}
                    onClick={() => setSelectedResponse(response)}
                  >
                    <div className="font-medium">
                      {response.respondent_email || 'Anonymous'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDate(response.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Response details */}
          <div className="md:col-span-2">
            {selectedResponse ? (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <h2 className="text-xl font-semibold mb-4">Response Details</h2>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm text-gray-500">
                      <div>
                        <span className="font-medium">Submitted by:</span> {selectedResponse.respondent_email || 'Anonymous'}
                      </div>
                      <div>
                        <span className="font-medium">Date:</span> {formatDate(selectedResponse.created_at)}
                      </div>
                    </div>
                    
                    <div className="border-t pt-4">
                      <h3 className="font-medium mb-3">Form Responses</h3>
                      
                      <div className="space-y-3">
                        {form.fields.map((field) => (
                          <div key={field.id} className="grid grid-cols-3 gap-4">
                            <div className="font-medium">{field.label}</div>
                            <div className="col-span-2">
                              {formatResponseValue(getResponseValue(selectedResponse, field))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Document generation section */}
                {template && (
                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <DocumentGenerator
                      templateContent={template.template_content}
                      formResponses={selectedResponse.data}
                      templateName={template.name}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white p-6 rounded-lg shadow-sm border text-center">
                <p className="text-gray-500">Select a response to view details</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 