/**
 * Utility functions for rendering templates with form response data
 */

/**
 * Interface for a template
 */
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

/**
 * Interface for a form response
 */
interface FormResponse {
  id: string;
  form_id: string;
  respondent_email: string | null;
  data: Record<string, any>;
  created_at?: string;
}

/**
 * Renders a template with form response data
 * @param template The template to render
 * @param formResponse The form response data to use
 * @returns The rendered template content with placeholders replaced by form data
 */
export function renderTemplate(template: Template, formResponse: FormResponse): string {
  if (!template.template_content) {
    return '';
  }

  // Extract field labels from template content
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

  // Get the field labels from the template content
  const fieldLabels = template.field_labels || extractFieldLabels(template.template_content);
  
  // Create a mapping from field IDs to their values in the form response
  const fieldValues: Record<string, any> = {};
  
  // Map field IDs to their values in the form response
  if (formResponse.data) {
    Object.entries(formResponse.data).forEach(([fieldId, value]) => {
      fieldValues[fieldId] = value;
    });
  }
  
  // Replace placeholders in the template content with form response values
  let renderedContent = template.template_content;
  
  // For each field label, replace its placeholder with the corresponding value
  Object.entries(fieldLabels).forEach(([fieldId, label]) => {
    const placeholder = `{{${label}}}`;
    const value = fieldValues[fieldId];
    
    // Handle different value types
    let displayValue = '';
    
    if (value === undefined || value === null) {
      displayValue = '';
    } else if (Array.isArray(value)) {
      // For checkbox or multi-select values
      displayValue = value.join(', ');
    } else {
      displayValue = String(value);
    }
    
    // Replace all occurrences of the placeholder with the value
    renderedContent = renderedContent.replace(new RegExp(placeholder, 'g'), displayValue);
  });
  
  return renderedContent;
}

/**
 * Renders a template with form response data and returns it as HTML
 * @param template The template to render
 * @param formResponse The form response data to use
 * @returns The rendered template content as HTML
 */
export function renderTemplateAsHtml(template: Template, formResponse: FormResponse): string {
  const renderedContent = renderTemplate(template, formResponse);
  
  // Convert line breaks to <br> tags for HTML display
  return renderedContent.replace(/\n/g, '<br>');
} 