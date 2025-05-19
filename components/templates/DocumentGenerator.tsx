'use client';

import { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { supabase } from '@/lib/supabase';

interface DocumentGeneratorProps {
  templateContent: string;
  formResponses: Record<string, any>;
  templateName: string;
  responseId?: string; // Optional ID of the form response for saving changes
  formFields?: FormField[]; // Add form fields to get field types
}

interface FormField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
  defaultValue?: string | string[];
}

// Interface for tracking replaced content
interface ReplacedContent {
  text: string;
  isReplaced: boolean;
  originalPlaceholder?: string;
  key?: string; // The key in formResponses that this value came from
}

export default function DocumentGenerator({ 
  templateContent, 
  formResponses, 
  templateName,
  responseId,
  formFields = []
}: DocumentGeneratorProps) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editedResponses, setEditedResponses] = useState<Record<string, any>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize editedResponses with the original formResponses
  useEffect(() => {
    setEditedResponses({...formResponses});
  }, [formResponses]);

  // Function to replace template placeholders with form response values
  const generateContent = (forPreview = false): string | ReplacedContent[] => {
    if (!templateContent) return forPreview ? [] : '';
    
    // Always use editedResponses to include any user edits to unfilled variables
    const responsesToUse = editedResponses;
    
    let content = templateContent;
    const placeholderRegex = /{{([^}]+)}}/g;
    let match;
    const unresolvedPlaceholders: string[] = [];
    
    // First pass: collect all placeholders in the template
    const placeholders = new Set<string>();
    while ((match = placeholderRegex.exec(templateContent)) !== null) {
      placeholders.add(match[1].trim());
    }
    
    // For preview mode, we'll track replaced content differently
    if (forPreview) {
      // Create a map of replacements with their positions
      const replacements: { placeholder: string; start: number; end: number; value: string; found: boolean; key?: string }[] = [];
      
      // Find all placeholder positions
      placeholders.forEach(placeholder => {
        const placeholderPattern = `{{${placeholder}}}`;
        let startIndex = 0;
        let index;
        
        while ((index = content.indexOf(placeholderPattern, startIndex)) !== -1) {
          replacements.push({
            placeholder,
            start: index,
            end: index + placeholderPattern.length,
            value: '',
            found: false
          });
          startIndex = index + placeholderPattern.length;
        }
      });
      
      // Sort replacements by position
      replacements.sort((a, b) => a.start - b.start);
      
      // Find values for each placeholder
      for (const replacement of replacements) {
        const { placeholder } = replacement;
        
        // Try to find the value in responsesToUse
        // First check if the exact placeholder exists as a key
        if (responsesToUse[placeholder] !== undefined) {
          let value = responsesToUse[placeholder];
          
          if (Array.isArray(value)) {
            replacement.value = value.join(', ');
          } else if (value !== null && value !== undefined) {
            replacement.value = String(value);
          }
          
          replacement.found = true;
          replacement.key = placeholder;
        } 
        // If not found, check if there's a case-insensitive match or a match with spaces replaced by underscores
        else {
          const normalizedPlaceholder = placeholder.toLowerCase().replace(/\s+/g, '_');
          
          // Check all keys in responsesToUse for a match
          Object.entries(responsesToUse).forEach(([key, value]) => {
            const normalizedKey = key.toLowerCase().replace(/\s+/g, '_');
            
            if (normalizedKey === normalizedPlaceholder || key === placeholder) {
              if (Array.isArray(value)) {
                replacement.value = value.join(', ');
              } else if (value !== null && value !== undefined) {
                replacement.value = String(value);
              }
              
              replacement.found = true;
              replacement.key = key;
            }
          });
          
          // If still not found, set the key to the placeholder name so it can be edited
          if (!replacement.found) {
            replacement.key = placeholder;
            unresolvedPlaceholders.push(placeholder);
          }
        }
      }
      
      // Build the result array with segments
      const result: ReplacedContent[] = [];
      let lastEnd = 0;
      
      for (const replacement of replacements) {
        // Add text before the placeholder
        if (replacement.start > lastEnd) {
          result.push({
            text: content.substring(lastEnd, replacement.start),
            isReplaced: false
          });
        }
        
        // Add the replacement value or keep the placeholder if not found
        if (replacement.found) {
          result.push({
            text: replacement.value,
            isReplaced: true,
            originalPlaceholder: replacement.placeholder,
            key: replacement.key
          });
        } else {
          // For unfilled placeholders, make them editable too
          result.push({
            text: '', // Empty string to allow user to fill in
            isReplaced: true,
            originalPlaceholder: replacement.placeholder,
            key: replacement.key
          });
        }
        
        lastEnd = replacement.end;
      }
      
      // Add any remaining text after the last placeholder
      if (lastEnd < content.length) {
        result.push({
          text: content.substring(lastEnd),
          isReplaced: false
        });
      }
      
      // Add a note about unresolved placeholders if any
      if (unresolvedPlaceholders.length > 0) {
        result.push({
          text: '\n\n---\nNote: The following placeholders could not be resolved:\n',
          isReplaced: false
        });
        
        unresolvedPlaceholders.forEach(placeholder => {
          result.push({
            text: `- {{${placeholder}}}\n`,
            isReplaced: false
          });
        });
      }
      
      return result;
    } else {
      // Original logic for non-preview mode (PDF/text generation)
      // Second pass: replace placeholders with values
      placeholders.forEach(placeholder => {
        const placeholderPattern = `{{${placeholder}}}`;
        
        // Try to find the value in responsesToUse
        // First check if the exact placeholder exists as a key
        if (responsesToUse[placeholder] !== undefined) {
          let value = responsesToUse[placeholder];
          let replacementValue = '';
          
          if (Array.isArray(value)) {
            replacementValue = value.join(', ');
          } else if (value !== null && value !== undefined) {
            replacementValue = String(value);
          }
          
          content = content.split(placeholderPattern).join(replacementValue);
        } 
        // If not found, check if there's a case-insensitive match or a match with spaces replaced by underscores
        else {
          const normalizedPlaceholder = placeholder.toLowerCase().replace(/\s+/g, '_');
          let found = false;
          
          // Check all keys in responsesToUse for a match
          Object.entries(responsesToUse).forEach(([key, value]) => {
            const normalizedKey = key.toLowerCase().replace(/\s+/g, '_');
            
            if (normalizedKey === normalizedPlaceholder || key === placeholder) {
              let replacementValue = '';
              
              if (Array.isArray(value)) {
                replacementValue = value.join(', ');
              } else if (value !== null && value !== undefined) {
                replacementValue = String(value);
              }
              
              content = content.split(placeholderPattern).join(replacementValue);
              found = true;
            }
          });
          
          if (!found) {
            unresolvedPlaceholders.push(placeholder);
          }
        }
      });
      
      // Add a note about unresolved placeholders if any
      if (unresolvedPlaceholders.length > 0) {
        content += '\n\n---\nNote: The following placeholders could not be resolved:\n';
        unresolvedPlaceholders.forEach(placeholder => {
          content += `- {{${placeholder}}}\n`;
        });
      }
      
      return content;
    }
  };

  // Generate PDF document
  const generatePDF = () => {
    setGenerating(true);
    setError('');
    
    try {
      const content = generateContent() as string;
      const doc = new jsPDF();
      
      // Add content to PDF
      const splitText = doc.splitTextToSize(content, 180);
      doc.text(splitText, 15, 15);
      
      // Save the PDF
      doc.save(`${templateName.replace(/\s+/g, '_')}_document.pdf`);
      
    } catch (err: any) {
      console.error('Error generating PDF:', err);
      setError(err.message || 'Failed to generate PDF');
    } finally {
      setGenerating(false);
    }
  };

  // Generate and download as text file
  const generateTextFile = () => {
    setGenerating(true);
    setError('');
    
    try {
      const content = generateContent() as string;
      
      // Create a blob with the content
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      // Create a link and trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = `${templateName.replace(/\s+/g, '_')}_document.txt`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (err: any) {
      console.error('Error generating text file:', err);
      setError(err.message || 'Failed to generate text file');
    } finally {
      setGenerating(false);
    }
  };

  // Handle input change for editable fields
  const handleInputChange = (key: string | undefined, value: string) => {
    if (!key) return;
    
    // Update the editedResponses with the new value
    setEditedResponses(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Save changes to the form response
  const saveChanges = async () => {
    setIsSaving(true);
    setError('');
    setSuccess('');

    // If there's no responseId, we're just using the edited values for document generation
    if (!responseId) {
      setSuccess('Changes applied to preview');
      setTimeout(() => setSuccess(''), 3000);
      setIsSaving(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('form_responses')
        .update({
          data: editedResponses
        })
        .eq('id', responseId);

      if (error) throw error;
      
      setSuccess('Changes saved successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error saving changes:', err);
      setError(err.message || 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  // Function to get field type for a placeholder
  const getFieldTypeForPlaceholder = (placeholder: string): string => {
    // First try exact match
    const exactMatch = formFields.find(field => field.label === placeholder);
    if (exactMatch) return exactMatch.type;

    // Try case-insensitive match
    const normalizedPlaceholder = placeholder.toLowerCase().replace(/\s+/g, '_');
    const caseInsensitiveMatch = formFields.find(field => 
      field.label.toLowerCase().replace(/\s+/g, '_') === normalizedPlaceholder
    );
    if (caseInsensitiveMatch) return caseInsensitiveMatch.type;

    // Default to text if no match found
    return 'text';
  };

  // Function to get field options for a placeholder
  const getFieldOptionsForPlaceholder = (placeholder: string): string[] | undefined => {
    // First try exact match
    const exactMatch = formFields.find(field => field.label === placeholder);
    if (exactMatch?.options) return exactMatch.options;

    // Try case-insensitive match
    const normalizedPlaceholder = placeholder.toLowerCase().replace(/\s+/g, '_');
    const caseInsensitiveMatch = formFields.find(field => 
      field.label.toLowerCase().replace(/\s+/g, '_') === normalizedPlaceholder
    );
    if (caseInsensitiveMatch?.options) return caseInsensitiveMatch.options;

    return undefined;
  };

  // Render the preview content with highlighting and editing
  const renderPreviewContent = () => {
    const contentSegments = generateContent(true) as ReplacedContent[];
    
    return contentSegments.map((segment, index) => {
      if (segment.isReplaced) {
        // Determine if this is an unfilled variable
        const isUnfilled = segment.text === '';
        const fieldType = getFieldTypeForPlaceholder(segment.originalPlaceholder || '');
        const fieldOptions = getFieldOptionsForPlaceholder(segment.originalPlaceholder || '');
        
        if (isEditing) {
          // Render an input field for editable segments based on field type
          switch (fieldType) {
            case 'select':
              return (
                <select
                  key={index}
                  value={segment.text}
                  onChange={(e) => handleInputChange(segment.key, e.target.value)}
                  className={`${isUnfilled ? 'bg-red-100 border-red-300' : 'bg-yellow-100 border-yellow-300'} border px-1 py-0.5 rounded text-black inline-block min-w-[100px]`}
                  title={`Editing: {{${segment.originalPlaceholder}}}${isUnfilled ? ' (unfilled)' : ''}`}
                >
                  <option value="">Select an option</option>
                  {fieldOptions?.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              );
            
            case 'radio':
              return (
                <div key={index} className="inline-block">
                  {fieldOptions?.map((option) => (
                    <label key={option} className="inline-flex items-center mr-2">
                      <input
                        type="radio"
                        value={option}
                        checked={segment.text === option}
                        onChange={(e) => handleInputChange(segment.key, e.target.value)}
                        className={`${isUnfilled ? 'border-red-300' : 'border-yellow-300'} mr-1`}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              );
            
            case 'checkbox':
              const currentValues = Array.isArray(segment.text) ? segment.text : segment.text ? [segment.text] : [];
              return (
                <div key={index} className="inline-block">
                  {fieldOptions?.map((option) => (
                    <label key={option} className="inline-flex items-center mr-2">
                      <input
                        type="checkbox"
                        value={option}
                        checked={currentValues.includes(option)}
                        onChange={(e) => {
                          const newValues = e.target.checked
                            ? [...currentValues, option]
                            : currentValues.filter(v => v !== option);
                          handleInputChange(segment.key, newValues.join(', '));
                        }}
                        className={`${isUnfilled ? 'border-red-300' : 'border-yellow-300'} mr-1`}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              );
            
            case 'date':
              return (
                <input
                  key={index}
                  type="date"
                  value={segment.text}
                  onChange={(e) => handleInputChange(segment.key, e.target.value)}
                  className={`${isUnfilled ? 'bg-red-100 border-red-300' : 'bg-yellow-100 border-yellow-300'} border px-1 py-0.5 rounded text-black inline-block min-w-[100px]`}
                  title={`Editing: {{${segment.originalPlaceholder}}}${isUnfilled ? ' (unfilled)' : ''}`}
                />
              );
            
            case 'number':
              return (
                <input
                  key={index}
                  type="number"
                  value={segment.text}
                  onChange={(e) => handleInputChange(segment.key, e.target.value)}
                  className={`${isUnfilled ? 'bg-red-100 border-red-300' : 'bg-yellow-100 border-yellow-300'} border px-1 py-0.5 rounded text-black inline-block min-w-[100px]`}
                  title={`Editing: {{${segment.originalPlaceholder}}}${isUnfilled ? ' (unfilled)' : ''}`}
                />
              );
            
            case 'email':
              return (
                <input
                  key={index}
                  type="email"
                  value={segment.text}
                  onChange={(e) => handleInputChange(segment.key, e.target.value)}
                  className={`${isUnfilled ? 'bg-red-100 border-red-300' : 'bg-yellow-100 border-yellow-300'} border px-1 py-0.5 rounded text-black inline-block min-w-[100px]`}
                  title={`Editing: {{${segment.originalPlaceholder}}}${isUnfilled ? ' (unfilled)' : ''}`}
                  placeholder={isUnfilled ? `Enter ${segment.originalPlaceholder}...` : ''}
                />
              );
            
            case 'textarea':
              return (
                <textarea
                  key={index}
                  value={segment.text}
                  onChange={(e) => handleInputChange(segment.key, e.target.value)}
                  className={`${isUnfilled ? 'bg-red-100 border-red-300' : 'bg-yellow-100 border-yellow-300'} border px-1 py-0.5 rounded text-black inline-block min-w-[100px]`}
                  title={`Editing: {{${segment.originalPlaceholder}}}${isUnfilled ? ' (unfilled)' : ''}`}
                  placeholder={isUnfilled ? `Enter ${segment.originalPlaceholder}...` : ''}
                  rows={3}
                />
              );
            
            default: // text
              return (
                <input
                  key={index}
                  type="text"
                  value={segment.text}
                  onChange={(e) => handleInputChange(segment.key, e.target.value)}
                  className={`${isUnfilled ? 'bg-red-100 border-red-300' : 'bg-yellow-100 border-yellow-300'} border px-1 py-0.5 rounded text-black inline-block min-w-[100px]`}
                  title={`Editing: {{${segment.originalPlaceholder}}}${isUnfilled ? ' (unfilled)' : ''}`}
                  placeholder={isUnfilled ? `Enter ${segment.originalPlaceholder}...` : ''}
                />
              );
          }
        } else {
          // Render a span for non-editing mode
          return (
            <span 
              key={index} 
              className={`${isUnfilled ? 'bg-red-200 text-red-800' : 'bg-yellow-200'} px-1 rounded text-black`}
              title={`From: {{${segment.originalPlaceholder}}}${isUnfilled ? ' (unfilled)' : ''}`}
            >
              {isUnfilled ? `{{${segment.originalPlaceholder}}}` : segment.text}
            </span>
          );
        }
      } else {
        // Render regular text
        return (
          <span key={index}>
            {segment.text}
          </span>
        );
      }
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Generate Document</h3>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
          <p className="text-green-700">{success}</p>
        </div>
      )}
      
      <div className="flex space-x-3">
        <button
          onClick={generatePDF}
          disabled={generating}
          className={`px-4 py-2 rounded ${
            generating ? 'bg-gray-400' : 'bg-blue-600 text-white hover:bg-blue-700'
          } btn`}
        >
          {generating ? 'Generating...' : 'Generate PDF'}
        </button>
        
        <button
          onClick={generateTextFile}
          disabled={generating}
          className={`px-4 py-2 rounded ${
            generating ? 'bg-gray-400' : 'bg-green-600 text-white hover:bg-green-700'
          } btn`}
        >
          {generating ? 'Generating...' : 'Generate Text File'}
        </button>

        <button
          onClick={() => setIsEditing(!isEditing)}
          disabled={generating || isSaving}
          className={`px-4 py-2 rounded ${
            isEditing ? 'bg-gray-600 text-white hover:bg-gray-700' : 'bg-purple-600 text-white hover:bg-purple-700'
          } btn`}
        >
          {isEditing ? 'Cancel Editing' : 'Edit Variables'}
        </button>

        {isEditing && (
          <button
            onClick={saveChanges}
            disabled={generating || isSaving}
            className={`px-4 py-2 rounded ${
              isSaving ? 'bg-gray-400' : 'bg-amber-600 text-white hover:bg-amber-700'
            } btn`}
            title={!responseId ? 'Changes will only apply to the current preview' : ''}
          >
            {isSaving ? 'Saving...' : responseId ? 'Save Changes' : 'Apply Changes'}
          </button>
        )}
      </div>
      
      <div className="mt-4 p-4 border rounded bg-gray-50">
        <h4 className="font-medium mb-2">Preview</h4>
        <div className="whitespace-pre-wrap font-mono text-sm">
          {renderPreviewContent()}
        </div>
      </div>
    </div>
  );
} 