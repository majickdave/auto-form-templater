'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

export default function NewTemplatePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [templateContent, setTemplateContent] = useState('');
  const [fieldLabels, setFieldLabels] = useState<Record<string, string>>({});

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
      
      if (userError) {
        throw new Error(`Authentication error: ${userError.message}`);
      }
      
      if (!user) throw new Error('User not authenticated');

      // Prepare the template data
      const templateData = {
        id: uuidv4(),
        user_id: user.id,
        name,
        description,
        template_content: templateContent,
        created_at: new Date().toISOString(),
      };
      
      console.log('Attempting to create template with data:', JSON.stringify(templateData));

      // Create the template in the database
      const { data, error } = await supabase
        .from('templates')
        .insert(templateData)
        .select();

      if (error) {
        console.error('Supabase error details:', JSON.stringify(error));
        throw new Error(`Database error: ${error.message || 'Unknown error'}`);
      }

      if (!data || data.length === 0) {
        throw new Error('Template was created but no data was returned');
      }

      // Show success message
      toast.success('Template created successfully!');

      // Redirect to the template page
      router.push(`/dashboard/templates/${data[0].id}`);
      
    } catch (err: any) {
      console.error('Error creating template:', err);
      const errorMessage = err.message || 'Failed to create template';
      setError(errorMessage);
      toast.error(errorMessage);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Create New Template</h1>
      
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
              {isSubmitting ? 'Creating...' : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 