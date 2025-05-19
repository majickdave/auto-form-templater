'use client';

import { useState, useEffect } from 'react';

// Define types for our form fields
type FieldType = 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'date' | 'number' | 'email' | 'multiselect';

const fieldTypes = [
  {
    type: 'text',
    label: 'Text Field',
    description: 'Single line text input',
    icon: 'M4 6h16M4 12h16M4 18h7'
  },
  {
    type: 'textarea',
    label: 'Text Area',
    description: 'Multi-line text input',
    icon: 'M4 6h16M4 12h16m-7 6h7'
  },
  {
    type: 'number',
    label: 'Number',
    description: 'Numeric input field',
    icon: 'M7 20l4-16m2 16l4-16M6 9h14M4 15h14'
  },
  {
    type: 'email',
    label: 'Email',
    description: 'Email input field',
    icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
  },
  {
    type: 'date',
    label: 'Date',
    description: 'Date picker field',
    icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
  },
  {
    type: 'select',
    label: 'Dropdown',
    description: 'Select from options',
    icon: 'M19 9l-7 7-7-7'
  },
  {
    type: 'multiselect',
    label: 'Multi-Select Dropdown',
    description: 'Select multiple options from dropdown',
    icon: 'M19 9l-7 7-7-7'
  },
  {
    type: 'radio',
    label: 'Radio Buttons',
    description: 'Select one option',
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
  },
  {
    type: 'checkbox',
    label: 'Checkboxes',
    description: 'Select multiple options',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'
  }
];

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
  const [fieldType, setFieldType] = useState<FieldType>(field.type);
  const [bulkOptions, setBulkOptions] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Reset field-specific state when field type changes
  useEffect(() => {
    // Initialize options if switching to a field type that needs them
    if ((fieldType === 'select' || fieldType === 'radio' || fieldType === 'checkbox') && 
        (!options.length || field.type !== fieldType)) {
      setOptions(['Option 1', 'Option 2']);
      setSelectedOptions([]);
    }
    
    // Reset placeholder for appropriate field types
    if (fieldType !== field.type) {
      if (fieldType === 'select') {
        setPlaceholder('Select an option');
      } else if (fieldType === 'text' || fieldType === 'textarea' || fieldType === 'number' || fieldType === 'email') {
        setPlaceholder(`Enter ${fieldType}...`);
      }
      
      // Reset default value when changing field types
      setDefaultValue('');
      setSelectedOptions([]);
    }
  }, [fieldType]);
  
  // Handle save
  const handleSave = () => {
    const updatedField = {
      ...field,
      type: fieldType,
      label,
      placeholder,
      required,
      options: (fieldType === 'select' || fieldType === 'radio' || fieldType === 'checkbox') ? options : undefined,
      defaultValue: fieldType === 'checkbox' 
        ? selectedOptions 
        : fieldType === 'radio' || fieldType === 'select'
          ? selectedOptions[0] || ''
          : defaultValue || undefined,
      metadata: {
        label,
        type: fieldType,
        default_value: fieldType === 'checkbox' 
          ? selectedOptions 
          : fieldType === 'radio' || fieldType === 'select'
            ? selectedOptions[0] || null
            : defaultValue || null,
        required,
        options: (fieldType === 'select' || fieldType === 'radio' || fieldType === 'checkbox') ? options : null,
        placeholder: placeholder || null
      }
    };
    
    onSave(updatedField);
  };
  
  // Add a new option
  const addOption = () => {
    setOptions([...options, `Option ${options.length + 1}`]);
  };
  
  // Add multiple options from comma-separated text
  const addBulkOptions = () => {
    if (!bulkOptions.trim()) return;
    
    // Split by commas, trim whitespace, and filter out empty strings
    const newOptions = bulkOptions
      .split(',')
      .map(opt => opt.trim())
      .filter(opt => opt.length > 0);
    
    if (newOptions.length > 0) {
      setOptions([...options, ...newOptions]);
      setBulkOptions(''); // Clear the input after adding
    }
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
    if (fieldType === 'checkbox') {
      if (selectedOptions.includes(option)) {
        setSelectedOptions(selectedOptions.filter(opt => opt !== option));
      } else {
        setSelectedOptions([...selectedOptions, option]);
      }
    } else if (fieldType === 'radio' || fieldType === 'select') {
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
  
  // Expose handleSave to parent component
  useEffect(() => {
    // Update the field object in the parent component when changes are made
    const updatedField = {
      ...field,
      type: fieldType,
      label,
      placeholder,
      required,
      options: (fieldType === 'select' || fieldType === 'radio' || fieldType === 'checkbox') ? options : undefined,
      defaultValue: fieldType === 'checkbox' 
        ? selectedOptions 
        : fieldType === 'radio' || fieldType === 'select'
          ? selectedOptions[0] || ''
          : defaultValue || undefined,
      metadata: {
        label,
        type: fieldType,
        default_value: fieldType === 'checkbox' 
          ? selectedOptions 
          : fieldType === 'radio' || fieldType === 'select'
            ? selectedOptions[0] || null
            : defaultValue || null,
        required,
        options: (fieldType === 'select' || fieldType === 'radio' || fieldType === 'checkbox') ? options : null,
        placeholder: placeholder || null
      }
    };
    
    // Assign the updated field to the ref passed from parent
    field._currentState = updatedField;
  }, [field, fieldType, label, placeholder, required, options, defaultValue, selectedOptions]);
  
  const filteredFieldTypes = fieldTypes.filter(type => type.label.toLowerCase().includes(searchQuery.toLowerCase()));
  
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Field Type</label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-md bg-gray-100 dark:bg-gray-700 mr-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-gray-500 dark:text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={fieldTypes.find(t => t.type === fieldType)?.icon || ''} />
                </svg>
              </div>
              <div className="text-left">
                <div className="font-medium">{fieldTypes.find(t => t.type === fieldType)?.label}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{fieldTypes.find(t => t.type === fieldType)?.description}</div>
              </div>
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-gray-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {dropdownOpen && (
            <div className="absolute z-10 mt-1 w-full rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none">
              <div className="p-2">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search field types..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                <div className="max-h-60 overflow-y-auto py-1">
                  {filteredFieldTypes.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                      No field types match your search
                    </div>
                  ) : (
                    filteredFieldTypes.map((type) => (
                      <button
                        key={type.type}
                        type="button"
                        onClick={() => {
                          setFieldType(type.type as FieldType);
                          setDropdownOpen(false);
                          setSearchQuery('');
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-start gap-3 group"
                      >
                        <div className="flex-shrink-0 w-8 h-8 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mt-0.5 group-hover:bg-blue-200 dark:group-hover:bg-blue-800/40 transition-colors">
                          <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={type.icon} />
                          </svg>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{type.label}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{type.description}</div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Field Label</label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors"
        />
      </div>
      
      {(fieldType === 'text' || fieldType === 'textarea' || fieldType === 'number' || fieldType === 'email') && (
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
      
      {(fieldType === 'text' || fieldType === 'number' || fieldType === 'email' || fieldType === 'date') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default Value</label>
          <input
            type={fieldType === 'date' ? 'date' : 'text'}
            value={defaultValue}
            onChange={(e) => setDefaultValue(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors"
          />
        </div>
      )}
      
      {(fieldType === 'select' || fieldType === 'radio' || fieldType === 'checkbox') && (
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
          
          {/* Bulk add options */}
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Add Multiple Options (comma-separated)
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={bulkOptions}
                onChange={(e) => setBulkOptions(e.target.value)}
                placeholder="Option 1, Option 2, Option 3"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addBulkOptions();
                  }
                }}
              />
              <button
                type="button"
                onClick={addBulkOptions}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-lg transition-colors text-sm"
              >
                Add
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Type comma-separated values and press Enter or click Add
            </p>
          </div>
          
          {/* Options Preview */}
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-lg">
            <h4 className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 font-semibold">Preview</h4>
            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={`preview-${index}`} className="flex items-center">
                  {fieldType === 'checkbox' ? (
                    <input
                      type="checkbox"
                      checked={selectedOptions.includes(option)}
                      onChange={() => toggleOptionSelection(option)}
                      className="h-4 w-4 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-400 border-gray-300 dark:border-gray-600 rounded transition-colors"
                    />
                  ) : fieldType === 'radio' ? (
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
            {fieldType === 'checkbox' && (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Check options to set as default selected
              </p>
            )}
            {fieldType === 'radio' && (
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
    </div>
  );
}
