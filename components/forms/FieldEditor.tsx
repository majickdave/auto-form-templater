'use client';

import { useState } from 'react';

interface FieldEditorProps {
  field: any;
  onSave: (field: any) => void;
  onCancel: () => void;
}

export default function FieldEditor({ field, onSave, onCancel }: FieldEditorProps) {
  const [label, setLabel] = useState(field.label || '');
  const [placeholder, setPlaceholder] = useState(field.placeholder || '');
  const [required, setRequired] = useState(field.required || false);
  const [options, setOptions] = useState<string[]>(field.options || []);
  const [defaultValue, setDefaultValue] = useState(field.defaultValue || '');
  
  // Handle save
  const handleSave = () => {
    const updatedField = {
      ...field,
      label,
      placeholder,
      required,
      options: (field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') ? options : undefined,
      defaultValue: defaultValue || undefined,
      metadata: {
        label,
        type: field.type,
        default_value: defaultValue || null,
        required,
        options: (field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') ? options : null,
        placeholder: placeholder || null
      }
    };
    
    onSave(updatedField);
  };
  
  // Add a new option
  const addOption = () => {
    setOptions([...options, `Option ${options.length + 1}`]);
  };
  
  // Update an option
  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };
  
  // Remove an option
  const removeOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };
  
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Field Label</label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors"
        />
      </div>
      
      {(field.type === 'text' || field.type === 'textarea' || field.type === 'number' || field.type === 'email') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Placeholder</label>
          <input
            type="text"
            value={placeholder}
            onChange={(e) => setPlaceholder(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors"
          />
        </div>
      )}
      
      {(field.type === 'text' || field.type === 'number' || field.type === 'email' || field.type === 'date') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default Value</label>
          <input
            type={field.type === 'date' ? 'date' : 'text'}
            value={defaultValue}
            onChange={(e) => setDefaultValue(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors"
          />
        </div>
      )}
      
      {(field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Options</label>
            <button
              type="button"
              onClick={addOption}
              className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md text-gray-700 dark:text-gray-300 transition-colors"
            >
              Add Option
            </button>
          </div>
          
          <div className="space-y-2">
            {options.map((option, index) => (
              <div key={index} className="flex items-center">
                <input
                  type="text"
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors"
                />
                <button
                  type="button"
                  onClick={() => removeOption(index)}
                  className="ml-2 p-1.5 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                  disabled={options.length <= 1}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="required-field"
            checked={required}
            onChange={(e) => setRequired(e.target.checked)}
            className="h-4 w-4 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-400 border-gray-300 dark:border-gray-600 rounded transition-colors"
          />
          <label htmlFor="required-field" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
            Required field
          </label>
        </div>
      </div>
      
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-lg transition-colors"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}
