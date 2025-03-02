'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface FormResponse {
  id: string;
  form_id: string;
  respondent_email: string;
  data: Record<string, any>;
  submitted_at: string;
}

export default function FormResponsesPage() {
  const params = useParams();
  const formId = '0'; // Hardcoded to 0 for this specific route
  const router = useRouter();
  const [form, setForm] = useState<any>(null);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push('/login');
          return;
        }

        // Fetch form data
        const { data: formData, error: formError } = await supabase
          .from('forms')
          .select('*')
          .eq('id', formId)
          .single();

        if (formError) throw formError;
        
        // Check if form belongs to current user
        if (formData.user_id !== user.id) {
          throw new Error('You do not have permission to view these responses');
        }

        setForm(formData);

        // Fetch form responses
        const { data: responseData, error: responseError } = await supabase
          .from('form_responses')
          .select('*')
          .eq('form_id', formId)
          .order('submitted_at', { ascending: false });

        if (responseError) throw responseError;
        
        setResponses(responseData || []);
        
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [formId, router]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    }).format(date);
  };

  const downloadResponses = () => {
    if (!form || !responses.length) return;
    
    // Create field mapping for CSV headers
    const fieldMap = new Map();
    form.fields.forEach((field: any) => {
      fieldMap.set(field.id, field.label);
    });
    
    // Create CSV content
    let csvContent = 'data:text/csv;charset=utf-8,';
    
    // Headers
    const headers = ['ID', 'Email', 'Submission Date', ...form.fields.map((f: any) => f.label)];
    csvContent += headers.join(',') + '\r\n';
    
    // Rows
    responses.forEach(response => {
      const row = [
        response.id,
        response.respondent_email || 'Anonymous',
        new Date(response.submitted_at).toISOString(),
      ];
      
      // Add field data
      form.fields.forEach((field: any) => {
        let value = response.data[field.id] || '';
        
        // Handle arrays (like checkbox responses)
        if (Array.isArray(value)) {
          value = value.join('; ');
        }
        
        // Escape commas and quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        
        row.push(value);
      });
      
      csvContent += row.join(',') + '\r\n';
    });
    
    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${form.title} - Responses.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <p className="text-red-700">{error}</p>
          <Link href="/dashboard" className="text-blue-600 hover:underline mt-2 inline-block">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">{form.title} - Responses</h1>
          <p className="text-gray-600">
            {responses.length} {responses.length === 1 ? 'response' : 'responses'} received
          </p>
        </div>
        <div className="flex space-x-3">
          <Link
            href={`/dashboard/forms/${formId}`}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
          >
            Back to Form
          </Link>
          <button
            onClick={downloadResponses}
            disabled={responses.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            Download CSV
          </button>
        </div>
      </div>

      {responses.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-500 py-8">No responses have been submitted yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Respondent
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted At
                  </th>
                  {form.fields.map((field: any) => (
                    <th 
                      key={field.id}
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {field.label}
                    </th>
                  ))}
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {responses.map((response) => (
                  <tr key={response.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {response.respondent_email || 'Anonymous'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {formatDate(response.submitted_at)}
                    </td>
                    {form.fields.map((field: any) => {
                      let value = response.data[field.id];
                      
                      // Format values for display
                      if (Array.isArray(value)) {
                        value = value.join(', ');
                      } else if (value === undefined || value === null) {
                        value = '-';
                      }
                      
                      return (
                        <td key={field.id} className="px-6 py-4">
                          <div className="max-w-xs truncate">
                            {value}
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/dashboard/forms/${formId}/responses/${response.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
