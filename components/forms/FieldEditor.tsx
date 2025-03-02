'use client';

import { useState, useEffect } from 'react';

interface FieldEditorProps {
  field: any;
  onUpdate: (field: any) => void;
}

export default function FieldEditor({ field, onUpdate }: FieldEditorProps) {
  const [label, setLabel] = useState(field.label || '');
  const [placeholder, setPlaceholder] = useState(field.placeholder || '');
  const [required, setRequired] = useState(field.required || false);
  const [options, setOptions] = useState<string[]>(field.options || []);
  const [defaultValue, setDefaultValue] = useState(field.defaultValue || '');
  
  // Update the field when values change
  useEffect(() => {
    const updatedField = {
      ...field,
      label,
      placeholder,
      required,
      ...(options.length > 0 ? { options } : {}),
      ...(defaultValue ? { defaultValue } : {})
    };
    
    onUpdate(updatedField);
  }, [label, placeholder, required, options, defaultValue]);
  
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
        <label className="block text-sm font-medium text-gray-700 mb-1">Field Label</label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>
      
      {(field.type === 'text' || field.type === 'textarea' || field.type === 'number' || field.type === 'email') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Placeholder</label>
          <input
            type="text"
            value={placeholder}
            onChange={(e) => setPlaceholder(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      )}
      
      {(field.type === 'text' || field.type === 'number' || field.type === 'email' || field.type === 'date') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Default Value</label>
          <input
            type={field.type === 'date' ? 'date' : 'text'}
            value={defaultValue}
            onChange={(e) => setDefaultValue(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      )}
      
      {(field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700">Options</label>
            <button
              type="button"
              onClick={addOption}
              className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
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
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                />
                <button
                  type="button"
                  onClick={() => removeOption(index)}
                  className="ml-2 text-red-500 hover:text-red-700"
                  disabled={options.length <= 1}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={required}
            onChange={(e) => setRequired(e.target.checked)}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
          />
          <span className="ml-2 text-sm text-gray-700">Required field</span>
        </label>
      </div>
    </div>
  );
}
