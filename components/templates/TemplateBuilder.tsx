'use client';

import { useState } from 'react';

interface TemplateBuilderProps {
  onSubmit: (templateData: any) => void;
  isSubmitting: boolean;
  initialData?: any;
  isEditMode?: boolean;
}

/**
 * TemplateBuilder component
 * 
 * This is a simplified version of the template builder that extracts field labels
 * from the template content using regex. It no longer uses the fields property
 * and only submits the template_content to the database.
 */
export default function TemplateBuilder({ onSubmit, isSubmitting, initialData, isEditMode = false }: TemplateBuilderProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [content, setContent] = useState(initialData?.template_content || '');
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
    setContent(newContent);
    
    // Extract field labels from the content
    const extractedFields = extractFieldLabels(newContent);
    setFieldLabels(extractedFields);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!name.trim()) {
      alert('Please enter a template name');
      return;
    }

    if (!content.trim()) {
      alert('Please enter template content');
      return;
    }

    onSubmit({
      name,
      description,
      template_content: content,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Template details */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-semibold mb-4">Template Details</h2>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Template Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700">
              Template Content <span className="text-red-500">*</span>
            </label>
            <textarea
              id="content"
              value={content}
              onChange={handleContentChange}
              rows={10}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 font-mono"
              placeholder="Enter your template content here. Use {{field_name}} to insert dynamic fields."
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              Use double curly braces to insert fields, e.g., {'{{field_name}}'}
            </p>
          </div>
        </div>
      </div>
      
      {/* Display detected fields */}
      {Object.keys(fieldLabels).length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-4">Detected Fields</h2>
          <ul className="list-disc pl-5 space-y-1">
            {Object.entries(fieldLabels).map(([id, label]) => (
              <li key={id} className="text-sm text-gray-700">
                <code className="bg-gray-100 px-1 py-0.5 rounded">{`{{${label}}}`}</code>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Submit button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 btn"
        >
          {isSubmitting ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Template' : 'Create Template')}
        </button>
      </div>
    </form>
  );
} 