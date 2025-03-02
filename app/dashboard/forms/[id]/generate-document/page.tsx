'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import DocumentGenerator from '@/components/templates/DocumentGenerator';

interface FormResponse {
  id: string;
  form_id: string;
  respondent_email: string | null;
  data: Record<string, any>;
  created_at: string;
}

interface Form {
  id: string;
  title: string;
  description: string;
  fields: any[];
  template_id: string | null;
}

interface Template {
  id: string;
  name: string;
  description: string;
  template_content: string;
}

export default function GenerateDocumentPage() {
  const params = useParams();
  const router = useRouter();
  const [form, setForm] = useState<Form | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [selectedResponse, setSelectedResponse] = useState<FormResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
          setError('You do not have permission to access this form');
          setLoading(false);
          return;
        }
        
        setForm(formData);
        
        // Check if form has an associated template
        if (!formData.template_id) {
          setError('This form does not have an associated template');
          setLoading(false);
          return;
        }
        
        // Fetch template
        const { data: templateData, error: templateError } = await supabase
          .from('templates')
          .select('id, name, description, template_content')
          .eq('id', formData.template_id)
          .single();
        
        if (templateError) {
          throw templateError;
        }
        
        setTemplate(templateData);
        
        // Fetch responses
        const { data: responseData, error: responseError } = await supabase
          .from('form_responses')
          .select('*')
          .eq('form_id', params.id)
          .order('created_at', { ascending: false });
        
        if (responseError) {
          throw responseError;
        }
        
        setResponses(responseData || []);
        
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
    
    fetchData();
  }, [params.id, router]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    }).format(date);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
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

  if (!form || !template) {
    return notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Generate Document</h1>
          <p className="text-gray-600 mt-1">
            Form: {form.title}
          </p>
          <p className="text-gray-600">
            Template: {template.name}
          </p>
        </div>
        <div className="space-x-3">
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 btn"
          >
            Back to Dashboard
          </Link>
          <Link
            href={`/dashboard/forms/${form.id}/responses`}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 btn"
          >
            View All Responses
          </Link>
        </div>
      </div>

      {responses.length === 0 ? (
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
          <p className="text-yellow-700">No responses found for this form.</p>
          <p className="text-yellow-700 mt-2">Share your form to collect responses before generating documents.</p>
          <button
            onClick={() => {
              const shareUrl = `${window.location.origin}/forms/${form.id}`;
              navigator.clipboard.writeText(shareUrl);
              alert('Form link copied to clipboard!');
            }}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 btn"
          >
            Copy Form Link
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Response selector */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-xl font-semibold mb-4">Select Response</h2>
            <div className="space-y-2">
              {responses.map((response) => (
                <div
                  key={response.id}
                  className={`p-3 border rounded cursor-pointer hover:bg-gray-50 ${
                    selectedResponse?.id === response.id ? 'bg-blue-50 border-blue-300' : ''
                  } clickable`}
                  onClick={() => setSelectedResponse(response)}
                >
                  <div className="flex justify-between items-center">
                    <div className="font-medium">
                      {response.respondent_email || 'Anonymous'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDate(response.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Document generator */}
          <div className="md:col-span-2">
            {selectedResponse ? (
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <DocumentGenerator
                  templateContent={template.template_content}
                  formResponses={selectedResponse.data}
                  templateName={template.name}
                />
              </div>
            ) : (
              <div className="bg-white p-6 rounded-lg shadow-sm border text-center">
                <p className="text-gray-500">Select a response to generate a document</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 