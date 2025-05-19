import { useState, useRef, useEffect } from 'react';

type FieldType = 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'date' | 'number' | 'email' | 'multiselect';

interface AddFieldButtonProps {
  onAddField: (type: FieldType) => void;
  className?: string;
}

const fieldTypes = [
  {
    type: 'text',
    label: 'Text Field',
    description: 'Single line text input',
    icon: 'M4 6h16M4 12h16M4 18h7'
  },
  {
    type: 'textarea',
    label: 'Text Area',
    description: 'Multi-line text input',
    icon: 'M4 6h16M4 12h16m-7 6h7'
  },
  {
    type: 'number',
    label: 'Number',
    description: 'Numeric input field',
    icon: 'M7 20l4-16m2 16l4-16M6 9h14M4 15h14'
  },
  {
    type: 'email',
    label: 'Email',
    description: 'Email input field',
    icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
  },
  {
    type: 'date',
    label: 'Date',
    description: 'Date picker field',
    icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
  },
  {
    type: 'select',
    label: 'Dropdown',
    description: 'Select from options',
    icon: 'M19 9l-7 7-7-7'
  },
  {
    type: 'multiselect',
    label: 'Multi-Select Dropdown',
    description: 'Select multiple options from dropdown',
    icon: 'M19 9l-7 7-7-7'
  },
  {
    type: 'radio',
    label: 'Radio Buttons',
    description: 'Select one option',
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
  },
  {
    type: 'checkbox',
    label: 'Checkboxes',
    description: 'Select multiple options',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'
  }
];

export default function AddFieldButton({ onAddField, className = '' }: AddFieldButtonProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuItemsRef = useRef<(HTMLButtonElement | null)[]>([]);

  // Filter field types based on search query
  const filteredFieldTypes = fieldTypes.filter(fieldType =>
    fieldType.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    fieldType.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
        setSearchQuery('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!dropdownOpen) return;

      const currentIndex = menuItemsRef.current.findIndex(
        item => item === document.activeElement
      );

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          const nextIndex = (currentIndex + 1) % menuItemsRef.current.length;
          menuItemsRef.current[nextIndex]?.focus();
          break;
        case 'ArrowUp':
          event.preventDefault();
          const prevIndex = currentIndex <= 0 
            ? menuItemsRef.current.length - 1 
            : currentIndex - 1;
          menuItemsRef.current[prevIndex]?.focus();
          break;
        case 'Escape':
          setDropdownOpen(false);
          setSearchQuery('');
          break;
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [dropdownOpen]);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className={`inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 rounded-lg transition-colors shadow-sm ${className}`}
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
      </button>

      {dropdownOpen && (
        <div
          className="absolute right-0 mt-2 w-72 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="add-field-menu-button"
        >
          <div className="p-2">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search field types..."
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
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
                      onAddField(fieldType.type as FieldType);
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
        </div>
      )}
    </div>
  );
} 