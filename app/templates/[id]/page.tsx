'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

// Template data (in a real app, this would come from a database)
const templates = [
  {
    id: 'customer-feedback',
    title: 'Customer Feedback',
    description: 'Collect detailed feedback from your customers about your products or services.',
    category: 'Feedback',
    image: '/images/templates/customer-feedback.svg',
    popularity: 'high',
    fields: [
      { id: 'name', label: 'Full Name', type: 'text', required: true },
      { id: 'email', label: 'Email Address', type: 'email', required: true },
      { id: 'rating', label: 'Overall Rating', type: 'rating', required: true },
      { id: 'product', label: 'Product Purchased', type: 'select', required: true },
      { id: 'purchase_date', label: 'Purchase Date', type: 'date', required: false },
      { id: 'satisfaction', label: 'How satisfied are you with our product?', type: 'radio', 
        options: ['Very Satisfied', 'Satisfied', 'Neutral', 'Dissatisfied', 'Very Dissatisfied'], required: true },
      { id: 'ease_of_use', label: 'How easy was our product to use?', type: 'radio', 
        options: ['Very Easy', 'Easy', 'Moderate', 'Difficult', 'Very Difficult'], required: true },
      { id: 'features', label: 'Which features do you value most?', type: 'checkbox', 
        options: ['Quality', 'Price', 'Functionality', 'Customer Support', 'Ease of Use'], required: false },
      { id: 'improvements', label: 'What improvements would you suggest?', type: 'textarea', required: false },
      { id: 'recommend', label: 'Would you recommend our product to others?', type: 'radio', 
        options: ['Yes', 'No', 'Maybe'], required: true },
      { id: 'comments', label: 'Additional Comments', type: 'textarea', required: false },
      { id: 'contact_permission', label: 'May we contact you about your feedback?', type: 'checkbox', required: false }
    ]
  },
  {
    id: 'event-registration',
    title: 'Event Registration',
    description: 'Allow attendees to register for your upcoming events with all necessary details.',
    category: 'Registration',
    image: '/images/templates/event-registration.svg',
    popularity: 'high',
    fields: [
      { id: 'name', label: 'Full Name', type: 'text', required: true },
      { id: 'email', label: 'Email Address', type: 'email', required: true },
      { id: 'phone', label: 'Phone Number', type: 'tel', required: false },
      { id: 'event', label: 'Select Event', type: 'select', required: true },
      { id: 'date', label: 'Event Date', type: 'date', required: true },
      { id: 'tickets', label: 'Number of Tickets', type: 'number', required: true },
      { id: 'dietary', label: 'Dietary Requirements', type: 'textarea', required: false },
      { id: 'terms', label: 'I agree to the terms and conditions', type: 'checkbox', required: true }
    ]
  },
  {
    id: 'job-application',
    title: 'Job Application',
    description: 'Streamline your hiring process with this comprehensive job application form.',
    category: 'Application',
    image: '/images/templates/job-application.svg',
    popularity: 'medium',
    fields: [
      { id: 'name', label: 'Full Name', type: 'text', required: true },
      { id: 'email', label: 'Email Address', type: 'email', required: true },
      { id: 'phone', label: 'Phone Number', type: 'tel', required: true },
      { id: 'position', label: 'Position Applied For', type: 'select', required: true },
      { id: 'resume', label: 'Resume/CV', type: 'file', required: true },
      { id: 'cover_letter', label: 'Cover Letter', type: 'file', required: false },
      { id: 'start_date', label: 'Available Start Date', type: 'date', required: true },
      { id: 'education', label: 'Highest Education Level', type: 'select', required: true },
      { id: 'experience', label: 'Years of Experience', type: 'number', required: true },
      { id: 'skills', label: 'Key Skills', type: 'textarea', required: true },
      { id: 'references', label: 'References', type: 'textarea', required: false },
      { id: 'hear_about', label: 'How did you hear about this position?', type: 'select', required: false },
      { id: 'salary', label: 'Salary Expectations', type: 'text', required: false },
      { id: 'questions', label: 'Questions for the employer', type: 'textarea', required: false },
      { id: 'terms', label: 'I certify that all information provided is accurate', type: 'checkbox', required: true }
    ]
  },
  {
    id: 'contact-form',
    title: 'Contact Form',
    description: 'A simple yet effective contact form for your website visitors to reach out.',
    category: 'Contact',
    image: '/images/templates/contact-form.svg',
    popularity: 'high',
    fields: [
      { id: 'name', label: 'Full Name', type: 'text', required: true },
      { id: 'email', label: 'Email Address', type: 'email', required: true },
      { id: 'subject', label: 'Subject', type: 'text', required: true },
      { id: 'message', label: 'Message', type: 'textarea', required: true },
      { id: 'newsletter', label: 'Subscribe to newsletter', type: 'checkbox', required: false }
    ]
  },
  {
    id: 'product-survey',
    title: 'Product Survey',
    description: 'Gather insights about your product from users to guide future development.',
    category: 'Surveys',
    image: '/images/templates/product-survey.svg',
    popularity: 'medium',
    fields: [
      { id: 'name', label: 'Full Name', type: 'text', required: false },
      { id: 'email', label: 'Email Address', type: 'email', required: false },
      { id: 'age_group', label: 'Age Group', type: 'select', required: true },
      { id: 'usage_frequency', label: 'How often do you use our product?', type: 'radio', required: true },
      { id: 'satisfaction', label: 'Overall satisfaction with the product', type: 'rating', required: true },
      { id: 'features_used', label: 'Which features do you use most?', type: 'checkbox', required: true },
      { id: 'missing_features', label: 'What features would you like to see added?', type: 'textarea', required: false },
      { id: 'improvement', label: 'What would you improve about our product?', type: 'textarea', required: true },
      { id: 'recommend', label: 'How likely are you to recommend our product?', type: 'rating', required: true },
      { id: 'feedback', label: 'Additional feedback', type: 'textarea', required: false }
    ]
  }
];

