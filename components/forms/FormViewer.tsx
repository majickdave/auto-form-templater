'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface FormField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  defaultValue?: string | string[];
  metadata?: {
    label: string;
    type: string;
    default_value: string | string[] | null;
    required: boolean;
    options: string[] | null;
    placeholder: string | null;
  };
}

interface FormData {
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

export default function FormViewer({ formId, isOwner = false }: { formId: string; isOwner?: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responseCount, setResponseCount] = useState(0);
  const [isPublicToggling, setIsPublicToggling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    // Generate share URL
    if (typeof window !== 'undefined') {
      setShareUrl(`${window.location.origin}/forms/${formId}`);
    }

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

        if (error) throw error;
        
        // Check if form belongs to current user or if isOwner is true
        if (!isOwner && data.user_id !== user.id) {
          throw new Error('You do not have permission to view this form');
        }

        setForm(data);

        // Fetch response count
        const { count, error: countError } = await supabase
          .from('form_responses')
          .select('id', { count: 'exact', head: true })
          .eq('form_id', formId);
          
        if (!countError && count !== null) {
          setResponseCount(count);
        }
      } catch (err: any) {
        console.error('Error fetching form:', err);
        setError(err.message || 'Failed to load form');
      } finally {
        setLoading(false);
      }
    };

