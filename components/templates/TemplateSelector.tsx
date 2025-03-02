'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface Template {
  id: string;
  name: string;
  description: string;
  user_id: string;
  template_content?: string;
}

interface TemplateSelectorProps {
  onSelect: (templateId: string | null) => void;
  selectedTemplateId: string | null;
}

export default function TemplateSelector({ onSelect, selectedTemplateId }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [availableTemplates, setAvailableTemplates] = useState<Template[]>([]);

  useEffect(() => {
    async function fetchTemplates() {
      setLoading(true);
      
      try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          setError('You must be logged in to view templates');
          setLoading(false);
          return;
        }
        
        // Fetch all templates owned by the user
        const { data: templateData, error: templateError } = await supabase
          .from('templates')
          .select('id, name, description, user_id, template_content')
          .eq('user_id', user.id);
        
        if (templateError) throw templateError;
        
        setTemplates(templateData || []);
        
        // Fetch forms to check which templates are already associated with forms
        const { data: formData, error: formError } = await supabase
          .from('forms')
          .select('template_id')
          .not('template_id', 'is', null);
        
        if (formError) throw formError;
        
        // Filter out templates that are already associated with forms
        const usedTemplateIds = new Set(formData?.map(form => form.template_id) || []);
        
        // If a template is already selected, include it in available templates
        const availableTemplates = templateData?.filter(template => 
          !usedTemplateIds.has(template.id) || template.id === selectedTemplateId
        ) || [];
        
        setAvailableTemplates(availableTemplates);
        
      } catch (err: any) {
        console.error('Error fetching templates:', err);
        setError(err.message || 'Failed to load templates');
      } finally {
        setLoading(false);
      }
    }
    
    fetchTemplates();
  }, [selectedTemplateId]);

  if (loading) {
    return <div className="animate-pulse h-10 bg-gray-200 rounded"></div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (availableTemplates.length === 0) {
    return (
      <div className="p-4 border rounded bg-gray-50">
        <p className="text-gray-600">No available templates found.</p>
        <Link href="/dashboard/templates/new" className="text-blue-600 hover:underline mt-2 inline-block link-hover">
          Create a new template
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="use-template"
          checked={selectedTemplateId !== null}
          onChange={(e) => {
            if (!e.target.checked) {
              onSelect(null);
            } else if (availableTemplates.length > 0) {
              onSelect(availableTemplates[0].id);
            }
          }}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="use-template" className="text-sm font-medium text-gray-700">
          Use a template for this form
        </label>
      </div>
      
      {selectedTemplateId !== null && (
        <div className="pl-6">
          <label htmlFor="template-select" className="block text-sm font-medium text-gray-700 mb-1">
            Select a template
          </label>
          <select
            id="template-select"
            value={selectedTemplateId}
            onChange={(e) => onSelect(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            {availableTemplates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-sm text-gray-500">
            Note: Each template can only be associated with one form.
          </p>
          
          {/* Template content preview */}
          {selectedTemplateId && (
            <div className="mt-3">
              <h4 className="text-sm font-medium text-gray-700 mb-1">Template Preview</h4>
              <div className="p-2 bg-gray-50 rounded border text-xs font-mono overflow-hidden text-gray-600" style={{ maxHeight: '120px' }}>
                <div className="whitespace-pre-wrap">
                  {availableTemplates.find(t => t.id === selectedTemplateId)?.template_content || 'No content available'}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 