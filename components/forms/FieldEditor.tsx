'use client';

import { useState, useEffect } from 'react';

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
  const [selectedOptions, setSelectedOptions] = useState<string[]>(
    Array.isArray(field.defaultValue) ? field.defaultValue : 
    field.defaultValue ? [field.defaultValue] : []
  );
  
  // Handle save
  const handleSave = () => {
    const updatedField = {
      ...field,
      label,
      placeholder,
      required,
      options: (field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') ? options : undefined,
      defaultValue: field.type === 'checkbox' 
        ? selectedOptions 
        : field.type === 'radio' || field.type === 'select'
          ? selectedOptions[0] || ''
          : defaultValue || undefined,
      metadata: {
        label,
        type: field.type,
        default_value: field.type === 'checkbox' 
          ? selectedOptions 
          : field.type === 'radio' || field.type === 'select'
            ? selectedOptions[0] || null
            : defaultValue || null,
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
    
    // Update selectedOptions if the option text changes
    if (selectedOptions.includes(options[index])) {
      const newSelectedOptions = [...selectedOptions];
      const selectedIndex = newSelectedOptions.indexOf(options[index]);
      newSelectedOptions[selectedIndex] = value;
      setSelectedOptions(newSelectedOptions);
    }
  };
  
  // Remove an option
  const removeOption = (index: number) => {
    const optionToRemove = options[index];
    setOptions(options.filter((_, i) => i !== index));
    
    // Remove from selectedOptions if it was selected
    if (selectedOptions.includes(optionToRemove)) {
      setSelectedOptions(selectedOptions.filter(opt => opt !== optionToRemove));
    }
  };
  
  // Toggle option selection for checkbox
  const toggleOptionSelection = (option: string) => {
    if (field.type === 'checkbox') {
      if (selectedOptions.includes(option)) {
        setSelectedOptions(selectedOptions.filter(opt => opt !== option));
      } else {
        setSelectedOptions([...selectedOptions, option]);
      }
    } else if (field.type === 'radio' || field.type === 'select') {
      setSelectedOptions([option]);
    }
  };
  
  // Move option up in the list
  const moveOptionUp = (index: number) => {
    if (index === 0) return;
    const newOptions = [...options];
    [newOptions[index - 1], newOptions[index]] = [newOptions[index], newOptions[index - 1]];
    setOptions(newOptions);
  };
  
  // Move option down in the list
  const moveOptionDown = (index: number) => {
    if (index === options.length - 1) return;
    const newOptions = [...options];
    [newOptions[index], newOptions[index + 1]] = [newOptions[index + 1], newOptions[index]];
    setOptions(newOptions);
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
              className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-800/40 text-blue-700 dark:text-blue-300 rounded-md transition-colors flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Option
            </button>
          </div>
          
          {/* Options Preview */}
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-lg">
            <h4 className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 font-semibold">Preview</h4>
            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={`preview-${index}`} className="flex items-center">
                  {field.type === 'checkbox' ? (
                    <input
                      type="checkbox"
                      checked={selectedOptions.includes(option)}
                      onChange={() => toggleOptionSelection(option)}
                      className="h-4 w-4 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-400 border-gray-300 dark:border-gray-600 rounded transition-colors"
                    />
                  ) : field.type === 'radio' ? (
                    <input
                      type="radio"
                      checked={selectedOptions.includes(option)}
                      onChange={() => toggleOptionSelection(option)}
                      name="option-preview"
                      className="h-4 w-4 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-400 border-gray-300 dark:border-gray-600 transition-colors"
                    />
                  ) : (
                    <span className="text-xs text-gray-500 dark:text-gray-400 w-4">
                      {index + 1}.
                    </span>
                  )}
                  <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    {option}
                  </label>
                </div>
              ))}
            </div>
            {field.type === 'checkbox' && (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Check options to set as default selected
              </p>
            )}
            {field.type === 'radio' && (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Select an option to set as default
              </p>
            )}
          </div>
          
          {/* Options Editor */}
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="flex-shrink-0 flex flex-col space-y-1">
                  <button
                    type="button"
                    onClick={() => moveOptionUp(index)}
                    disabled={index === 0}
                    className={`p-1 rounded ${
                      index === 0 
                        ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' 
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => moveOptionDown(index)}
                    disabled={index === options.length - 1}
                    className={`p-1 rounded ${
                      index === options.length - 1 
                        ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' 
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
                <input
                  type="text"
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors"
                />
                <button
                  type="button"
                  onClick={() => removeOption(index)}
                  className="p-1.5 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
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
