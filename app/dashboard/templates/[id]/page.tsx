'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface TemplateField {
  id: string;
  type: string;
  name: string;
  label: string;
  required: boolean;
  options?: string[];
  defaultValue?: string;
}

interface Template {
  id: string;
  user_id: string;
  name: string;
  description: string;
  template_content: string;
  fields?: TemplateField[];
  created_at: string;
  form_id?: string | null;
}

interface Form {
  id: string;
  title: string;
  description?: string;
  fields: TemplateField[];
}

export default function TemplateViewPage() {
  const params = useParams();
  const router = useRouter();
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [associatedForm, setAssociatedForm] = useState<Form | null>(null);

  useEffect(() => {
    async function fetchTemplate() {
      setLoading(true);
      
      try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          router.push('/login');
          return;
        }
        
        // Fetch template
        const { data, error: templateError } = await supabase
          .from('templates')
          .select('*')
          .eq('id', params.id)
          .single();
        
        if (templateError) {
          if (templateError.code === 'PGRST116') {
            notFound();
          } else {
            throw templateError;
          }
        }
        
        // Check if user owns this template
        if (data.user_id !== user.id) {
          setError('You do not have permission to view this template');
          setLoading(false);
          return;
        }
        
        setTemplate(data);
        
        // Check if this template has an associated form
        if (data.form_id) {
          const { data: formData, error: formError } = await supabase
            .from('forms')
            .select('id, title, description, fields')
            .eq('id', data.form_id)
            .single();
            
          if (!formError && formData) {
            setAssociatedForm(formData);
          }
        } else {
          // Check if this template is associated with a form via template_id
          const { data: formData, error: formError } = await supabase
            .from('forms')
            .select('id, title, description, fields')
            .eq('template_id', data.id)
            .limit(1);
            
          if (!formError && formData && formData.length > 0) {
            setAssociatedForm(formData[0]);
          }
        }
        
        // Initialize form data with default values
        const initialData: Record<string, any> = {};
        if (data.fields) {
          data.fields.forEach((field: TemplateField) => {
            initialData[field.name] = field.defaultValue || '';
          });
        }
        setFormData(initialData);
        
      } catch (err: any) {
        console.error('Error fetching template:', err);
        setError(err.message || 'Failed to load template');
      } finally {
        setLoading(false);
      }
    }
    
    if (params.id) {
      fetchTemplate();
    }
  }, [params.id, router]);

  const handleInputChange = (fieldName: string, value: any) => {
    setFormData({
      ...formData,
      [fieldName]: value
    });
  };

  const handleCreateForm = async () => {
    if (!template) return;
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('User not authenticated');

      // Check if a form already exists for this template
      const { data: existingForms, error: checkError } = await supabase
        .from('forms')
        .select('id')
        .eq('template_id', template.id)
        .limit(1);
      
      if (checkError) throw checkError;
      
      // If a form already exists, redirect to it
      if (existingForms && existingForms.length > 0) {
        router.push(`/dashboard/forms/${existingForms[0].id}/edit`);
        return;
      }

      // Create a new form based on this template
      const { data, error } = await supabase
        .from('forms')
        .insert({
          title: `${template.name} Form`,
          description: template.description,
          user_id: user.id,
          template_id: template.id,
          fields: template.fields || [],
          public: false,
        })
        .select();

      if (error) throw error;

      // Redirect to the form edit page
      router.push(`/dashboard/forms/${data[0].id}/edit`);
      
    } catch (err: any) {
      console.error('Error creating form from template:', err);
      setError(err.message || 'Failed to create form');
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
        <p className="text-red-700">{error}</p>
        <Link href="/dashboard" className="text-blue-600 hover:underline mt-2 inline-block">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  if (!template) {
    return notFound();
  }

  // Function to render the template content with field placeholders highlighted
  const renderTemplateContent = () => {
    if (!template.template_content) return null;
    
    // Split content by field placeholders
    const parts = template.template_content.split(/(\{\{[^}]+\}\})/g);
    
    return parts.map((part, index) => {
      // Check if this part is a field placeholder
      const match = part.match(/\{\{([^}]+)\}\}/);
      if (match) {
        const fieldName = match[1];
        return (
          <span key={index} className="bg-yellow-100 px-1 rounded">
            {part}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{template.name}</h1>
        <div className="space-x-3">
          {associatedForm ? (
            <>
              <div className="text-sm text-gray-600 mb-2">
                This template is associated with form: <span className="font-medium">{associatedForm.title}</span>
              </div>
              <Link
                href={`/dashboard/forms/${associatedForm.id}`}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                View Form
              </Link>
              <Link
                href={`/dashboard/forms/${associatedForm.id}/responses`}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                View Responses
              </Link>
              <Link
                href={`/dashboard/templates/${template.id}/edit`}
                className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
              >
                Edit Template
              </Link>
            </>
          ) : (
            <>
              <div className="text-sm text-gray-600 mb-2">
                This template is not associated with any form yet
              </div>
              <button
                onClick={handleCreateForm}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Create Form from Template
              </button>
              <Link
                href={`/dashboard/templates/${template.id}/edit`}
                className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
              >
                Edit Template
              </Link>
              <Link
                href="/dashboard"
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Back to Dashboard
              </Link>
            </>
          )}
        </div>
      </div>
      
      {template.description && (
        <p className="text-gray-600">{template.description}</p>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Template content preview */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-4">Template Content</h2>
          <div className="whitespace-pre-wrap font-mono text-sm border p-4 rounded bg-gray-50 min-h-[200px]">
            {renderTemplateContent()}
          </div>
        </div>
        
        {/* Template fields */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-4">Available Fields</h2>
          
          {template.fields && template.fields.length > 0 ? (
            <div className="space-y-4">
              {template.fields.map((field) => (
                <div key={field.id} className="border rounded-md p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </h3>
                    <span className="text-sm text-gray-500">{field.type}</span>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-2">
                    Field name: <code className="bg-gray-100 px-1 rounded">{field.name}</code>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    Placeholder: <code className="bg-gray-100 px-1 rounded">{`{{${field.name}}}`}</code>
                  </div>
                  
                  {field.type === 'select' && field.options && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600">Options:</p>
                      <ul className="list-disc list-inside text-sm text-gray-600 ml-2">
                        {field.options.map((option, index) => (
                          <li key={index}>{option}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No fields defined for this template.</p>
          )}
        </div>
      </div>
    </div>
  );
} 