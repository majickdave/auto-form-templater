'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { renderTemplate } from '@/lib/templateRenderer';

interface Template {
  id: string;
  name: string;
  description?: string;
  template_content: string;
  field_labels?: Record<string, string>;
  fields?: Array<{
    id: string;
    label: string;
  }>;
}

interface FormResponse {
  id: string;
  form_id: string;
  respondent_email: string | null;
  data: Record<string, any>;
  created_at?: string;
}

interface TemplateRendererProps {
  templateId: string;
  formResponse: FormResponse;
}

export default function TemplateRenderer({ templateId, formResponse }: TemplateRendererProps) {
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [renderedContent, setRenderedContent] = useState<string>('');

  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        setLoading(true);
        
        // Fetch the template from the database
        const { data, error } = await supabase
          .from('templates')
          .select('*')
          .eq('id', templateId)
          .single();
        
        if (error) {
          throw error;
        }
        
        if (!data) {
          throw new Error('Template not found');
        }
        
        setTemplate(data);
        
        // Render the template with the form response data
        const rendered = renderTemplate(data, formResponse);
        setRenderedContent(rendered);
      } catch (err: any) {
        console.error('Error fetching template:', err);
        setError(err.message || 'Failed to fetch template');
      } finally {
        setLoading(false);
      }
    };
    
    if (templateId && formResponse) {
      fetchTemplate();
    }
  }, [templateId, formResponse]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
        <p className="text-yellow-700">Template not found</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h2 className="text-xl font-semibold mb-4">Rendered Template: {template.name}</h2>
      
      <div className="whitespace-pre-wrap border p-4 rounded bg-gray-50 min-h-[200px]">
        {renderedContent}
      </div>
      
      <div className="mt-4 flex justify-end">
        <button
          onClick={() => {
            // Create a blob with the rendered content
            const blob = new Blob([renderedContent], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            
            // Create a link to download the file
            const a = document.createElement('a');
            a.href = url;
            a.download = `${template.name} - ${new Date().toISOString().split('T')[0]}.txt`;
            document.body.appendChild(a);
            a.click();
            
            // Clean up
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 btn"
        >
          Download as Text
        </button>
      </div>
    </div>
  );
} 