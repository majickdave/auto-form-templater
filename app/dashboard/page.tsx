'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

// Types for our data
type Template = {
  id: string;
  name: string;
  description: string;
  created_at: string;
  template_content?: string;
  hasAssociatedForm?: boolean;
  fields?: any[];
};

type Form = {
  id: string;
  title: string;
  description: string;
  public: boolean;
  created_at: string;
  template_id?: string | null;
  fields_metadata?: {
    labels: string[];
    types: string[];
    default_values: (string | string[] | null)[];
    required: boolean[];
    options: (string[] | null)[];
    placeholders: (string | null)[];
  };
};

type FormResponse = {
  id: string;
  form_id: string;
  data: Record<string, any>;
  submitted_at: string;
  respondent_email?: string;
};

export default function Dashboard() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [formTemplateMapping, setFormTemplateMapping] = useState<Record<string, string | null>>({});
  const [isUpdatingTemplate, setIsUpdatingTemplate] = useState<string | null>(null);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [formResponseCounts, setFormResponseCounts] = useState<Record<string, number>>({});
  const [isDeleting, setIsDeleting] = useState<{id: string, type: 'form' | 'template'} | null>(null);
  const [copiedFormId, setCopiedFormId] = useState<string | null>(null);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [selectedFormResponses, setSelectedFormResponses] = useState<FormResponse[]>([]);
  const [isLoadingResponses, setIsLoadingResponses] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      
      try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          router.push('/login');
          return;
        }
        
        // Fetch user's templates
        const { data: templateData, error: templateError } = await supabase
          .from('templates')
          .select('id, name, description, created_at, template_content')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (!templateError) {
          setTemplates(templateData || []);
        }
        
        // Fetch user's forms
        const { data: formData, error: formError } = await supabase
          .from('forms')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (!formError) {
          setForms(formData || []);
          
          // Initialize form-template mapping
          const mapping: Record<string, string | null> = {};
          formData?.forEach(form => {
            mapping[form.id] = form.template_id || null;
          });
          setFormTemplateMapping(mapping);
          
          // Check which templates are associated with forms
          if (templateData) {
            const templatesWithFormInfo = templateData.map(template => {
              const hasAssociatedForm = formData?.some(form => form.template_id === template.id) || false;
              return { ...template, hasAssociatedForm };
            });
            setTemplates(templatesWithFormInfo);
          }
          
          // Fetch response counts for each form
          const responseCounts: Record<string, number> = {};
          
          await Promise.all(formData?.map(async (form) => {
            const { count, error: countError } = await supabase
              .from('form_responses')
              .select('id', { count: 'exact', head: true })
              .eq('form_id', form.id);
              
            if (!countError) {
              responseCounts[form.id] = count || 0;
            }
          }) || []);
          
          setFormResponseCounts(responseCounts);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [router]);

  useEffect(() => {
    async function fetchFormResponses() {
      if (!selectedFormId) {
        setSelectedFormResponses([]);
        return;
      }

      setIsLoadingResponses(true);
      try {
        const { data: responses, error } = await supabase
          .from('form_responses')
          .select('*')
          .eq('form_id', selectedFormId)
          .order('submitted_at', { ascending: false });

        if (error) throw error;
        setSelectedFormResponses(responses || []);
      } catch (err) {
        console.error('Error fetching form responses:', err);
        setNotification({
          message: 'Failed to load form responses',
          type: 'error'
        });
      } finally {
        setIsLoadingResponses(false);
      }
    }

    fetchFormResponses();
  }, [selectedFormId]);

  // Function to refresh data
  const refreshData = async () => {
    setLoading(true);
    
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        router.push('/login');
        return;
      }
      
      // Fetch user's templates
      const { data: templateData, error: templateError } = await supabase
        .from('templates')
        .select('id, name, description, created_at, template_content')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (!templateError) {
        setTemplates(templateData || []);
        
        // Fetch user's forms
        const { data: formData, error: formError } = await supabase
          .from('forms')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (!formError) {
          setForms(formData || []);
          
          // Initialize form-template mapping
          const mapping: Record<string, string | null> = {};
          formData?.forEach(form => {
            mapping[form.id] = form.template_id || null;
          });
          setFormTemplateMapping(mapping);
          
          // Check which templates are associated with forms
          if (templateData) {
            const templatesWithFormInfo = templateData.map(template => {
              const hasAssociatedForm = formData?.some(form => form.template_id === template.id) || false;
              return { ...template, hasAssociatedForm };
            });
            setTemplates(templatesWithFormInfo);
          }
          
          // Fetch response counts for each form
          const responseCounts: Record<string, number> = {};
          
          await Promise.all(formData?.map(async (form) => {
            const { count, error: countError } = await supabase
              .from('form_responses')
              .select('id', { count: 'exact', head: true })
              .eq('form_id', form.id);
              
            if (!countError) {
              responseCounts[form.id] = count || 0;
            }
          }) || []);
          
          setFormResponseCounts(responseCounts);
        }
      }
      
    } catch (err) {
      console.error('Error refreshing data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Function to copy form share link
  const copyShareLink = (formId: string) => {
    const shareUrl = `${window.location.origin}/forms/${formId}`;
    navigator.clipboard.writeText(shareUrl);
    
    // Set the copied form ID
    setCopiedFormId(formId);
    
    // Reset after 3 seconds
    setTimeout(() => {
      setCopiedFormId(null);
    }, 3000);
  };

  // Function to open form in a new window
  const openFormInNewWindow = (formId: string) => {
    router.push(`/forms/${formId}/new-response`);
  };

  // Function to handle template association
  const handleTemplateAssociation = async (formId: string, templateId: string | null) => {
    setIsUpdatingTemplate(formId);
    
    try {
      // Check if the selected template is already associated with another form
      if (templateId) {
        const { data: existingForms, error: checkError } = await supabase
          .from('forms')
          .select('id')
          .eq('template_id', templateId)
          .neq('id', formId) // Exclude the current form
          .limit(1);
        
        if (checkError) throw checkError;
        
        if (existingForms && existingForms.length > 0) {
          setNotification({
            message: 'This template is already associated with another form. Each template can only be associated with one form.',
            type: 'error'
          });
          setIsUpdatingTemplate(null);
          return;
        }
      }
      
      // Update the form with the new template_id
      const { error } = await supabase
        .from('forms')
        .update({ template_id: templateId })
        .eq('id', formId);
      
      if (error) throw error;
      
      // If a template is selected, also update the template with the form_id
      if (templateId) {
        const { error: templateError } = await supabase
          .from('templates')
          .update({ form_id: formId })
          .eq('id', templateId);
        
        if (templateError) {
          console.warn('Warning: Could not update template with form association', templateError);
          // Continue anyway as the form was updated successfully
        }
      }
      
      // Update local state
      setFormTemplateMapping(prev => ({
        ...prev,
        [formId]: templateId
      }));
      
      // Update forms state
      setForms(forms.map(form => 
        form.id === formId ? { ...form, template_id: templateId } : form
      ));
      
      // Update templates state to reflect the new association
      setTemplates(templates.map(template => {
        const isAssociatedWithCurrentForm = template.id === templateId;
        const wasAssociatedWithCurrentForm = formTemplateMapping[formId] === template.id;
        
        // If this template is now associated with the form or was previously associated
        if (isAssociatedWithCurrentForm || wasAssociatedWithCurrentForm) {
          return {
            ...template,
            hasAssociatedForm: isAssociatedWithCurrentForm
          };
        }
        
        return template;
      }));
      
      // Show success notification
      const selectedTemplate = templates.find(t => t.id === templateId);
      setNotification({
        message: templateId 
          ? `Successfully associated form with template: ${selectedTemplate?.name}` 
          : 'Template association removed',
        type: 'success'
      });
      
      // Clear notification after 3 seconds
      setTimeout(() => {
        setNotification(null);
      }, 3000);
      
    } catch (err: any) {
      console.error('Error updating template association:', err);
      setNotification({
        message: `Failed to update template association: ${err.message}`,
        type: 'error'
      });
    } finally {
      setIsUpdatingTemplate(null);
    }
  };

  // Function to navigate to form responses page
  const navigateToResponses = (formId: string) => {
    router.push(`/dashboard/forms/${formId}/responses`);
  };

  // Function to handle form deletion
  const handleDeleteForm = async (formId: string) => {
    // Create a modal dialog for confirmation
    const confirmDialog = document.createElement('div');
    confirmDialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    confirmDialog.innerHTML = `
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <h3 class="text-lg font-medium mb-4">Delete Form</h3>
        <p class="mb-6">Are you sure you want to delete this form? This action cannot be undone.</p>
        <div class="flex justify-end space-x-3">
          <button id="cancel-delete" class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button id="confirm-delete" class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
            Delete
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(confirmDialog);
    
    // Handle button clicks
    const cancelButton = document.getElementById('cancel-delete');
    const confirmButton = document.getElementById('confirm-delete');
    
    return new Promise<void>((resolve) => {
      cancelButton?.addEventListener('click', () => {
        document.body.removeChild(confirmDialog);
        resolve();
      });
      
      confirmButton?.addEventListener('click', async () => {
        document.body.removeChild(confirmDialog);
        
        setIsDeleting({ id: formId, type: 'form' });
        
        try {
          // Check if form has responses
          const { count, error: countError } = await supabase
            .from('form_responses')
            .select('id', { count: 'exact', head: true })
            .eq('form_id', formId);
            
          if (countError) throw countError;
          
          if (count && count > 0) {
            // Create another confirmation dialog for responses
            const responseConfirmDialog = document.createElement('div');
            responseConfirmDialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
            responseConfirmDialog.innerHTML = `
              <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
                <h3 class="text-lg font-medium mb-4">Delete Form Responses</h3>
                <p class="mb-6">This form has ${count} ${count === 1 ? 'response' : 'responses'}. Deleting it will also delete all responses. Continue?</p>
                <div class="flex justify-end space-x-3">
                  <button id="cancel-response-delete" class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                    Cancel
                  </button>
                  <button id="confirm-response-delete" class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                    Delete Everything
                  </button>
                </div>
              </div>
            `;
            
            document.body.appendChild(responseConfirmDialog);
            
            const cancelResponseButton = document.getElementById('cancel-response-delete');
            const confirmResponseButton = document.getElementById('confirm-response-delete');
            
            cancelResponseButton?.addEventListener('click', () => {
              document.body.removeChild(responseConfirmDialog);
              setIsDeleting(null);
              resolve();
            });
            
            confirmResponseButton?.addEventListener('click', async () => {
              document.body.removeChild(responseConfirmDialog);
              
              // Delete form responses first
              const { error: responseDeleteError } = await supabase
                .from('form_responses')
                .delete()
                .eq('form_id', formId);
                
              if (responseDeleteError) throw responseDeleteError;
              
              // Continue with form deletion
              await deleteFormAndUpdateState(formId);
              resolve();
            });
            
            return;
          }
          
          // If no responses, proceed with deletion
          await deleteFormAndUpdateState(formId);
          resolve();
        } catch (error) {
          console.error('Error deleting form:', error);
          setNotification({
            message: 'Failed to delete form. Please try again.',
            type: 'error'
          });
          setIsDeleting(null);
          resolve();
        }
      });
    });
  };
  
  // Helper function to delete form and update state
  const deleteFormAndUpdateState = async (formId: string) => {
    try {
      // Get the template_id before deleting the form
      const templateId = formTemplateMapping[formId];
      
      // Delete the form
      const { error: formDeleteError } = await supabase
        .from('forms')
        .delete()
        .eq('id', formId);
        
      if (formDeleteError) throw formDeleteError;
      
      // If the form had a template, update the template's form_id to null
      if (templateId) {
        const { error: templateUpdateError } = await supabase
          .from('templates')
          .update({ form_id: null })
          .eq('id', templateId);
          
        if (templateUpdateError) {
          console.warn('Warning: Could not update template association', templateUpdateError);
        }
      }
      
      // Update local state
      setForms(forms.filter(form => form.id !== formId));
      
      // Remove from formTemplateMapping
      const newMapping = { ...formTemplateMapping };
      delete newMapping[formId];
      setFormTemplateMapping(newMapping);
      
      // Remove from formResponseCounts
      const newCounts = { ...formResponseCounts };
      delete newCounts[formId];
      setFormResponseCounts(newCounts);
      
      setNotification({
        message: 'Form deleted successfully',
        type: 'success'
      });
    } catch (error) {
      console.error('Error in deleteFormAndUpdateState:', error);
      throw error;
    } finally {
      setIsDeleting(null);
    }
  };
  
  // Function to handle template deletion
  const handleDeleteTemplate = async (templateId: string) => {
    // Create a modal dialog for confirmation
    const confirmDialog = document.createElement('div');
    confirmDialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    confirmDialog.innerHTML = `
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <h3 class="text-lg font-medium mb-4">Delete Template</h3>
        <p class="mb-6">Are you sure you want to delete this template? This action cannot be undone.</p>
        <div class="flex justify-end space-x-3">
          <button id="cancel-template-delete" class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button id="confirm-template-delete" class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
            Delete
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(confirmDialog);
    
    // Handle button clicks
    const cancelButton = document.getElementById('cancel-template-delete');
    const confirmButton = document.getElementById('confirm-template-delete');
    
    return new Promise<void>((resolve) => {
      cancelButton?.addEventListener('click', () => {
        document.body.removeChild(confirmDialog);
        resolve();
      });
      
      confirmButton?.addEventListener('click', async () => {
        document.body.removeChild(confirmDialog);
        
        setIsDeleting({ id: templateId, type: 'template' });
        
        try {
          // Check if template is associated with any forms
          const template = templates.find(t => t.id === templateId);
          
          if (template?.hasAssociatedForm) {
            // Create another confirmation dialog for form association
            const associationConfirmDialog = document.createElement('div');
            associationConfirmDialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
            associationConfirmDialog.innerHTML = `
              <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
                <h3 class="text-lg font-medium mb-4">Template Association</h3>
                <p class="mb-6">This template is associated with a form. Deleting it will remove the association. Continue?</p>
                <div class="flex justify-end space-x-3">
                  <button id="cancel-association-delete" class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                    Cancel
                  </button>
                  <button id="confirm-association-delete" class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                    Delete Anyway
                  </button>
                </div>
              </div>
            `;
            
            document.body.appendChild(associationConfirmDialog);
            
            const cancelAssociationButton = document.getElementById('cancel-association-delete');
            const confirmAssociationButton = document.getElementById('confirm-association-delete');
            
            cancelAssociationButton?.addEventListener('click', () => {
              document.body.removeChild(associationConfirmDialog);
              setIsDeleting(null);
              resolve();
            });
            
            confirmAssociationButton?.addEventListener('click', async () => {
              document.body.removeChild(associationConfirmDialog);
              
              // Find the form that uses this template
              const formId = Object.entries(formTemplateMapping).find(([_, tId]) => tId === templateId)?.[0];
              
              if (formId) {
                // Update the form to remove template association
                const { error: formUpdateError } = await supabase
                  .from('forms')
                  .update({ template_id: null })
                  .eq('id', formId);
                  
                if (formUpdateError) {
                  console.warn('Warning: Could not update form association', formUpdateError);
                } else {
                  // Update local state for form-template mapping
                  const newMapping = { ...formTemplateMapping };
                  newMapping[formId] = null;
                  setFormTemplateMapping(newMapping);
                  
                  // Update forms state
                  setForms(forms.map(form => 
                    form.id === formId ? { ...form, template_id: null } : form
                  ));
                }
              }
              
              // Continue with template deletion
              await deleteTemplateAndUpdateState(templateId);
              resolve();
            });
            
            return;
          }
          
          // If no form association, proceed with deletion
          await deleteTemplateAndUpdateState(templateId);
          resolve();
        } catch (error) {
          console.error('Error deleting template:', error);
          setNotification({
            message: 'Failed to delete template. Please try again.',
            type: 'error'
          });
          setIsDeleting(null);
          resolve();
        }
      });
    });
  };
  
  // Helper function to delete template and update state
  const deleteTemplateAndUpdateState = async (templateId: string) => {
    try {
      // Delete the template
      const { error: templateDeleteError } = await supabase
        .from('templates')
        .delete()
        .eq('id', templateId);
        
      if (templateDeleteError) throw templateDeleteError;
      
      // Update local state
      setTemplates(templates.filter(template => template.id !== templateId));
      
      setNotification({
        message: 'Template deleted successfully',
        type: 'success'
      });
    } catch (error) {
      console.error('Error in deleteTemplateAndUpdateState:', error);
      throw error;
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Dashboard Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-blue-800 dark:to-indigo-900 rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-8 sm:px-8 sm:py-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Dashboard</h1>
              <p className="mt-2 text-blue-100">Manage your forms and templates</p>
            </div>
            <button
              onClick={refreshData}
              className="mt-4 sm:mt-0 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all duration-200 flex items-center space-x-2 backdrop-blur-sm"
              disabled={loading}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {notification && (
        <div 
          className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-md transform transition-all duration-300 ease-in-out ${
            notification.type === 'success' 
              ? 'bg-green-50 dark:bg-green-900 border-l-4 border-green-500' 
              : 'bg-red-50 dark:bg-red-900 border-l-4 border-red-500'
          }`}
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {notification.type === 'success' ? (
                <svg className="h-5 w-5 text-green-500 dark:text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-red-500 dark:text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="ml-3">
              <p className={`text-sm font-medium ${
                notification.type === 'success' 
                  ? 'text-green-800 dark:text-green-200' 
                  : 'text-red-800 dark:text-red-200'
              }`}>
                {notification.message}
              </p>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button
                  onClick={() => setNotification(null)}
                  className={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    notification.type === 'success' 
                      ? 'text-green-500 hover:bg-green-100 dark:hover:bg-green-800 focus:ring-green-600 dark:focus:ring-green-500' 
                      : 'text-red-500 hover:bg-red-100 dark:hover:bg-red-800 focus:ring-red-600 dark:focus:ring-red-500'
                  }`}
                >
                  <span className="sr-only">Dismiss</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 dark:border-blue-400"></div>
        </div>
      ) : (
        <>
          {/* Forms Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden transition-colors duration-200">
            <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Your Forms</h2>
              <Link
                href="/dashboard/forms/new"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Form
              </Link>
            </div>
            <div className="p-6">
              {forms.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {forms.map((form) => (
                    <div 
                      key={form.id} 
                      className={`bg-white dark:bg-gray-800 border ${
                        selectedFormId === form.id 
                          ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-500 dark:ring-blue-400' 
                          : 'border-gray-200 dark:border-gray-700'
                      } rounded-xl overflow-hidden hover:shadow-lg transition-all duration-200 relative group cursor-pointer`}
                      onClick={() => setSelectedFormId(form.id)}
                    >
                      <div className="p-5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteForm(form.id);
                          }}
                          className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                          disabled={isDeleting !== null}
                          title="Delete form"
                        >
                          {isDeleting?.id === form.id && isDeleting?.type === 'form' ? (
                            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></span>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                        </button>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{form.title}</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                          {form.description || 'No description'}
                        </p>
                        <div className="flex flex-wrap gap-2 mb-4">
                          <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full ${
                            form.public 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                          }`}>
                            {form.public ? 'Public' : 'Private'}
                          </span>
                          {formTemplateMapping[form.id] && (
                            <span className="inline-block px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                              Has Template
                            </span>
                          )}
                          {formResponseCounts[form.id] > 0 && (
                            <span className="inline-block px-2.5 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                              {formResponseCounts[form.id]} {formResponseCounts[form.id] === 1 ? 'Response' : 'Responses'}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyShareLink(form.id);
                            }}
                            className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors flex items-center gap-1.5"
                            title="Copy share link"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                            {copiedFormId === form.id ? 'Copied!' : 'Share'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openFormInNewWindow(form.id);
                            }}
                            className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors flex items-center gap-1.5"
                            title="Open form in new window"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            Open
                          </button>
                          <Link
                            href={`/dashboard/forms/${form.id}`}
                            className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors flex items-center gap-1.5"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </Link>
                          <Link
                            href={`/dashboard/forms/${form.id}/responses`}
                            className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors flex items-center gap-1.5"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            Responses
                          </Link>
                        </div>
                      </div>
                      
                      {/* Generate Document Button - only show if form has template and responses */}
                      {formTemplateMapping[form.id] && (
                        <div className="px-5 pb-5">
                          {formResponseCounts[form.id] > 0 ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigateToResponses(form.id);
                              }}
                              className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg transition-all duration-200 flex items-center justify-center"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Generate Documents
                            </button>
                          ) : (
                            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-300">
                              <p className="mb-2">No responses yet. Share your form to collect responses.</p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyShareLink(form.id);
                                }}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors"
                              >
                                Copy Form Link
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Template Association Dropdown */}
                      <div className="px-5 pb-5 border-t border-gray-200 dark:border-gray-700 pt-4">
                        <div className="flex items-center justify-between">
                          <label htmlFor={`template-${form.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Associated Template:
                          </label>
                          {isUpdatingTemplate === form.id && (
                            <div className="ml-2 animate-spin h-4 w-4 border-t-2 border-blue-500 dark:border-blue-400 rounded-full"></div>
                          )}
                        </div>
                        <div className="mt-1.5 relative">
                          <select
                            id={`template-${form.id}`}
                            value={formTemplateMapping[form.id] || ''}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleTemplateAssociation(form.id, e.target.value === '' ? null : e.target.value);
                            }}
                            disabled={isUpdatingTemplate === form.id}
                            className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 sm:text-sm rounded-lg transition-colors"
                          >
                            <option value="">No Template</option>
                            {templates
                              .filter(template => !template.hasAssociatedForm || template.id === formTemplateMapping[form.id])
                              .map(template => (
                                <option key={template.id} value={template.id}>
                                  {template.name}
                                </option>
                              ))}
                          </select>
                        </div>
                        <div className="mt-2 flex justify-between items-center">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formTemplateMapping[form.id] 
                              ? "Template linked for document generation" 
                              : "Link a template for document generation"}
                          </p>
                          {formTemplateMapping[form.id] && (
                            <Link
                              href={`/dashboard/templates/${formTemplateMapping[form.id]}`}
                              className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              View Template
                            </Link>
                          )}
                        </div>
                      </div>

                      {/* Form Responses Section - Only show when form is selected */}
                      {selectedFormId === form.id && (
                        <div className="border-t border-gray-200 dark:border-gray-700">
                          <div className="px-5 py-4">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                              Recent Responses
                            </h4>
                            
                            {isLoadingResponses ? (
                              <div className="flex justify-center py-4">
                                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 dark:border-blue-400"></div>
                              </div>
                            ) : selectedFormResponses.length > 0 ? (
                              <div className="space-y-3">
                                {selectedFormResponses.slice(0, 3).map((response) => (
                                  <div 
                                    key={response.id}
                                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      router.push(`/dashboard/forms/${form.id}/responses`);
                                    }}
                                  >
                                    <div className="flex justify-between items-start mb-2">
                                      <div className="text-sm text-gray-600 dark:text-gray-300">
                                        {response.respondent_email || 'Anonymous'}
                                      </div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400">
                                        {new Date(response.submitted_at).toLocaleDateString()}
                                      </div>
                                    </div>
                                    <div className="text-sm text-gray-700 dark:text-gray-200 line-clamp-2">
                                      {Object.entries(response.data)
                                        .map(([key, value]) => `${key}: ${value}`)
                                        .join(', ')}
                                    </div>
                                  </div>
                                ))}
                                
                                {selectedFormResponses.length > 3 && (
                                  <Link
                                    href={`/dashboard/forms/${form.id}/responses`}
                                    className="block text-center text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 py-2"
                                  >
                                    View all {selectedFormResponses.length} responses
                                  </Link>
                                )}
                              </div>
                            ) : (
                              <div className="text-center py-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  No responses yet. Share your form to collect responses.
                                </p>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyShareLink(form.id);
                                  }}
                                  className="mt-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors"
                                >
                                  Copy Form Link
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 px-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No forms yet</h3>
                  <p className="mt-2 text-gray-500 dark:text-gray-400 max-w-md mx-auto">Get started by creating your first form to collect responses from users.</p>
                  <div className="mt-6">
                    <Link
                      href="/dashboard/forms/new"
                      className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-200 inline-flex items-center space-x-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Create Your First Form</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Templates Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden transition-colors duration-200">
            <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Your Templates</h2>
              <Link 
                href="/dashboard/templates/new" 
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 flex items-center space-x-2 text-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>New Template</span>
              </Link>
            </div>
            <div className="p-6">
              {templates.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {templates.map((template) => (
                    <div key={template.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-200 relative group">
                      <div className="p-5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTemplate(template.id);
                          }}
                          className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                          disabled={isDeleting !== null}
                          title="Delete template"
                        >
                          {isDeleting?.id === template.id && isDeleting?.type === 'template' ? (
                            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></span>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                        </button>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{template.name}</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                          {template.description || 'No description'}
                        </p>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {template.hasAssociatedForm ? (
                            <span className="inline-block px-2.5 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                              Linked to Form
                            </span>
                          ) : (
                            <span className="inline-block px-2.5 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                              Not Linked
                            </span>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/dashboard/templates/${template.id}`}
                            className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors flex items-center gap-1.5"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View
                          </Link>
                          <Link
                            href={`/dashboard/templates/${template.id}/edit`}
                            className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors flex items-center gap-1.5"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </Link>
                          {!template.hasAssociatedForm && (
                            <Link
                              href={`/dashboard/forms/new?template=${template.id}`}
                              className="px-3 py-1.5 text-xs font-medium bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-200 rounded-lg transition-colors flex items-center gap-1.5"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Create Form
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 px-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No templates yet</h3>
                  <p className="mt-2 text-gray-500 dark:text-gray-400 max-w-md mx-auto">Create templates to generate documents from form responses.</p>
                  <div className="mt-6">
                    <Link
                      href="/dashboard/templates/new"
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 inline-flex items-center space-x-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Create Your First Template</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
