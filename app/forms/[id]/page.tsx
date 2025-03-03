'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import React from 'react';
import DocumentGenerator from '@/components/templates/DocumentGenerator';

export default function PublicFormPage() {
  const params = useParams();
  const router = useRouter();
  const [formId, setFormId] = useState<string>('');
  const [form, setForm] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');
  const [template, setTemplate] = useState<any>(null);
  const [submittedData, setSubmittedData] = useState<Record<string, any>>({});

  useEffect(() => {
    if (params && params.id) {
      setFormId(typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '');
    }
  }, [params]);

  useEffect(() => {
    if (!formId) return;
    
    const fetchForm = async () => {
      try {
        const { data, error } = await supabase
          .from('forms')
          .select('*')
          .eq('id', formId)
          .single();

        if (error) throw error;
        
        if (!data.public) {
          const { data: { user } } = await supabase.auth.getUser();
          
          if (!user || user.id !== data.user_id) {
            throw new Error('This form is private');
          }
        }

        setForm(data);
        
        if (data.template_id) {
          const { data: templateData, error: templateError } = await supabase
            .from('templates')
            .select('*')
            .eq('id', data.template_id)
            .single();
            
          if (!templateError && templateData) {
            setTemplate(templateData);
          }
        }
        
        const initialData: Record<string, any> = {};
        
        // Use metadata inside each field if available, otherwise fall back to field properties
        data.fields.forEach((field: any) => {
          if (field.metadata && field.metadata.default_value !== null && field.metadata.default_value !== undefined) {
            initialData[field.id] = field.metadata.default_value;
          } else if (field.defaultValue) {
            initialData[field.id] = field.defaultValue;
          }
        });
        
        setFormData(initialData);
        
      } catch (err: any) {
        console.error('Error fetching form:', err);
        setError(err.message || 'Failed to load form');
      } finally {
        setLoading(false);
      }
    };

    fetchForm();
  }, [formId]);

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData({
      ...formData,
      [fieldId]: value,
    });
  };

  const handleCheckboxChange = (fieldId: string, option: string, checked: boolean) => {
    const currentValues = Array.isArray(formData[fieldId]) ? [...formData[fieldId]] : [];
    
    if (checked) {
      if (!currentValues.includes(option)) {
        currentValues.push(option);
      }
    } else {
      const index = currentValues.indexOf(option);
      if (index !== -1) {
        currentValues.splice(index, 1);
      }
    }
    
    setFormData({
      ...formData,
      [fieldId]: currentValues,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const missingFields = form.fields
        .filter((field: any) => field.required && 
          (formData[field.id] === undefined || 
           formData[field.id] === '' || 
           (Array.isArray(formData[field.id]) && formData[field.id].length === 0)))
        .map((field: any) => field.label);

      if (missingFields.length > 0) {
        throw new Error(`Please fill in the following required fields: ${missingFields.join(', ')}`);
      }

      const labeledData: Record<string, any> = {};
      
      Object.keys(formData).forEach(fieldId => {
        labeledData[fieldId] = formData[fieldId];
      });
      
      form.fields.forEach((field: any) => {
        if (formData[field.id] !== undefined) {
          labeledData[field.label] = formData[field.id];
        }
      });

      const { error } = await supabase
        .from('form_responses')
        .insert({
          form_id: form.id,
          respondent_email: email,
          data: labeledData,
          submitted_at: new Date().toISOString()
        });

      if (error) throw error;

      setSubmittedData(labeledData);
      
      setSuccess(true);
      window.scrollTo(0, 0);
      
    } catch (err: any) {
      console.error('Error submitting form:', err);
      setError(err.message || 'Failed to submit form');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4">
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <p className="text-red-700">{error}</p>
          <Link href="/" className="text-blue-600 hover:underline mt-2 inline-block link-hover">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4">
        <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-lg">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-green-800 mb-4">Form Submitted Successfully!</h2>
            <p className="text-green-700">Thank you for your response.</p>
          </div>
          
          {template && template.template_content && (
            <div className="mt-8 bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-xl font-semibold mb-4">Your Document Preview</h3>
              <p className="text-gray-600 mb-6">
                Here's a preview of your document based on the information you provided:
              </p>
              
              <div className="bg-gray-50 p-4 rounded border">
                <DocumentGenerator
                  templateContent={template.template_content}
                  formResponses={submittedData}
                  templateName={template.name || 'Document'}
                />
              </div>
            </div>
          )}
          
          <div className="mt-6 text-center">
            <Link 
              href="/" 
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 btn"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
          <h1 className="text-2xl font-bold text-white">{form.title}</h1>
        </div>
        
        <div className="p-6">
          {form.description && (
            <div className="mb-6 text-gray-600">{form.description}</div>
          )}
          
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
              <p className="text-red-700">{error}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div className="border-b border-gray-200 pb-4">
                <label className="block text-sm font-medium mb-1">
                  Your Email (optional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <p className="text-xs text-gray-500 mt-1">
                  We'll use this to follow up with you if necessary.
                </p>
              </div>
              
              {form.fields.map((field: any) => (
                <div key={field.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                  <label className="block text-sm font-medium mb-1">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  
                  {field.type === 'text' && (
                    <input
                      type="text"
                      placeholder={field.placeholder}
                      value={formData[field.id] || ''}
                      onChange={(e) => handleFieldChange(field.id, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required={field.required}
                    />
                  )}
                  
                  {field.type === 'textarea' && (
                    <textarea
                      placeholder={field.placeholder}
                      value={formData[field.id] || ''}
                      onChange={(e) => handleFieldChange(field.id, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      rows={4}
                      required={field.required}
                    />
                  )}
                  
                  {field.type === 'select' && field.options && (
                    <select
                      value={formData[field.id] || ''}
                      onChange={(e) => handleFieldChange(field.id, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required={field.required}
                    >
                      <option value="">Select an option</option>
                      {field.options.map((option: string) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  )}
                  
                  {field.type === 'checkbox' && field.options && (
                    <div className="space-y-2 mt-2">
                      {field.options.map((option: string) => (
                        <div key={option} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`${field.id}-${option}`}
                            checked={Array.isArray(formData[field.id]) && formData[field.id].includes(option)}
                            onChange={(e) => handleCheckboxChange(field.id, option, e.target.checked)}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                          />
                          <label htmlFor={`${field.id}-${option}`} className="ml-2 text-sm text-gray-700">
                            {option}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {field.type === 'radio' && field.options && (
                    <div className="space-y-2 mt-2">
                      {field.options.map((option: string) => (
                        <div key={option} className="flex items-center">
                          <input
                            type="radio"
                            id={`${field.id}-${option}`}
                            name={field.id}
                            value={option}
                            checked={formData[field.id] === option}
                            onChange={(e) => handleFieldChange(field.id, e.target.value)}
                            className="h-4 w-4 text-blue-600 border-gray-300"
                            required={field.required && !formData[field.id]}
                          />
                          <label htmlFor={`${field.id}-${option}`} className="ml-2 text-sm text-gray-700">
                            {option}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {field.type === 'number' && (
                    <input
                      type="number"
                      placeholder={field.placeholder}
                      value={formData[field.id] || ''}
                      onChange={(e) => handleFieldChange(field.id, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required={field.required}
                    />
                  )}
                  
                  {field.type === 'email' && (
                    <input
                      type="email"
                      placeholder={field.placeholder}
                      value={formData[field.id] || ''}
                      onChange={(e) => handleFieldChange(field.id, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required={field.required}
                    />
                  )}
                </div>
              ))}
              
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 btn"
                >
                  {submitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 