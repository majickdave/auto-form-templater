'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';

interface Template {
  id: string;
  user_id: string;
  name: string;
  description: string;
  template_content: string;
  created_at: string;
  form_id?: string | null;
}

export default function EditTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [templateContent, setTemplateContent] = useState('');
  const [fieldLabels, setFieldLabels] = useState<Record<string, string>>({});
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);

  // Extract field placeholders from template content
  const extractFieldLabels = (content: string) => {
    const regex = /{{([^}]+)}}/g;
    let match;
    const fields: Record<string, string> = {};
    
    while ((match = regex.exec(content)) !== null) {
      const fieldName = match[1].trim();
      // Convert field name to a valid ID (lowercase, no spaces)
      const fieldId = fieldName.toLowerCase().replace(/\s+/g, '_');
      fields[fieldId] = fieldName;
    }
    
    return fields;
  };

  // Update field labels when content changes
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setTemplateContent(newContent);
    
    // Extract field labels from the content
    const extractedFields = extractFieldLabels(newContent);
    setFieldLabels(extractedFields);
  };

  // Fetch template data on component mount
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
          setError('You do not have permission to edit this template');
          setLoading(false);
          return;
        }
        
        // Set template data
        setTemplate(data);
        setName(data.name || '');
        setDescription(data.description || '');
        setTemplateContent(data.template_content || '');
        
        // Extract field labels from the content
        const extractedFields = extractFieldLabels(data.template_content || '');
        setFieldLabels(extractedFields);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // Validate form
      if (!name.trim()) {
        throw new Error('Please enter a template name');
      }

      if (!templateContent.trim()) {
        throw new Error('Please enter template content');
      }

      // Validate template content format
      if (templateContent.includes('{{') && !templateContent.includes('}}')) {
        throw new Error('Template content has unclosed placeholder tags. Make sure all {{tags}} are properly closed.');
      }

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        router.push('/login');
        return;
      }

      if (!template) {
        throw new Error('Template not found');
      }

      // Extract field labels from the content
      const fieldLabels = extractFieldLabels(templateContent);

      // Update template in the database
      const { error } = await supabase
        .from('templates')
        .update({
          name,
          description,
          template_content: templateContent,
        })
        .eq('id', template.id);

      if (error) {
        throw error;
      }

      // Show success message
      toast.success('Template updated successfully!');
      
      // Redirect to the template page
      router.push(`/dashboard/templates/${template.id}`);
      
    } catch (err: any) {
      console.error('Error updating template:', err);
      setError(err.message || 'Failed to update template');
      toast.error(err.message || 'Failed to update template');
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

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Edit Template</h1>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Template Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter template name"
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <input
              type="text"
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter template description"
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="template_content" className="block text-sm font-medium text-gray-700 mb-1">
              Template Content
            </label>
            <div className="mb-2 text-sm text-gray-600">
              Use <code className="bg-gray-100 px-1 py-0.5 rounded">{'{{field_name}}'}</code> syntax to create placeholders that will be replaced with form data.
            </div>
            <textarea
              id="template_content"
              value={templateContent}
              onChange={handleContentChange}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              placeholder="Enter your template content with {{placeholders}}"
              rows={15}
            />
          </div>
          
          {Object.keys(fieldLabels).length > 0 && (
            <div className="mb-6 p-4 bg-blue-50 rounded-md border border-blue-100">
              <h3 className="text-sm font-medium text-blue-800 mb-2">Detected Fields:</h3>
              <ul className="list-disc pl-5 space-y-1">
                {Object.entries(fieldLabels).map(([id, label]) => (
                  <li key={id} className="text-sm text-blue-700">
                    <code className="bg-blue-100 px-1 py-0.5 rounded">{`{{${label}}}`}</code>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 mr-2 btn"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 btn"
            >
              {isSubmitting ? 'Saving...' : 'Save Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 