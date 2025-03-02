'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { notFound } from 'next/navigation';

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
  template_id?: string;
}

interface Template {
  id: string;
  name: string;
  description: string;
  user_id: string;
}

export default function FormEditPage() {
  const params = useParams();
  const router = useRouter();
  const formId = Array.isArray(params.id) ? params.id[0] : params.id;
  
  const [form, setForm] = useState<FormData | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [fields, setFields] = useState<Field[]>([]);
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
        
        // Check if form belongs to current user
        if (data.user_id !== user.id) {
          throw new Error('You do not have permission to edit this form');
        }

        setForm(data);
        setTitle(data.title);
        setDescription(data.description || '');
        setIsPublic(data.public);
        setFields(data.fields || []);
        
        // If form has a template_id, fetch the template
        if (data.template_id) {
          const { data: templateData, error: templateError } = await supabase
            .from('templates')
            .select('*')
            .eq('id', data.template_id)
            .single();
          
          if (!templateError) {
            setTemplate(templateData);
          }
        }
      } catch (err: any) {
        console.error('Error fetching form:', err);
        setError(err.message || 'Failed to load form');
      } finally {
        setLoading(false);
      }
    };

    fetchForm();
  }, [formId, router]);

  const handleSave = async () => {
    if (!form) return;
    
    setSaving(true);
    setError('');
    
    try {
      const { error } = await supabase
        .from('forms')
        .update({
          title,
          description,
          public: isPublic,
          fields
        })
        .eq('id', form.id);

      if (error) throw error;
      
      router.push(`/dashboard/forms/${form.id}`);
      
    } catch (err: any) {
      console.error('Error updating form:', err);
      setError(err.message || 'Failed to save form');
      setSaving(false);
    }
  };

  const addField = () => {
    const newField: Field = {
      id: `field_${Date.now()}`,
      type: 'text',
      label: 'New Field',
      required: false
    };
    
    setFields([...fields, newField]);
  };

  const updateField = (index: number, updates: Partial<Field>) => {
    const updatedFields = [...fields];
    updatedFields[index] = { ...updatedFields[index], ...updates };
    setFields(updatedFields);
  };

  const removeField = (index: number) => {
    const updatedFields = [...fields];
    updatedFields.splice(index, 1);
    setFields(updatedFields);
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) || 
      (direction === 'down' && index === fields.length - 1)
    ) {
      return;
    }
    
    const updatedFields = [...fields];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    [updatedFields[index], updatedFields[newIndex]] = 
      [updatedFields[newIndex], updatedFields[index]];
    
    setFields(updatedFields);
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Edit Form</h1>
        <div className="space-x-3">
          <Link 
            href="/dashboard"
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Cancel
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Form Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium mb-4">Form Settings</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Form Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Enter form title"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={3}
              placeholder="Enter form description"
            />
          </div>
          
          {template && (
            <div className="bg-blue-50 p-4 rounded border border-blue-200">
              <h3 className="text-sm font-medium text-blue-800 mb-1">Associated Template</h3>
              <p className="text-sm text-blue-700">
                This form is associated with the template: <span className="font-medium">{template.name}</span>
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Note: Each template can only be associated with one form. The template association cannot be changed.
              </p>
            </div>
          )}
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isPublic"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-700">
              Make this form public (anyone with the link can view and submit)
            </label>
          </div>
        </div>
      </div>

      {/* Form Fields */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">Form Fields</h2>
          <button
            onClick={addField}
            className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
          >
            Add Field
          </button>
        </div>
        
        {fields.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No fields added yet. Click "Add Field" to start building your form.
          </div>
        ) : (
          <div className="space-y-6">
            {fields.map((field, index) => (
              <div key={field.id} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between mb-3">
                  <h3 className="font-medium">Field #{index + 1}</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => moveField(index, 'up')}
                      disabled={index === 0}
                      className="text-gray-600 hover:text-gray-900 disabled:opacity-30"
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveField(index, 'down')}
                      disabled={index === fields.length - 1}
                      className="text-gray-600 hover:text-gray-900 disabled:opacity-30"
                      title="Move down"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => removeField(index)}
                      className="text-red-600 hover:text-red-800"
                      title="Remove field"
                    >
                      ×
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Field Label</label>
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => updateField(index, { label: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Field Type</label>
                    <select
                      value={field.type}
                      onChange={(e) => updateField(index, { type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="text">Text</option>
                      <option value="textarea">Textarea</option>
                      <option value="select">Dropdown</option>
                      <option value="radio">Radio Buttons</option>
                      <option value="checkbox">Checkboxes</option>
                    </select>
                  </div>
                  
                  {(field.type === 'text' || field.type === 'textarea') && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Placeholder (optional)</label>
                      <input
                        type="text"
                        value={field.placeholder || ''}
                        onChange={(e) => updateField(index, { placeholder: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  )}
                  
                  {(field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1">Options (one per line)</label>
                      <textarea
                        value={(field.options || []).join('\n')}
                        onChange={(e) => updateField(index, { 
                          options: e.target.value.split('\n').filter(opt => opt.trim() !== '') 
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        rows={3}
                      />
                    </div>
                  )}
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id={`required-${field.id}`}
                      checked={field.required}
                      onChange={(e) => updateField(index, { required: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor={`required-${field.id}`} className="ml-2 block text-sm text-gray-700">
                      Required field
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 