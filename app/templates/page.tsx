'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

// Template categories for filtering
const categories = [
  'All',
  'Surveys',
  'Feedback',
  'Registration',
  'Contact',
  'Application',
  'Event',
  'Education'
];

// Hardcoded templates data
const templatesData = [
  {
    id: 'customer-feedback',
    title: 'Customer Feedback',
    description: 'Collect detailed feedback from your customers about your products or services.',
    category: 'Feedback',
    image: '/images/templates/customer-feedback.svg',
    popularity: 'high',
    fieldsCount: 12
  },
  {
    id: 'event-registration',
    title: 'Event Registration',
    description: 'Allow attendees to register for your upcoming events with all necessary details.',
    category: 'Registration',
    image: '/images/templates/event-registration.svg',
    popularity: 'high',
    fieldsCount: 8
  },
  {
    id: 'job-application',
    title: 'Job Application',
    description: 'Streamline your hiring process with this comprehensive job application form.',
    category: 'Application',
    image: '/images/templates/job-application.svg',
    popularity: 'medium',
    fieldsCount: 15
  },
  {
    id: 'contact-form',
    title: 'Contact Form',
    description: 'A simple yet effective contact form for your website visitors to reach out.',
    category: 'Contact',
    image: '/images/templates/contact-form.svg',
    popularity: 'high',
    fieldsCount: 5
  },
  {
    id: 'product-survey',
    title: 'Product Survey',
    description: 'Gather insights about your product from users to guide future development.',
    category: 'Surveys',
    image: '/images/templates/product-survey.svg',
    popularity: 'medium',
    fieldsCount: 10
  }
];

// Placeholder SVG for template previews - used as fallback if image doesn't exist
const placeholderSVG = (title: string) => {
  // Generate a color based on the title string
  const hash = title.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
  const hue = hash % 360;
  const color = `hsl(${hue}, 70%, 85%)`;
  const textColor = `hsl(${hue}, 70%, 30%)`;
  
  return `
    <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="300" fill="${color}" />
      <rect x="40" y="40" width="320" height="40" rx="4" fill="white" />
      <rect x="40" y="100" width="320" height="40" rx="4" fill="white" />
      <rect x="40" y="160" width="320" height="40" rx="4" fill="white" />
      <rect x="40" y="220" width="150" height="40" rx="4" fill="${textColor}" />
      <text x="200" y="20" font-family="Arial" font-size="16" fill="${textColor}" text-anchor="middle">${title}</text>
    </svg>
  `;
};

export default function TemplatesPage() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('popularity'); // 'popularity', 'name', 'fields'
  
  // Filter templates based on category and search query
  const filteredTemplates = templatesData.filter(template => {
    const matchesCategory = selectedCategory === 'All' || template.category === selectedCategory;
    const matchesSearch = template.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          template.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });
  
  // Sort templates
  const sortedTemplates = [...filteredTemplates].sort((a, b) => {
    if (sortBy === 'name') {
      return a.title.localeCompare(b.title);
    } else if (sortBy === 'fields') {
      return b.fieldsCount - a.fieldsCount;
    } else { // popularity
      const popularityOrder = { high: 3, medium: 2, low: 1 };
      return popularityOrder[b.popularity as keyof typeof popularityOrder] - 
             popularityOrder[a.popularity as keyof typeof popularityOrder];
    }
  });
  
  return (
    <div className="min-h-screen bg-gray-50 pt-6 pb-12 relative">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Form Templates</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Browse our collection of professionally designed templates to jumpstart your form creation process.
            Customize any template to fit your specific needs.
          </p>
        </div>
        
        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="w-full md:w-1/3">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">Search Templates</label>
              <input
                type="text"
                id="search"
                placeholder="Search by name or description..."
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="w-full md:w-1/3">
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Filter by Category</label>
              <select
                id="category"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            
            <div className="w-full md:w-1/3">
              <label htmlFor="sort" className="block text-sm font-medium text-gray-700 mb-1">Sort by</label>
              <select
                id="sort"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="popularity">Popularity</option>
                <option value="name">Name</option>
                <option value="fields">Number of Fields</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {sortedTemplates.map(template => (
            <div key={template.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
              <div className="relative h-48 bg-gray-100">
                <Image
                  src={template.image}
                  alt={`${template.title} template preview`}
                  fill
                  style={{ objectFit: 'contain' }}
                  onError={(e) => {
                    // If the image fails to load, use the placeholder SVG
                    const target = e.target as HTMLImageElement;
                    const svg = placeholderSVG(template.title);
                    target.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
                  }}
                />
              </div>
              
              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-semibold">{template.title}</h3>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {template.category}
                  </span>
                </div>
                
                <p className="text-gray-600 mb-4">{template.description}</p>
                
                <div className="flex items-center text-sm text-gray-500 mb-4">
                  <svg className="h-5 w-5 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  {template.fieldsCount} fields
                  
                  <svg className="h-5 w-5 ml-4 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {template.popularity === 'high' ? 'Popular' : template.popularity === 'medium' ? 'Regular' : 'New'}
                </div>
                
                <div className="flex space-x-3">
                  <Link 
                    href={`/templates/${template.id}`}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 text-center"
                  >
                    Use Template
                  </Link>
                  <Link 
                    href={`/templates/${template.id}`}
                    className="flex-none bg-gray-100 text-gray-600 py-2 px-3 rounded-md hover:bg-gray-200"
                    aria-label="Preview template"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* No results message */}
        {sortedTemplates.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">No templates found</h3>
            <p className="mt-1 text-gray-500">Try adjusting your search or filter criteria.</p>
            <div className="mt-6">
              <button
                onClick={() => {
                  setSelectedCategory('All');
                  setSearchQuery('');
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Clear filters
              </button>
            </div>
          </div>
        )}
        
        {/* Create custom form CTA */}
        <div className="mt-16 bg-blue-50 border border-blue-100 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Don't see what you need?</h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Create a custom form from scratch with our easy-to-use form builder. 
            Add your own fields, customize the design, and start collecting responses today.
          </p>
          <Link
            href="/forms/new"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            Create Custom Form
          </Link>
        </div>
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </Link>
      </div>
    </div>
  );
} 