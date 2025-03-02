'use client';

import { useState } from 'react';
import { jsPDF } from 'jspdf';

interface DocumentGeneratorProps {
  templateContent: string;
  formResponses: Record<string, any>;
  templateName: string;
}

export default function DocumentGenerator({ 
  templateContent, 
  formResponses, 
  templateName 
}: DocumentGeneratorProps) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  // Function to replace template placeholders with form response values
  const generateContent = () => {
    if (!templateContent) return '';
    
    let content = templateContent;
    const placeholderRegex = /{{([^}]+)}}/g;
    let match;
    const unresolvedPlaceholders: string[] = [];
    
    // First pass: collect all placeholders in the template
    const placeholders = new Set<string>();
    while ((match = placeholderRegex.exec(templateContent)) !== null) {
      placeholders.add(match[1].trim());
    }
    
    // Second pass: replace placeholders with values
    placeholders.forEach(placeholder => {
      const placeholderPattern = `{{${placeholder}}}`;
      
      // Try to find the value in formResponses
      // First check if the exact placeholder exists as a key
      if (formResponses[placeholder] !== undefined) {
        let value = formResponses[placeholder];
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
        
        // Check all keys in formResponses for a match
        Object.entries(formResponses).forEach(([key, value]) => {
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
  };

  // Generate PDF document
  const generatePDF = () => {
    setGenerating(true);
    setError('');
    
    try {
      const content = generateContent();
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
      const content = generateContent();
      
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

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Generate Document</h3>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <p className="text-red-700">{error}</p>
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
      </div>
      
      <div className="mt-4 p-4 border rounded bg-gray-50">
        <h4 className="font-medium mb-2">Preview</h4>
        <div className="whitespace-pre-wrap font-mono text-sm">
          {generateContent()}
        </div>
      </div>
    </div>
  );
} 