    fetchForm();
  }, [formId, router, isOwner]);

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const togglePublicStatus = async () => {
    if (!form) return;
    
    try {
      const { error } = await supabase
        .from('forms')
        .update({ public: !form.public })
        .eq('id', form.id);

      if (error) throw error;
      
      // Update local state
      setForm({ ...form, public: !form.public });
      
    } catch (err: any) {
      console.error('Error updating form:', err);
      alert('Failed to update form status');
    }
  };

  const deleteForm = async () => {
    if (!form) return;
    
    if (!confirm('Are you sure you want to delete this form? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('forms')
        .delete()
        .eq('id', form.id);

      if (error) throw error;
      
      // Redirect to dashboard
      router.push('/dashboard');
      
    } catch (err: any) {
      console.error('Error deleting form:', err);
      alert('Failed to delete form');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      // Validate required fields
      const requiredFields = form?.fields.filter(field => field.required) || [];
      for (const field of requiredFields) {
        if (!formValues[field.id] && formValues[field.id] !== 0) {
          throw new Error(`${field.label} is required`);
        }
      }
      
      // Submit form response
      const { error } = await supabase
        .from('form_responses')
        .insert([
          {
            form_id: formId,
            data: formValues,
            respondent_email: userEmail,
            submitted_at: new Date().toISOString()
          }
        ]);
      
      if (error) throw error;
      
      setIsSubmitted(true);
      setFormValues({});
    } catch (error: any) {
      console.error('Error submitting form:', error);
      setSubmitError(error.message);
    } finally {
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

  if (!form) {
    return <div>Form not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Form Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">{form.title}</h1>
          {form.description && <p className="text-gray-600 mt-1">{form.description}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={togglePublicStatus}
            className={`px-3 py-1.5 rounded-md text-sm font-medium bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border shadow-sm flex items-center gap-2`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {form.public ? 'Public' : 'Private'}
          </button>
          {isOwner && (
            <div className="flex space-x-3 mt-4">
              <Link
                href={`/dashboard/forms/${formId}`}
                className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border shadow-sm flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Form
              </Link>
              <Link
                href={`/dashboard/forms/${formId}/responses`}
                className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border shadow-sm flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                View Responses
              </Link>
            </div>
          )}
          <button
            onClick={deleteForm}
            className="px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border shadow-sm flex items-center gap-2 text-sm font-medium"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        </div>
      </div>

      {/* Share Link */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="mb-2 flex justify-between items-center">
          <h2 className="text-sm font-medium text-gray-700">Share Form</h2>
          <div className={`text-xs ${form.public ? 'text-green-600' : 'text-yellow-600'} font-medium`}>
            {form.public ? 'Anyone with the link can view' : 'Only you can view'}
          </div>
        </div>
        
        <div className="flex">
          <input
            type="text"
            readOnly
            value={shareUrl}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-sm"
          />
          <button
            onClick={copyShareLink}
            className={`px-4 py-2 rounded-r-md text-sm font-medium ${
              copied 
                ? 'bg-green-500 text-white' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>
      </div>

      {/* Form Preview */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b">
          <h2 className="text-lg font-medium">Form Preview</h2>
          <p className="text-sm text-gray-500">This is how your form will appear to respondents</p>
        </div>
        
        <div className="p-6">
          <div className="bg-white border rounded-lg shadow-sm p-6">
            <h3 className="text-xl font-medium mb-4">{form.title}</h3>
            {form.description && <p className="text-gray-600 mb-6">{form.description}</p>}
            
            <div className="space-y-6">
              {form.fields.map((field) => (
                <div key={field.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                  <label className="block text-sm font-medium mb-1">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  
                  {field.type === 'text' && (
                    <input
                      type="text"
                      placeholder={field.placeholder}
                      defaultValue={field.defaultValue as string}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      disabled
                    />
                  )}
                  
                  {field.type === 'textarea' && (
                    <textarea
                      placeholder={field.placeholder}
                      defaultValue={field.defaultValue as string}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      rows={3}
                      disabled
                    />
                  )}
                  
                  {field.type === 'select' && (
                    <select 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      defaultValue={field.defaultValue as string}
                      disabled
                    >
                      <option value="">Select an option</option>
                      {field.options?.map((option, i) => (
                        <option key={i} value={option}>{option}</option>
                      ))}
                    </select>
                  )}
                  
                  {field.type === 'radio' && field.options?.map((option, i) => (
                    <div key={i} className="flex items-center mt-2">
                      <input
                        type="radio"
                        name={`field-${field.id}`}
                        value={option}
                        defaultChecked={field.defaultValue === option}
                        className="h-4 w-4 text-blue-600"
                        disabled
                      />
                      <label className="ml-2 text-sm text-gray-700">{option}</label>
                    </div>
                  ))}
                  
                  {field.type === 'checkbox' && field.options?.map((option, i) => {
                    const defaultValues = Array.isArray(field.defaultValue) 
                      ? field.defaultValue 
                      : field.defaultValue ? [field.defaultValue] : [];
                    
                    return (
                      <div key={i} className="flex items-center mt-2">
                        <input
                          type="checkbox"
                          value={option}
                          defaultChecked={defaultValues.includes(option)}
                          className="h-4 w-4 text-blue-600 rounded"
                          disabled
                        />
                        <label className="ml-2 text-sm text-gray-700">{option}</label>
                      </div>
                    );
                  })}
                  
                  {field.type === 'date' && (
                    <input
                      type="date"
                      defaultValue={field.defaultValue as string}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      disabled
                    />
                  )}
                  
                  {field.type === 'number' && (
                    <input
                      type="number"
                      placeholder={field.placeholder}
                      defaultValue={field.defaultValue as string}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      disabled
                    />
                  )}
                  
                  {field.type === 'email' && (
                    <input
                      type="email"
                      placeholder={field.placeholder}
                      defaultValue={field.defaultValue as string}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      disabled
                    />
                  )}
                </div>
              ))}
              
              <div className="pt-4">
                <button
                  type="button"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  disabled
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Quick Stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium mb-4">Form Stats</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-600 font-medium">Total Responses</p>
            <p className="text-2xl font-bold">{responseCount}</p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-green-600 font-medium">Fields</p>
            <p className="text-2xl font-bold">{form.fields.length}</p>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-sm text-purple-600 font-medium">Created</p>
            <p className="text-sm font-medium">{new Date(form.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex justify-between">
        <Link 
          href="/dashboard" 
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
        >
          Back to Dashboard
        </Link>
        
        <Link 
          href={form.public ? `/forms/${form.id}` : '#'} 
          target={form.public ? "_blank" : ""}
          className={`px-4 py-2 rounded-md ${
            form.public 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
          onClick={(e) => {
            if (!form.public) {
              e.preventDefault();
              alert('Make the form public first to preview it');
            }
          }}
        >
          {form.public ? 'Open Public Form' : 'Make Public to Preview'}
        </Link>
      </div>
    </div>
  );
}
