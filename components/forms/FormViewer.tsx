'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

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
}

export default function FormViewer({ formId, isOwner = false }: { formId: string; isOwner?: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [responseCount, setResponseCount] = useState(0);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);

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
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${
              form.public 
                ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
            }`}
          >
            {form.public ? 'Public' : 'Private'}
          </button>
          <Link 
            href={`/dashboard/forms/${formId}/edit`}
            className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 text-sm font-medium"
          >
            Edit Form
          </Link>
          <Link 
            href={`/dashboard/forms/${formId}/responses`}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
          >
            View Responses ({responseCount})
          </Link>
          <button
            onClick={deleteForm}
            className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
          >
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
