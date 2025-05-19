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
import AddFieldButton from './AddFieldButton';
import { useRouter } from 'next/navigation';

// Define types for our form fields
type FieldType = 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'date' | 'number' | 'email' | 'multiselect';

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

// Add interface for field order
interface FieldOrder {
  [key: string]: number;
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
  const router = useRouter();
  const [fields, setFields] = useState<FormField[]>(initialData?.fields || []);
  const [formTitle, setFormTitle] = useState(initialData?.title || '');
  const [formDescription, setFormDescription] = useState(initialData?.description || '');
  const [isPublic, setIsPublic] = useState(initialData?.public ?? true);
  const [activeField, setActiveField] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<any | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [fieldOrder, setFieldOrder] = useState<FieldOrder>(() => {
    // Initialize field order from initialData or create new order
    if (initialData?.fieldOrder) {
      return initialData.fieldOrder;
    }
    const order: FieldOrder = {};
    fields.forEach((field, index) => {
      order[field.id] = index;
    });
    return order;
  });
  
  const autoSaveTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // Clean up auto-save timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeout.current) {
        clearTimeout(autoSaveTimeout.current);
      }
    };
  }, []);
  
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
      placeholder: type === 'select' || type === 'multiselect' ? 'Select an option' : `Enter ${type}...`,
      options: (type === 'select' || type === 'radio' || type === 'checkbox' || type === 'multiselect') ? ['Option 1', 'Option 2'] : undefined,
      metadata: {
        label: `New ${type} field`,
        type,
        default_value: null,
        required: false,
        options: (type === 'select' || type === 'radio' || type === 'checkbox' || type === 'multiselect') ? ['Option 1', 'Option 2'] : null,
        placeholder: type === 'select' || type === 'multiselect' ? 'Select an option' : `Enter ${type}...`
      }
    };
    
    setFields([...fields, newField]);
    // Add new field to order
    setFieldOrder(prev => ({
      ...prev,
      [newField.id]: fields.length
    }));
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
        fields: newFields,
        fieldOrder,
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
    // Remove field from order and update remaining indices
    setFieldOrder(prev => {
      const newOrder = { ...prev };
      delete newOrder[fieldId];
      // Reorder remaining fields
      Object.keys(newOrder).forEach((id, index) => {
        newOrder[id] = index;
      });
      return newOrder;
    });
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
        
        const newFields = arrayMove(fields, oldIndex, newIndex);
        
        // Update field order
        const newFieldOrder: FieldOrder = {};
        newFields.forEach((field, index) => {
          newFieldOrder[field.id] = index;
        });
        setFieldOrder(newFieldOrder);
        
        return newFields;
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
      fieldOrder,
      template_id
    };
    
    onSubmit(formData);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Sticky header with save button */}
      <div className="sticky top-0 z-20 bg-white dark:bg-gray-900 shadow-md border-b border-gray-200 dark:border-gray-700 py-3 px-4 mb-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </button>
            <h1 className="text-lg font-semibold text-gray-800 dark:text-white">
              {initialData ? 'Edit Form' : 'Create New Form'}
            </h1>
          </div>
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
              <AddFieldButton onAddField={addField} />
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