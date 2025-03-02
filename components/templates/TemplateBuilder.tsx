'use client';

import { useState } from 'react';
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

// Define types for our template fields
type FieldType = 'text' | 'date' | 'number' | 'select' | 'checkbox';

interface TemplateField {
  id: string;
  type: FieldType;
  name: string;
  label: string;
  required: boolean;
  options?: string[]; // For select, checkbox
  defaultValue?: string;
}

interface TemplateBuilderProps {
  onSubmit: (templateData: any) => void;
  isSubmitting: boolean;
  initialData?: any;
  isEditMode?: boolean;
}

// Sortable field item component
function SortableFieldItem({ field, isActive, onClick, onDelete }: { 
  field: TemplateField; 
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
            className="text-red-500 hover:text-red-700 text-sm btn"
          >
            Delete
          </button>
        </div>
      </div>
      
      {/* Field preview */}
      <div className="mt-1 text-sm text-gray-500">
        Field type: {field.type}
      </div>
      <div className="mt-1 text-sm text-gray-500">
        Field name: {field.name}
      </div>
    </div>
  );
}

export default function TemplateBuilder({ onSubmit, isSubmitting, initialData, isEditMode = false }: TemplateBuilderProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [content, setContent] = useState(initialData?.template_content || '');
  const [fields, setFields] = useState<TemplateField[]>(initialData?.fields || []);
  const [activeField, setActiveField] = useState<TemplateField | null>(null);
  
  // For field editing
  const [fieldName, setFieldName] = useState('');
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldType, setFieldType] = useState<FieldType>('text');
  const [fieldRequired, setFieldRequired] = useState(false);
  const [fieldOptions, setFieldOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState('');

  // Set up DND sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Add a new field
  const addField = () => {
    const newField: TemplateField = {
      id: `field-${Date.now()}`,
      type: 'text',
      name: `field_${fields.length + 1}`,
      label: `Field ${fields.length + 1}`,
      required: false,
    };
    
    setFields([...fields, newField]);
    setActiveField(newField);
    setFieldName(newField.name);
    setFieldLabel(newField.label);
    setFieldType(newField.type);
    setFieldRequired(newField.required);
    setFieldOptions([]);
  };

  // Update a field
  const updateField = () => {
    if (!activeField) return;
    
    const updatedField: TemplateField = {
      ...activeField,
      name: fieldName,
      label: fieldLabel,
      type: fieldType,
      required: fieldRequired,
      ...(fieldType === 'select' || fieldType === 'checkbox' 
        ? { options: fieldOptions } 
        : {})
    };
    
    setFields(fields.map(field => 
      field.id === activeField.id ? updatedField : field
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

  // Handle field selection
  const selectField = (field: TemplateField) => {
    setActiveField(field);
    setFieldName(field.name);
    setFieldLabel(field.label);
    setFieldType(field.type);
    setFieldRequired(field.required);
    setFieldOptions(field.options || []);
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

  // Add option to select/checkbox field
  const addOption = () => {
    if (newOption.trim() && (fieldType === 'select' || fieldType === 'checkbox')) {
      setFieldOptions([...fieldOptions, newOption.trim()]);
      setNewOption('');
    }
  };

  // Remove option from select/checkbox field
  const removeOption = (index: number) => {
    const newOptions = [...fieldOptions];
    newOptions.splice(index, 1);
    setFieldOptions(newOptions);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!name.trim()) {
      alert('Please enter a template name');
      return;
    }

    if (!content.trim()) {
      alert('Please enter template content');
      return;
    }

    onSubmit({
      name,
      description,
      template_content: content,
      fields,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Template details */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-semibold mb-4">Template Details</h2>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Template Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700">
              Template Content <span className="text-red-500">*</span>
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 font-mono"
              placeholder="Enter your template content here. Use {{field_name}} to insert dynamic fields."
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              Use double curly braces to insert fields, e.g., {'{{field_name}}'}
            </p>
          </div>
        </div>
      </div>
      
      {/* Template fields */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Template Fields</h2>
          <button
            type="button"
            onClick={addField}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 mb-4 btn"
          >
            Add Field
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Fields list */}
          <div className="md:col-span-1 border rounded-md p-4 bg-gray-50">
            <h3 className="font-medium mb-3">Fields</h3>
            
            {fields.length > 0 ? (
              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext 
                  items={fields.map(field => field.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {fields.map((field) => (
                      <SortableFieldItem
                        key={field.id}
                        field={field}
                        isActive={activeField?.id === field.id}
                        onClick={() => selectField(field)}
                        onDelete={() => deleteField(field.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <p className="text-gray-500 text-sm">No fields added yet</p>
            )}
          </div>
          
          {/* Field editor */}
          <div className="md:col-span-2 border rounded-md p-4">
            <h3 className="font-medium mb-3">Field Properties</h3>
            
            {activeField ? (
              <div className="space-y-4">
                <div>
                  <label htmlFor="fieldName" className="block text-sm font-medium text-gray-700">
                    Field Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="fieldName"
                    value={fieldName}
                    onChange={(e) => setFieldName(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    This is the name used in the template with {'{{field_name}}'}
                  </p>
                </div>
                
                <div>
                  <label htmlFor="fieldLabel" className="block text-sm font-medium text-gray-700">
                    Field Label <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="fieldLabel"
                    value={fieldLabel}
                    onChange={(e) => setFieldLabel(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    This is the label shown to users filling out the form
                  </p>
                </div>
                
                <div>
                  <label htmlFor="fieldType" className="block text-sm font-medium text-gray-700">
                    Field Type
                  </label>
                  <select
                    id="fieldType"
                    value={fieldType}
                    onChange={(e) => setFieldType(e.target.value as FieldType)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="text">Text</option>
                    <option value="date">Date</option>
                    <option value="number">Number</option>
                    <option value="select">Select (Dropdown)</option>
                    <option value="checkbox">Checkbox</option>
                  </select>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="fieldRequired"
                    checked={fieldRequired}
                    onChange={(e) => setFieldRequired(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="fieldRequired" className="ml-2 block text-sm text-gray-700">
                    Required field
                  </label>
                </div>
                
                {/* Options for select and checkbox fields */}
                {(fieldType === 'select' || fieldType === 'checkbox') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Options
                    </label>
                    
                    <div className="space-y-2 mb-2">
                      {fieldOptions.map((option, index) => (
                        <div key={index} className="flex items-center">
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...fieldOptions];
                              newOptions[index] = e.target.value;
                              setFieldOptions(newOptions);
                            }}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => removeOption(index)}
                            className="text-red-500 hover:text-red-700 text-sm ml-2 btn"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex">
                      <input
                        type="text"
                        value={newOption}
                        onChange={(e) => setNewOption(e.target.value)}
                        placeholder="Add new option"
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={addOption}
                        className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm mt-2 btn"
                      >
                        Add Option
                      </button>
                    </div>
                  </div>
                )}
                
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={updateField}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Update Field
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Select a field to edit or add a new field</p>
            )}
          </div>
        </div>
      </div>
      
      {/* Submit button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 btn"
        >
          {isSubmitting ? 'Saving...' : isEditMode ? 'Save Template' : 'Create Template'}
        </button>
      </div>
    </form>
  );
} 