'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import TemplateBuilder from '@/components/templates/TemplateBuilder';
import { toast } from 'sonner';

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

export default function EditTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

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
        
        setTemplate(data);
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

  const handleSubmit = async (templateData: any) => {
    setIsSubmitting(true);
    setError('');

    try {
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

      const fieldLabels = extractFieldLabels(templateData.template_content);

      // Update template in the database
      const { error } = await supabase
        .from('templates')
        .update({
          name: templateData.name,
          description: templateData.description,
          template_content: templateData.template_content,
          fields: templateData.fields,
          field_labels: fieldLabels,
          updated_at: new Date().toISOString(),
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

  const initialData = {
    name: template.name,
    description: template.description,
    content: template.template_content,
    fields: template.fields || [],
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Edit Template</h1>
        <Link 
          href={`/dashboard/templates/${template.id}`}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          Cancel
        </Link>
      </div>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      <TemplateBuilder 
        onSubmit={handleSubmit} 
        isSubmitting={isSubmitting} 
        initialData={initialData}
        isEditMode={true}
      />
    </div>
  );
} 