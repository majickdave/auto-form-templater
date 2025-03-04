'use client';

import { useEffect, useState, useCallback } from 'react';
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
  placeholder?: string;
  defaultValue?: string | string[];
}

interface FormResponse {
  id: string;
  form_id: string;
  data: Record<string, any>;
  submitted_at: string;
  respondent_email?: string;
}

interface Form {
  id: string;
  title: string;
  description: string;
  fields: FormField[];
  public: boolean;
  created_at: string;
  user_id: string;
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
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedResponse, setSelectedResponse] = useState<FormResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const formId = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';

  // Function to fetch responses
  const fetchResponses = useCallback(async () => {
    setRefreshing(true);
    try {
      const { data: responseData, error: responseError } = await supabase
        .from('form_responses')
        .select('*')
        .eq('form_id', formId)
        .order('submitted_at', { ascending: false });
      
      if (responseError) throw responseError;
      
      setResponses(responseData || []);
      
      // Update selected response if needed
      if (responseData && responseData.length > 0) {
        // If we already have a selected response, try to keep it selected
        if (selectedResponse) {
          const updatedSelectedResponse = responseData.find(r => r.id === selectedResponse.id);
          if (updatedSelectedResponse) {
            setSelectedResponse(updatedSelectedResponse);
          } else {
            // If the previously selected response is no longer available, select the first one
            setSelectedResponse(responseData[0]);
          }
        } else {
          // If no response was selected, select the first one
          setSelectedResponse(responseData[0]);
        }
      } else {
        // If there are no responses, clear the selected response
        setSelectedResponse(null);
      }
    } catch (err: any) {
      console.error('Error fetching responses:', err);
      setError(err.message || 'Failed to load responses');
    } finally {
      setRefreshing(false);
    }
  }, [formId, selectedResponse]);

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
        
        // Fetch responses using the dedicated function
        await fetchResponses();
        
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
    
    if (formId) {
      fetchData();
    }
  }, [formId, router]);

  // Set up real-time subscription for form responses
  useEffect(() => {
    if (!formId) return;
    
    // Subscribe to changes in the form_responses table for this form
    const subscription = supabase
      .channel(`form_responses_${formId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'form_responses',
          filter: `form_id=eq.${formId}`
        },
        (payload) => {
          console.log('Real-time update received:', payload);
          // Refresh the responses when any change occurs
          fetchResponses();
        }
      )
      .subscribe();
    
    // Clean up subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [formId, fetchResponses]);

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Response selector */}
          <div className="md:col-span-1">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Select Response</h2>
                <button
                  onClick={() => fetchResponses()}
                  className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                  title="Refresh responses"
                  disabled={refreshing}
                >
                  {refreshing ? (
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                </button>
              </div>
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
                        {formatDate(response.submitted_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Document generator */}
          <div className="md:col-span-2">
            {selectedResponse && template ? (
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <DocumentGenerator
                  templateContent={template.template_content}
                  formResponses={selectedResponse.data}
                  templateName={template.name}
                  responseId={selectedResponse.id}
                />
              </div>
            ) : selectedResponse && !template ? (
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 text-center">
                <p className="text-gray-500 dark:text-gray-400">No template associated with this form. Cannot generate document.</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 text-center">
                <p className="text-gray-500 dark:text-gray-400">Select a response to generate a document</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 