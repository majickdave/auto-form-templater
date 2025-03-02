'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import DocumentGenerator from '@/components/templates/DocumentGenerator';
import React from 'react';

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
  description?: string;
  fields?: any[];
}

interface PageParams {
  id: string;
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
  const [activeTab, setActiveTab] = useState<'responses' | 'document'>('responses');
  const [copied, setCopied] = useState(false);
  const formId = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      
      try {
        // Get current user
        const { data, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error('Auth error:', userError);
          // If there's a refresh token error, redirect to login
          if (userError.message?.includes('Refresh Token') || userError.code === 'refresh_token_not_found') {
            router.push('/login');
            return;
          }
          throw userError;
        }
        
        if (!data.user) {
          router.push('/login');
          return;
        }
        
        // Fetch form
        const { data: formData, error: formError } = await supabase
          .from('forms')
          .select('*')
          .eq('id', formId)
          .single();
        
        if (formError) {
          if (formError.code === 'PGRST116') {
            notFound();
          } else {
            throw formError;
          }
        }
        
        // Check if user owns this form
        if (formData.user_id !== data.user.id) {
          setError('You do not have permission to view responses for this form');
          setLoading(false);
          return;
        }
        
        setForm(formData);
        
        // Fetch responses
        const { data: responseData, error: responseError } = await supabase
          .from('form_responses')
          .select('*')
          .eq('form_id', formId)
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

        // Select the first response by default if available
        if (responseData && responseData.length > 0) {
          setSelectedResponse(responseData[0]);
        }
        
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    
    if (formId) {
      fetchData();
    }
  }, [formId, router]);

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

  // Copy form link to clipboard
  const copyFormLink = () => {
    const shareUrl = `${window.location.origin}/forms/${formId}`;
    navigator.clipboard.writeText(shareUrl);
    
    // Set copied state to true
    setCopied(true);
    
    // Reset after 3 seconds
    setTimeout(() => {
      setCopied(false);
    }, 3000);
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{form.title}</h1>
          {form.description && (
            <p className="text-gray-600 dark:text-gray-400 mt-1">{form.description}</p>
          )}
          {template && (
            <p className="text-gray-600 dark:text-gray-400">
              Template: {template.name}
            </p>
          )}
        </div>
        <div className="flex space-x-3">
          <Link
            href={`/dashboard/forms/${form.id}`}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Back to Form
          </Link>
          <button
            onClick={copyFormLink}
            className={`px-4 py-2 ${copied ? 'bg-green-600 dark:bg-green-700' : 'bg-blue-600 dark:bg-blue-700'} text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors`}
          >
            {copied ? 'Copied!' : 'Copy Form Link'}
          </button>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('responses')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'responses'
                ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'
            } transition-colors`}
          >
            Responses ({responses.length})
          </button>
          {template && (
            <button
              onClick={() => setActiveTab('document')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'document'
                  ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'
              } transition-colors`}
            >
              Generate Document
            </button>
          )}
        </nav>
      </div>
      
      {responses.length === 0 ? (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 dark:border-yellow-600 p-4 rounded-r-lg">
          <p className="text-yellow-700 dark:text-yellow-500">No responses yet for this form.</p>
          <p className="text-yellow-700 dark:text-yellow-500 mt-2">Share your form to collect responses.</p>
          <button
            onClick={copyFormLink}
            className={`mt-2 px-4 py-2 ${copied ? 'bg-green-600 dark:bg-green-700' : 'bg-blue-600 dark:bg-blue-700'} text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors`}
          >
            {copied ? 'Copied!' : 'Copy Form Link'}
          </button>
        </div>
      ) : (
        <>
          {activeTab === 'responses' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Responses list */}
              <div className="md:col-span-1">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Responses ({responses.length})</h2>
                  
                  <div className="space-y-2">
                    {responses.map((response) => (
                      <div 
                        key={response.id}
                        className={`p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                          selectedResponse?.id === response.id ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''
                        } transition-colors`}
                        onClick={() => setSelectedResponse(response)}
                      >
                        <div className="font-medium text-gray-900 dark:text-white">
                          {response.respondent_email || 'Anonymous'}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
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
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Response Details</h2>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(selectedResponse.created_at)}
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      {form.fields.map((field) => (
                        <div key={field.id} className="border-b border-gray-200 dark:border-gray-700 pb-3 last:border-0">
                          <div className="font-medium text-gray-700 dark:text-gray-300">{field.label}</div>
                          <div className="mt-1 text-gray-900 dark:text-white">
                            {formatResponseValue(getResponseValue(selectedResponse, field))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 text-center">
                    <p className="text-gray-500 dark:text-gray-400">Select a response to view details</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {activeTab === 'document' && template && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Response selector */}
              <div className="md:col-span-1">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Select Response</h2>
                  <div className="space-y-2">
                    {responses.map((response) => (
                      <div
                        key={response.id}
                        className={`p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                          selectedResponse?.id === response.id ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700' : ''
                        } transition-colors`}
                        onClick={() => setSelectedResponse(response)}
                      >
                        <div className="flex justify-between items-center">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {response.respondent_email || 'Anonymous'}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(response.created_at)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Document generator */}
              <div className="md:col-span-2">
                {selectedResponse ? (
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <DocumentGenerator
                      templateContent={template.template_content}
                      formResponses={selectedResponse.data}
                      templateName={template.name}
                    />
                  </div>
                ) : (
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 text-center">
                    <p className="text-gray-500 dark:text-gray-400">Select a response to generate a document</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
} 