// This script is no longer needed as templates are now loaded locally in the app
// The code is kept for reference in case database loading is needed in the future

/*
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project-ref.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase URL or key is missing. Please check your environment variables.');
  process.exit(1);
}

console.log(`Using Supabase URL: ${supabaseUrl}`);
const supabase = createClient(supabaseUrl, supabaseKey);

// Template data from app/templates/[id]/page.tsx
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

async function preloadTemplates() {
  console.log('Starting template preload...');
  
  try {
    // Get admin user (or create a system user for templates)
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('No authenticated user found. Please run this script while logged in as an admin.');
      process.exit(1);
    }
    
    console.log(`Using user ID: ${user.id} for template creation`);
    
    // Process each template
    for (const template of templates) {
      console.log(`Processing template: ${template.title}`);
      
      // Check if template already exists in the database
      const { data: existingTemplates, error: checkError } = await supabase
        .from('forms')
        .select('id')
        .eq('template_id', template.id)
        .limit(1);
      
      if (checkError) {
        console.error(`Error checking for existing template ${template.id}:`, checkError);
        continue;
      }
      
      if (existingTemplates && existingTemplates.length > 0) {
        console.log(`Template ${template.id} already exists in the database, skipping...`);
        continue;
      }
      
      // Format fields for the form builder
      const formattedFields = template.fields.map(field => {
        const fieldId = `field-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        
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
      
      // Insert template into the database
      const { data, error } = await supabase
        .from('forms')
        .insert({
          id: uuidv4(),
          user_id: user.id,
          title: template.title,
          description: template.description,
          fields: formattedFields,
          public: true, // Make templates public by default
          template_id: template.id,
          is_template: true, // Mark as a template
          category: template.category,
        })
        .select();
      
      if (error) {
        console.error(`Error creating template ${template.id}:`, error);
      } else {
        console.log(`Successfully created template: ${template.title} with ID: ${data[0].id}`);
      }
    }
    
    console.log('Template preload completed!');
  } catch (err) {
    console.error('Error during template preload:', err);
  }
}

// Run the preload function
preloadTemplates();
*/

console.log('This script is no longer needed as templates are now loaded locally in the app.');
console.log('If you need to preload templates to the database in the future, uncomment the code in this file.'); 