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
};

export default function Dashboard() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [formTemplateMapping, setFormTemplateMapping] = useState<Record<string, string | null>>({});
  const [isUpdatingTemplate, setIsUpdatingTemplate] = useState<string | null>(null);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [formResponseCounts, setFormResponseCounts] = useState<Record<string, number>>({});
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
    alert('Share link copied to clipboard!');
  };

  // Function to open form in a new window
  const openFormInNewWindow = (formId: string) => {
    const formUrl = `${window.location.origin}/forms/${formId}`;
    window.open(formUrl, '_blank');
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
    router.push(`/dashboard/forms/${formId}/generate-document`);
  };

  return (
    <div className="space-y-8">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-md ${
          notification.type === 'success' ? 'bg-green-100 border-l-4 border-green-500 text-green-700' : 
          'bg-red-100 border-l-4 border-red-500 text-red-700'
        }`}>
          <div className="flex">
            <div className="flex-shrink-0">
              {notification.type === 'success' ? (
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="ml-3">
              <p className="text-sm">{notification.message}</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="space-x-3 flex items-center">
          <button
            onClick={refreshData}
            className="p-2 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100 clickable"
            title="Refresh data"
            disabled={loading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {/* Forms Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Your Forms</h2>
              <Link 
                href="/dashboard/forms/new" 
                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm btn"
              >
                + New Form
              </Link>
            </div>
            {forms.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {forms.map((form) => (
                  <div key={form.id} className="border rounded-lg p-4 hover:shadow-md transition">
                    <h3 className="text-lg font-medium">{form.title}</h3>
                    <p className="text-gray-500 text-sm mb-3">
                      {form.description || 'No description'}
                    </p>
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex space-x-2">
                        <span className={`inline-block px-2 py-1 text-xs rounded ${
                          form.public ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {form.public ? 'Public' : 'Private'}
                        </span>
                        {formTemplateMapping[form.id] && (
                          <span className="inline-block px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">
                            Has Template
                          </span>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => copyShareLink(form.id)}
                          className="p-1 text-blue-600 hover:text-blue-800 link-hover"
                          title="Copy share link"
                        >
                          Share
                        </button>
                        <button
                          onClick={() => openFormInNewWindow(form.id)}
                          className="p-1 text-purple-600 hover:text-purple-800 link-hover"
                          title="Open form in new window"
                        >
                          Open
                        </button>
                        <Link
                          href={`/dashboard/forms/${form.id}`}
                          className="p-1 text-gray-600 hover:text-gray-800 link-hover"
                        >
                          View
                        </Link>
                        <Link
                          href={`/dashboard/forms/${form.id}/edit`}
                          className="p-1 text-gray-600 hover:text-gray-800 link-hover"
                        >
                          Edit
                        </Link>
                        <Link
                          href={`/dashboard/forms/${form.id}/responses`}
                          className="p-1 text-gray-600 hover:text-gray-800 link-hover"
                        >
                          Responses
                        </Link>
                      </div>
                    </div>
                    
                    {/* Generate Document Button - only show if form has template and responses */}
                    {formTemplateMapping[form.id] && (
                      <div className="mb-3">
                        {formResponseCounts[form.id] > 0 ? (
                          <button
                            onClick={() => navigateToResponses(form.id)}
                            className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center btn"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            View & Generate Documents ({formResponseCounts[form.id]} {formResponseCounts[form.id] === 1 ? 'response' : 'responses'})
                          </button>
                        ) : (
                          <div className="text-center p-2 bg-gray-100 rounded text-sm text-gray-600">
                            <p className="mb-2">No responses yet. Share your form to collect responses for document generation.</p>
                            <button
                              onClick={() => copyShareLink(form.id)}
                              className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 btn"
                            >
                              Copy Form Link
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Template Association Dropdown */}
                    <div className="mt-3 border-t pt-3">
                      <div className="flex items-center justify-between">
                        <label htmlFor={`template-${form.id}`} className="block text-sm font-medium text-gray-700">
                          Associated Template:
                        </label>
                        {isUpdatingTemplate === form.id && (
                          <div className="ml-2 animate-spin h-4 w-4 border-t-2 border-blue-500 rounded-full"></div>
                        )}
                      </div>
                      <div className="mt-1 relative">
                        <select
                          id={`template-${form.id}`}
                          value={formTemplateMapping[form.id] || ''}
                          onChange={(e) => handleTemplateAssociation(form.id, e.target.value === '' ? null : e.target.value)}
                          disabled={isUpdatingTemplate === form.id}
                          className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md clickable"
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
                        <p className="text-xs text-gray-500">
                          {formTemplateMapping[form.id] 
                            ? "This form is using a template for document generation" 
                            : "Associate a template to enable document generation"}
                        </p>
                        {formTemplateMapping[form.id] && (
                          <Link
                            href={`/dashboard/templates/${formTemplateMapping[form.id]}`}
                            className="text-xs text-blue-600 hover:text-blue-800 link-hover"
                          >
                            View Template
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-gray-500 mb-4">You haven't created any forms yet</p>
                <Link
                  href="/dashboard/forms/new"
                  className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm btn"
                >
                  + Create Your First Form
                </Link>
              </div>
            )}
          </div>

          {/* Templates Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Your Templates</h2>
              <Link 
                href="/dashboard/templates/new" 
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm btn"
              >
                + New Template
              </Link>
            </div>
            {templates.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {templates.map((template) => (
                  <div key={template.id} className="border rounded-lg p-4 hover:shadow-md transition">
                    <h3 className="text-lg font-medium">{template.name}</h3>
                    <p className="text-gray-500 text-sm mb-3">
                      {template.description || 'No description'}
                    </p>
                    
                    {/* Template content preview */}
                    {template.template_content && (
                      <div className="mb-3 p-2 bg-gray-50 rounded border text-xs font-mono overflow-hidden text-gray-600" style={{ maxHeight: '80px' }}>
                        <div className="line-clamp-3 whitespace-pre-wrap">
                          {template.template_content}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center">
                      <div>
                        {template.hasAssociatedForm ? (
                          <span className="inline-block px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">
                            Has Form
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-1 text-xs rounded bg-gray-100 text-gray-800">
                            Available
                          </span>
                        )}
                      </div>
                      <div>
                        <Link
                          href={`/dashboard/templates/${template.id}`}
                          className="p-1 text-gray-600 hover:text-gray-800 link-hover"
                        >
                          View
                        </Link>
                        <Link
                          href={`/dashboard/templates/${template.id}/edit`}
                          className="p-1 ml-2 text-blue-600 hover:text-blue-800 link-hover"
                        >
                          Edit
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-gray-500 mb-4">You haven't created any templates yet</p>
                <Link
                  href="/dashboard/templates/new"
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm btn"
                >
                  + Create Your First Template
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
