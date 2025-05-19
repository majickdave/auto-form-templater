'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Select from 'react-select';

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
}

export default function NewResponsePage() {
  const params = useParams();
  const router = useRouter();
  const formId = Array.isArray(params.id) ? params.id[0] : params.id;
  
  const [form, setForm] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    if (!formId) {
      notFound();
      return;
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
        
        // Check if form is public or belongs to current user
        if (!data.public && data.user_id !== user.id) {
          throw new Error('You do not have permission to view this form');
        }

        setForm(data);
      } catch (err: any) {
        console.error('Error fetching form:', err);
        setError(err.message || 'Failed to load form');
      } finally {
        setLoading(false);
      }
    };

    fetchForm();
  }, [formId, router]);

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

  const handleMultiselectChange = (fieldId: string, selectedOptions: any) => {
    const values = selectedOptions ? selectedOptions.map((option: any) => option.value) : [];
    setFormValues(prev => ({
      ...prev,
      [fieldId]: values
    }));
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

  if (isSubmitted) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">Your response has been submitted successfully!</p>
            </div>
          </div>
        </div>
        <div className="text-center">
          <Link
            href={`/dashboard/forms/${formId}`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Back to Form
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href={`/dashboard/forms/${formId}`}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Form
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b">
          <h1 className="text-2xl font-bold text-gray-900">{form.title}</h1>
          {form.description && (
            <p className="mt-1 text-gray-600">{form.description}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {submitError && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{submitError}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {form.fields.map((field) => (
              <div key={field.id}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>

                {field.type === 'text' && (
                  <input
                    type="text"
                    placeholder={field.placeholder}
                    value={formValues[field.id] || ''}
                    onChange={(e) => setFormValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required={field.required}
                  />
                )}

                {field.type === 'textarea' && (
                  <textarea
                    placeholder={field.placeholder}
                    value={formValues[field.id] || ''}
                    onChange={(e) => setFormValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    required={field.required}
                  />
                )}

                {field.type === 'select' && (
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formValues[field.id] || ''}
                    onChange={(e) => setFormValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                    required={field.required}
                  >
                    <option value="">Select an option</option>
                    {field.options?.map((option, i) => (
                      <option key={i} value={option}>{option}</option>
                    ))}
                  </select>
                )}

                {field.type === 'multiselect' && (
                  <Select
                    isMulti
                    options={field.options?.map(option => ({ value: option, label: option })) || []}
                    value={field.options
                      ?.filter(option => formValues[field.id]?.includes(option))
                      .map(option => ({ value: option, label: option })) || []}
                    onChange={(selected) => handleMultiselectChange(field.id, selected)}
                    placeholder="Select options..."
                    className="react-select-container"
                    classNamePrefix="react-select"
                    styles={{
                      control: (base) => ({
                        ...base,
                        borderColor: '#D1D5DB',
                        '&:hover': {
                          borderColor: '#9CA3AF'
                        }
                      }),
                      option: (base, state) => ({
                        ...base,
                        backgroundColor: state.isSelected
                          ? '#3B82F6'
                          : state.isFocused
                          ? '#EFF6FF'
                          : 'white',
                        color: state.isSelected ? 'white' : '#1F2937',
                        '&:hover': {
                          backgroundColor: state.isSelected ? '#2563EB' : '#EFF6FF'
                        }
                      }),
                      multiValue: (base) => ({
                        ...base,
                        backgroundColor: '#EFF6FF'
                      }),
                      multiValueLabel: (base) => ({
                        ...base,
                        color: '#1E40AF'
                      }),
                      multiValueRemove: (base) => ({
                        ...base,
                        color: '#1E40AF',
                        '&:hover': {
                          backgroundColor: '#DBEAFE',
                          color: '#1E3A8A'
                        }
                      })
                    }}
                  />
                )}

                {field.type === 'radio' && field.options?.map((option, i) => (
                  <div key={i} className="flex items-center mt-2">
                    <input
                      type="radio"
                      name={`field-${field.id}`}
                      value={option}
                      checked={formValues[field.id] === option}
                      onChange={(e) => setFormValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                      required={field.required}
                    />
                    <label className="ml-2 text-sm text-gray-700">{option}</label>
                  </div>
                ))}

                {field.type === 'checkbox' && field.options?.map((option, i) => {
                  const currentValues = Array.isArray(formValues[field.id]) ? formValues[field.id] : [];
                  return (
                    <div key={i} className="flex items-center mt-2">
                      <input
                        type="checkbox"
                        value={option}
                        checked={currentValues.includes(option)}
                        onChange={(e) => {
                          const newValues = e.target.checked
                            ? [...currentValues, option]
                            : currentValues.filter((v: string) => v !== option);
                          setFormValues(prev => ({ ...prev, [field.id]: newValues }));
                        }}
                        className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <label className="ml-2 text-sm text-gray-700">{option}</label>
                    </div>
                  );
                })}

                {field.type === 'date' && (
                  <input
                    type="date"
                    value={formValues[field.id] || ''}
                    onChange={(e) => setFormValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required={field.required}
                  />
                )}

                {field.type === 'number' && (
                  <input
                    type="number"
                    placeholder={field.placeholder}
                    value={formValues[field.id] || ''}
                    onChange={(e) => setFormValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required={field.required}
                  />
                )}

                {field.type === 'email' && (
                  <input
                    type="email"
                    placeholder={field.placeholder}
                    value={formValues[field.id] || ''}
                    onChange={(e) => setFormValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required={field.required}
                  />
                )}
              </div>
            ))}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Email (optional)
              </label>
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                We'll use this to send you a copy of your response
              </p>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Response'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
} 