'use client';

import { useState, useEffect, useRef } from 'react';
import FieldEditor from './FieldEditor';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Define types for our form fields
type FieldType = 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'date' | 'number' | 'email';

interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[]; // For select, radio, checkbox
  defaultValue?: string;
  metadata: {
    label: string;
    type: string;
    default_value: string | string[] | null;
    required: boolean;
    options: string[] | null;
    placeholder: string | null;
  };
}

interface FormBuilderProps {
  onSubmit: (formData: any) => void;
  isSubmitting: boolean;
  initialData?: any;
  template_id?: string;
}

// Sortable item wrapper component
function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} id={`field-${id}`} className="transition-colors duration-300">
      {children}
    </div>
  );
}

export default function FormBuilder({ onSubmit, isSubmitting, initialData, template_id }: FormBuilderProps) {
  const [fields, setFields] = useState<FormField[]>(initialData?.fields || []);
  const [formTitle, setFormTitle] = useState(initialData?.title || '');
  const [formDescription, setFormDescription] = useState(initialData?.description || '');
  const [isPublic, setIsPublic] = useState(initialData?.public ?? true);
  const [activeField, setActiveField] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<any | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [focusedItemIndex, setFocusedItemIndex] = useState(-1);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuItemsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // Clean up auto-save timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeout.current) {
        clearTimeout(autoSaveTimeout.current);
      }
    };
  }, []);
  
  // Field types with icons and descriptions
  const fieldTypes = [
    { type: 'text', label: 'Text Field', icon: 'M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z', description: 'Single line text input' },
    { type: 'textarea', label: 'Text Area', icon: 'M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1zm1 3h14M5 14h14', description: 'Multi-line text input' },
    { type: 'select', label: 'Dropdown', icon: 'M8 9l4-4 4 4m0 6l-4 4-4-4', description: 'Select from a list of options' },
    { type: 'radio', label: 'Radio Buttons', icon: 'M12 22a10 10 0 100-20 10 10 0 000 20zm0-6a4 4 0 100-8 4 4 0 000 8z', description: 'Choose one option from a list' },
    { type: 'checkbox', label: 'Checkboxes', icon: 'M5 13l4 4L19 7', description: 'Choose multiple options from a list' },
    { type: 'date', label: 'Date', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', description: 'Date picker input' },
    { type: 'number', label: 'Number', icon: 'M7 20l4-16m2 16l4-16M6 9h14M4 15h14', description: 'Numeric input field' },
    { type: 'email', label: 'Email', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', description: 'Email address input' },
  ];
  
  // Filter field types based on search query
  const filteredFieldTypes = searchQuery
    ? fieldTypes.filter(field => 
        field.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        field.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : fieldTypes;
  
  // Reset focused item when dropdown opens/closes or when search query changes
  useEffect(() => {
    setFocusedItemIndex(dropdownOpen ? 0 : -1);
    
    // Focus the search input when dropdown opens
    if (dropdownOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 10);
    }
  }, [dropdownOpen, searchQuery]);
  
  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
        setSearchQuery('');
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Handle keyboard navigation
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!dropdownOpen) return;
      
      if (event.key === 'Escape') {
        setDropdownOpen(false);
        setSearchQuery('');
        buttonRef.current?.focus();
        return;
      }
      
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        
        const itemCount = filteredFieldTypes.length;
        
        if (itemCount === 0) return;
        
        if (event.key === 'ArrowDown') {
          setFocusedItemIndex((prevIndex) => {
            const newIndex = prevIndex < itemCount - 1 ? prevIndex + 1 : 0;
            menuItemsRef.current[newIndex]?.focus();
            return newIndex;
          });
        } else {
          setFocusedItemIndex((prevIndex) => {
            const newIndex = prevIndex > 0 ? prevIndex - 1 : itemCount - 1;
            menuItemsRef.current[newIndex]?.focus();
            return newIndex;
          });
        }
      }
    }
    
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [dropdownOpen, filteredFieldTypes.length]);
  
  // Reset menu items ref when dropdown opens
  useEffect(() => {
    if (dropdownOpen) {
      menuItemsRef.current = menuItemsRef.current.slice(0, filteredFieldTypes.length);
    }
  }, [dropdownOpen, filteredFieldTypes.length]);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Add a new field
  const addField = (type: FieldType) => {
    const newField: FormField = {
      id: `field-${Date.now()}`,
      type,
      label: `New ${type} field`,
      required: false,
      placeholder: type === 'select' ? 'Select an option' : `Enter ${type}...`,
      options: (type === 'select' || type === 'radio' || type === 'checkbox') ? ['Option 1', 'Option 2'] : undefined,
      metadata: {
        label: `New ${type} field`,
        type,
        default_value: null,
        required: false,
        options: (type === 'select' || type === 'radio' || type === 'checkbox') ? ['Option 1', 'Option 2'] : null,
        placeholder: type === 'select' ? 'Select an option' : `Enter ${type}...`
      }
    };
    
    setFields([...fields, newField]);
    setActiveField(newField.id);
    setEditingField(newField);
    setEditingIndex(fields.length);
  };

  // Handle field edit
  const handleEditField = (field: any, index: number) => {
    // Create a deep copy of the field to avoid reference issues
    const fieldCopy = JSON.parse(JSON.stringify(field));
    setEditingField(fieldCopy);
    setEditingIndex(index);
    setShowEditorModal(true);
  };

  // Handle field update from editor
  const handleFieldSave = (updatedField: any) => {
    if (editingIndex !== null) {
      const newFields = [...fields];
      newFields[editingIndex] = updatedField;
      setFields(newFields);
      
      // Provide visual feedback
      setActiveField(updatedField.id);
      setTimeout(() => {
        const fieldElement = document.getElementById(`field-${updatedField.id}`);
        if (fieldElement) {
          fieldElement.classList.add('bg-blue-50', 'dark:bg-blue-900/20');
          setTimeout(() => {
            fieldElement.classList.remove('bg-blue-50', 'dark:bg-blue-900/20');
          }, 1000);
        }
      }, 100);
      
      // Reset editing state
      setEditingField(null);
      setEditingIndex(null);
      setShowEditorModal(false);
      
      // Automatically save the form after field edit
      const formData = {
        title: formTitle,
        description: formDescription,
        public: isPublic,
        fields: newFields, // Use the updated fields array
        template_id
      };
      
      // Show saving indicator
      setAutoSaving(true);
      
      // Use a debounced save to prevent too many API calls
      if (autoSaveTimeout.current) {
        clearTimeout(autoSaveTimeout.current);
      }
      
      autoSaveTimeout.current = setTimeout(() => {
        onSubmit(formData);
        // Hide saving indicator after a short delay
        setTimeout(() => {
          setAutoSaving(false);
        }, 1000);
      }, 500);
    }
  };

  // Handle field edit cancel
  const handleEditCancel = () => {
    setEditingField(null);
    setEditingIndex(null);
    setShowEditorModal(false);
  };

  // Delete a field
  const deleteField = (fieldId: string) => {
    setFields(fields.filter(field => field.id !== fieldId));
    if (activeField === fieldId) {
      setActiveField(null);
    }
    if (editingField?.id === fieldId) {
      setEditingField(null);
      setEditingIndex(null);
    }
  };

  // Handle drag end event
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setFields(fields => {
        const oldIndex = fields.findIndex(field => field.id === active.id);
        const newIndex = fields.findIndex(field => field.id === over.id);
        
        return arrayMove(fields, oldIndex, newIndex);
      });
    }
  };

  // Handle form submission
  const handleSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    const formData = {
      title: formTitle,
      description: formDescription,
      public: isPublic,
      fields,
      template_id
    };
    
    onSubmit(formData);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Sticky header with save button */}
      <div className="sticky top-0 z-20 bg-white dark:bg-gray-900 shadow-md border-b border-gray-200 dark:border-gray-700 py-3 px-4 mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-lg font-semibold text-gray-800 dark:text-white">
            {initialData ? 'Edit Form' : 'Create New Form'}
          </h1>
          <div className="flex items-center space-x-3">
            {autoSaving && (
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Auto-saving...
              </div>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || fields.length === 0 || !formTitle}
              className={`px-4 py-2 rounded-lg text-white font-medium transition-all duration-200 ${
                isSubmitting || fields.length === 0 || !formTitle
                  ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800'
              }`}
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </div>
              ) : (
                'Save Form'
              )}
            </button>
          </div>
        </div>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Form Title and Description */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Form Builder</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Create your form by adding and configuring fields</p>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="formTitle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Form Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="formTitle"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors"
                  placeholder="Enter form title"
                />
              </div>
              
              <div className="sm:col-span-2">
                <label htmlFor="formDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  id="formDescription"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors"
                  placeholder="Enter form description"
                />
              </div>
              
              <div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="h-4 w-4 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-400 border-gray-300 dark:border-gray-600 rounded transition-colors"
                  />
                  <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Make this form public
                  </label>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Public forms can be accessed by anyone with the link
                </p>
              </div>
            </div>
          </div>
          
          {/* Form Fields */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Form Fields</h3>
              
              <div className="relative inline-block text-left" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 rounded-lg transition-colors shadow-sm"
                  aria-haspopup="true"
                  aria-expanded={dropdownOpen}
                  id="add-field-menu-button"
                  ref={buttonRef}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown' && !dropdownOpen) {
                      e.preventDefault();
                      setDropdownOpen(true);
                    }
                  }}
                >
                  <svg 
                    className="w-5 h-5 mr-2" 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Add Field</span>
                  <svg 
                    className={`w-4 h-4 ml-2 transition-transform duration-200 ${dropdownOpen ? 'transform rotate-180' : ''}`} 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 20 20" 
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                {dropdownOpen && (
                  <div 
                    className="absolute right-0 mt-2 w-72 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-10 overflow-hidden"
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="add-field-menu-button"
                  >
                    <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="h-4 w-4 text-gray-400 dark:text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        <input
                          type="text"
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                          placeholder="Search field types..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          ref={searchInputRef}
                        />
                      </div>
                    </div>
                    
                    <div className="max-h-60 overflow-y-auto py-1" role="none">
                      {filteredFieldTypes.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                          No field types match your search
                        </div>
                      ) : (
                        filteredFieldTypes.map((fieldType, index) => (
                          <button
                            key={fieldType.type}
                            type="button"
                            onClick={() => {
                              addField(fieldType.type as FieldType);
                              setDropdownOpen(false);
                              setSearchQuery('');
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-start gap-3 group"
                            role="menuitem"
                            tabIndex={0}
                            ref={(el) => { menuItemsRef.current[index] = el; }}
                          >
                            <div className="flex-shrink-0 w-8 h-8 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mt-0.5 group-hover:bg-blue-200 dark:group-hover:bg-blue-800/40 transition-colors">
                              <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={fieldType.icon} />
                              </svg>
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">{fieldType.label}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{fieldType.description}</div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {fields.length === 0 ? (
              <div className="text-center py-8 px-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No fields added yet</h3>
                <p className="mt-2 text-gray-500 dark:text-gray-400">Start by adding fields to your form using the 'Add Field' button</p>
              </div>
            ) : (
              <div className="mt-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Click once to select a field, click again or double-click to edit its properties.
                </p>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={fields.map(field => field.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {fields.map((field, index) => (
                      <SortableItem key={field.id} id={field.id}>
                        <div 
                          className={`bg-white dark:bg-gray-800 border ${
                            editingField && editingField.id === field.id 
                              ? 'border-blue-500 dark:border-blue-500' 
                              : activeField === field.id 
                                ? 'border-gray-200 dark:border-gray-700 ring-2 ring-blue-500 dark:ring-blue-400' 
                                : 'border-gray-200 dark:border-gray-700'
                          } rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750`}
                          onClick={(e) => {
                            // If already active, open the editor
                            if (activeField === field.id) {
                              handleEditField(field, index);
                            } else {
                              // Otherwise just set as active
                              setActiveField(field.id);
                            }
                          }}
                          onDoubleClick={(e) => {
                            e.preventDefault();
                            // Double-click immediately opens the editor
                            handleEditField(field, index);
                          }}
                        >
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700 rounded-t-lg">
                            <div className="flex items-center">
                              <span className="cursor-grab text-gray-500 dark:text-gray-400 mr-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                </svg>
                              </span>
                              <span className="font-medium text-gray-800 dark:text-gray-200">{field.label || 'Untitled Field'}</span>
                              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300">
                                {field.type}
                              </span>
                              {field.required && (
                                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                                  Required
                                </span>
                              )}
                              {activeField === field.id && !editingField && (
                                <span className="ml-2 text-xs text-blue-600 dark:text-blue-400 animate-pulse">
                                  Click again to edit
                                </span>
                              )}
                            </div>
                            <div className="flex space-x-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditField(field, index);
                                }}
                                className="p-1 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteField(field.id);
                                }}
                                className="p-1 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          <div className="p-3 bg-white dark:bg-gray-700">
                            <div className="text-sm text-gray-600 dark:text-gray-300">
                              {field.type === 'select' || field.type === 'radio' || field.type === 'checkbox' ? (
                                <div>
                                  <p className="mb-1 font-medium text-xs text-gray-500 dark:text-gray-400">Options:</p>
                                  <div className="pl-2 border-l-2 border-gray-200 dark:border-gray-600">
                                    {field.options?.map((option, optionIndex) => (
                                      <div key={optionIndex} className="mb-1 last:mb-0">• {option}</div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <p>
                                  <span className="font-medium text-xs text-gray-500 dark:text-gray-400">Placeholder: </span>
                                  {field.placeholder || 'None'}
                                </p>
                              )}
                              {field.defaultValue && (
                                <p className="mt-1">
                                  <span className="font-medium text-xs text-gray-500 dark:text-gray-400">Default: </span>
                                  {field.defaultValue}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </SortableItem>
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            )}
          </div>
          
          {/* Field Editor Modal */}
          {showEditorModal && editingField && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Modal header with sticky save/cancel buttons */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10 flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Edit Field</h3>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (editingField._currentState) {
                          handleFieldSave(editingField._currentState);
                        }
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-lg transition-colors text-sm flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save
                    </button>
                    <button 
                      type="button" 
                      onClick={handleEditCancel}
                      className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors text-sm flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Cancel
                    </button>
                  </div>
                </div>
                
                {/* Modal body with scrollable content */}
                <div className="p-6 overflow-y-auto">
                  <FieldEditor
                    field={editingField}
                    onSave={handleFieldSave}
                    onCancel={handleEditCancel}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}