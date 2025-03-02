'use client';

import { useState, useEffect } from 'react';
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
}

interface FormBuilderProps {
  onSubmit: (formData: any) => void;
  isSubmitting: boolean;
  initialData?: any;
  template_id?: string;
}

// Sortable field item component
function SortableFieldItem({ field, isActive, onClick, onDelete }: { 
  field: FormField; 
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-4 bg-white border rounded-md hover:shadow-sm ${
        isActive ? 'ring-2 ring-blue-500' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex justify-between mb-1">
        <div className="flex items-center">
          {/* Drag handle */}
          <div
            {...attributes}
            {...listeners}
            className="mr-2 cursor-move text-gray-400 hover:text-gray-600"
          >
            ⋮⋮
          </div>
          <label className="block text-sm font-medium">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        </div>
        <div className="flex space-x-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-red-500 hover:text-red-700 text-sm"
          >
            Delete
          </button>
        </div>
      </div>
      
      {/* Field preview */}
      {field.type === 'text' && (
        <input
          type="text"
          placeholder={field.placeholder}
          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
          disabled
        />
      )}
      
      {field.type === 'textarea' && (
        <textarea
          placeholder={field.placeholder}
          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
          rows={3}
          disabled
        />
      )}
      
      {field.type === 'select' && (
        <select className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50" disabled>
          <option value="">Select an option</option>
          {field.options?.map((option, i) => (
            <option key={i} value={option}>{option}</option>
          ))}
        </select>
      )}
      
      {field.type === 'radio' && field.options?.map((option, i) => (
        <div key={i} className="flex items-center mt-2">
          <input
            type="radio"
            className="h-4 w-4 text-blue-600"
            disabled
          />
          <label className="ml-2 text-sm text-gray-700">{option}</label>
        </div>
      ))}
      
      {field.type === 'checkbox' && field.options?.map((option, i) => (
        <div key={i} className="flex items-center mt-2">
          <input
            type="checkbox"
            className="h-4 w-4 text-blue-600 rounded"
            disabled
          />
          <label className="ml-2 text-sm text-gray-700">{option}</label>
        </div>
      ))}
      
      {field.type === 'date' && (
        <input
          type="date"
          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
          disabled
        />
      )}
      
      {field.type === 'number' && (
        <input
          type="number"
          placeholder={field.placeholder}
          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
          disabled
        />
      )}
      
      {field.type === 'email' && (
        <input
          type="email"
          placeholder={field.placeholder}
          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
          disabled
        />
      )}
    </div>
  );
}

export default function FormBuilder({ onSubmit, isSubmitting, initialData, template_id }: FormBuilderProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [isPublic, setIsPublic] = useState(initialData?.public || false);
  const [fields, setFields] = useState<FormField[]>(initialData?.fields || []);
  const [activeField, setActiveField] = useState<FormField | null>(null);

  // Update form when initialData changes (e.g., when a Google Form is imported)
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setDescription(initialData.description || '');
      
      // Convert imported fields to our format if needed
      if (initialData.fields && Array.isArray(initialData.fields)) {
        const convertedFields = initialData.fields.map((field: any) => ({
          id: field.id || `field-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          type: field.type || 'text',
          label: field.label || 'Untitled Field',
          required: field.required || false,
          options: field.options || [],
          placeholder: field.placeholder || '',
        }));
        
        setFields(convertedFields);
      }
    }
  }, [initialData]);

  // Set up DND sensors
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
      ...(type === 'select' || type === 'radio' || type === 'checkbox'
        ? { options: ['Option 1', 'Option 2'] }
        : {}),
    };
    
    setFields([...fields, newField]);
    setActiveField(newField);
  };

  // Update a field
  const updateField = (updatedField: FormField) => {
    setFields(fields.map(field => 
      field.id === updatedField.id ? updatedField : field
    ));
    setActiveField(updatedField);
  };

  // Delete a field
  const deleteField = (fieldId: string) => {
    setFields(fields.filter(field => field.id !== fieldId));
    if (activeField?.id === fieldId) {
      setActiveField(null);
    }
  };

  // Handle field reordering
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setFields((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!title.trim()) {
      alert('Please enter a form title');
      return;
    }

    if (fields.length === 0) {
      alert('Please add at least one field to your form');
      return;
    }
    
    // Submit form data
    onSubmit({
      title,
      description,
      fields,
      isPublic,
      template_id: template_id || null,
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Form Settings Panel */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-lg shadow p-6 sticky top-6">
          <h2 className="text-xl font-semibold mb-4">Form Settings</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Form Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Enter form title"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Enter form description"
                rows={3}
              />
            </div>
            
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Make this form public
                </span>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Public forms can be accessed by anyone with the link.
              </p>
            </div>
            
            <div className="pt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Add Field</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => addField('text')}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                >
                  Text
                </button>
                <button
                  type="button"
                  onClick={() => addField('textarea')}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                >
                  Text Area
                </button>
                <button
                  type="button"
                  onClick={() => addField('select')}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                >
                  Dropdown
                </button>
                <button
                  type="button"
                  onClick={() => addField('radio')}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                >
                  Radio Buttons
                </button>
                <button
                  type="button"
                  onClick={() => addField('checkbox')}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                >
                  Checkboxes
                </button>
                <button
                  type="button"
                  onClick={() => addField('date')}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                >
                  Date
                </button>
                <button
                  type="button"
                  onClick={() => addField('number')}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                >
                  Number
                </button>
                <button
                  type="button"
                  onClick={() => addField('email')}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                >
                  Email
                </button>
              </div>
            </div>
          </div>
          
          <div className="mt-6">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Form'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Form Preview and Field Editor */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-lg shadow divide-y">
          {/* Form Preview */}
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Form Preview</h2>
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 min-h-[300px]">
              <h3 className="text-xl font-medium mb-2">{title || 'Untitled Form'}</h3>
              {description && <p className="text-gray-600 mb-4">{description}</p>}
              
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <div className="space-y-4">
                  {fields.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      Add fields from the panel on the left
                    </p>
                  ) : (
                    <SortableContext 
                      items={fields.map(field => field.id)} 
                      strategy={verticalListSortingStrategy}
                    >
                      {fields.map((field) => (
                        <SortableFieldItem
                          key={field.id}
                          field={field}
                          isActive={activeField?.id === field.id}
                          onClick={() => setActiveField(field)}
                          onDelete={() => deleteField(field.id)}
                        />
                      ))}
                    </SortableContext>
                  )}
                </div>
              </DndContext>
            </div>
          </div>
          
          {/* Field Editor */}
          {activeField && (
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Edit Field</h2>
              <FieldEditor 
                field={activeField}
                onUpdate={updateField}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}