export default function TemplatePage() {
  const params = useParams();
  const router = useRouter();
  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Find the template in the local array
    const foundTemplate = templates.find(t => t.id === params.id);
    
    if (foundTemplate) {
      setTemplate(foundTemplate);
    }
    
    setLoading(false);
  }, [params.id]);

  const handleUseTemplate = async () => {
    if (!template) return;
    
    // Convert template fields to the format expected by the form builder
    const formattedFields = template.fields.map((field: any) => {
      // Create a unique ID for each field
      const fieldId = `field-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Map template field types to form builder field types
      return {
        id: fieldId,
        type: field.type,
        label: field.label,
        required: field.required,
        placeholder: field.type === 'text' || field.type === 'textarea' || field.type === 'email' 
          ? `Enter ${field.label.toLowerCase()}` 
          : undefined,
        options: field.options || [],
      };
    });
    
    // Create form data object
    const formData = {
      title: template.title,
      description: template.description,
      fields: formattedFields,
      templateId: template.id
    };
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('You need to be logged in to use templates');
        router.push('/login');
        return;
      }

      toast.loading('Creating form from template...');
      
      // Create the form in the database
      const { data, error } = await supabase
        .from('forms')
        .insert({
          id: uuidv4(),
          user_id: user.id,
          title: formData.title,
          description: formData.description,
          fields: formData.fields,
          field_labels: formData.fields.map((field: any) => field.label),
          public: true,
          template_id: formData.templateId || null,
        })
        .select();

      if (error) throw error;

      toast.dismiss();
      toast.success(`Form "${template.title}" created successfully!`);
      
      // Redirect to the form edit page
      router.push(`/dashboard/forms/${data[0].id}`);
      
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.message || 'Failed to create form');
      console.error('Error creating form from template:', err);
      
      // Fallback to the old method if there's an error
      localStorage.setItem('templateFormData', JSON.stringify(formData));
      router.push('/dashboard/forms/new?fromTemplate=true');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="container mx-auto py-12 px-4">
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <h1 className="text-xl font-bold text-red-700">Template Not Found</h1>
          <p className="text-red-700 mt-2">The template you're looking for doesn't exist or has been removed.</p>
          <Link href="/templates" className="text-blue-600 hover:underline mt-4 inline-block">
            Browse All Templates
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto pt-6 pb-8 px-4 max-w-6xl relative">
      <div className="mb-6">
        <Link href="/templates" className="text-blue-600 hover:underline inline-flex items-center">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Templates
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
        <div className="p-6 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{template.title}</h1>
              <p className="text-gray-600 mt-2">{template.description}</p>
            </div>
            <div className="flex items-center">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                {template.category}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {template.fields.length} fields
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Template Preview */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Preview</h2>
            <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-center h-80">
              <div className="relative w-full h-full">
                <Image
                  src={template.image}
                  alt={`${template.title} preview`}
                  fill
                  style={{ objectFit: 'contain' }}
                />
              </div>
            </div>
          </div>

          {/* Template Fields */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Form Fields</h2>
            <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
              <ul className="divide-y divide-gray-200">
                {template.fields.map((field: any, index: number) => (
                  <li key={field.id} className="p-4 hover:bg-gray-100">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mt-1">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                          {index + 1}
                        </span>
                      </div>
                      <div className="ml-3 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">{field.label}</p>
                          <div className="flex items-center">
                            {field.required && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                Required
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="mt-1 flex items-center text-sm text-gray-500">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            {field.type}
                          </span>
                          {field.options && (
                            <span className="ml-2 text-xs text-gray-500">
                              {field.options.length} options
                            </span>
                          )}
                        </div>
                        {field.options && (
                          <div className="mt-1">
                            <details className="text-xs">
                              <summary className="text-blue-600 cursor-pointer">Show options</summary>
                              <ul className="mt-1 pl-4 list-disc">
                                {field.options.map((option: string) => (
                                  <li key={option} className="text-gray-600">{option}</li>
                                ))}
                              </ul>
                            </details>
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Form Preview */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Form Preview</h2>
          <p className="text-gray-600 mt-1">This is how your form will look to respondents</p>
        </div>
        <div className="p-6">
          <div className="max-w-3xl mx-auto bg-gray-50 rounded-lg border border-gray-200 p-6">
            <h1 className="text-2xl font-bold text-center mb-6">{template.title}</h1>
            
            {template.fields.map((field: any) => (
              <div key={field.id} className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                
                {field.type === 'text' && (
                  <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder={`Enter ${field.label.toLowerCase()}`} />
                )}
                
                {field.type === 'email' && (
                  <input type="email" className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="example@email.com" />
                )}
                
                {field.type === 'tel' && (
                  <input type="tel" className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="(123) 456-7890" />
                )}
                
                {field.type === 'number' && (
                  <input type="number" className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="0" />
                )}
                
                {field.type === 'date' && (
                  <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                )}
                
                {field.type === 'select' && (
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                    <option value="">Select an option</option>
                    {field.options ? (
                      field.options.map((option: string) => (
                        <option key={option} value={option}>{option}</option>
                      ))
                    ) : (
                      <option value="option">Sample option</option>
                    )}
                  </select>
                )}
                
                {field.type === 'textarea' && (
                  <textarea className="w-full px-3 py-2 border border-gray-300 rounded-md" rows={3} placeholder={`Enter ${field.label.toLowerCase()}`}></textarea>
                )}
                
                {field.type === 'checkbox' && (
                  <div className="flex items-center">
                    <input type="checkbox" className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
                    <span className="ml-2 text-sm text-gray-600">{field.label}</span>
                  </div>
                )}
                
                {field.type === 'radio' && field.options && (
                  <div className="space-y-2">
                    {field.options.map((option: string) => (
                      <div key={option} className="flex items-center">
                        <input type="radio" name={field.id} className="h-4 w-4 text-blue-600 border-gray-300" />
                        <span className="ml-2 text-sm text-gray-600">{option}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                {field.type === 'rating' && (
                  <div className="flex items-center space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button key={star} type="button" className="text-gray-300 hover:text-yellow-400">
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </button>
                    ))}
                  </div>
                )}
                
                {field.type === 'file' && (
                  <input type="file" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                )}
              </div>
            ))}
            
            <div className="mt-8">
              <button type="button" className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700">
                Submit
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={handleUseTemplate}
          className="px-8 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 flex items-center justify-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Use This Template
        </button>
        <Link
          href="/forms/new"
          className="px-8 py-3 bg-gray-200 text-gray-800 font-medium rounded-md hover:bg-gray-300 flex items-center justify-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Create Custom Form
        </Link>
      </div>
      
      {/* Floating Action Button for Template Gallery */}
      <div className="fixed bottom-8 right-8 z-40">
        <Link
          href="/templates"
          className="flex items-center justify-center w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          aria-label="Browse Templates"
          title="Browse Templates"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        </Link>
      </div>
    </div>
  );
} 