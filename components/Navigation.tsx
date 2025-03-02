'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  
  // Determine if we're on the dashboard or a sub-page of dashboard
  const isOnDashboard = pathname.startsWith('/dashboard');
  // Determine if we're on the home page
  const isOnHome = pathname === '/';

  useEffect(() => {
    const checkSession = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          setIsLoggedIn(false);
          setIsLoading(false);
          return;
        }
        
        setIsLoggedIn(!!data.session);
        
        if (data.session?.user?.email) {
          setUserEmail(data.session.user.email);
        }
      } catch (err) {
        console.error('Error checking session:', err);
        setIsLoggedIn(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkSession();
  }, []);

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setIsLoggedIn(false);
      setUserEmail(null);
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <nav className="bg-white shadow-sm mb-6 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-xl font-bold text-blue-600">
                Form Templater
              </Link>
            </div>
            <div className="ml-6 flex space-x-4 items-center">
              <Link
                href="/"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isOnHome
                    ? 'bg-blue-100 text-blue-800'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Home
              </Link>
              <Link
                href="/dashboard"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isOnDashboard
                    ? 'bg-blue-100 text-blue-800'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Dashboard
              </Link>
            </div>
          </div>
          
          {isLoggedIn && (
            <div className="flex items-center space-x-4">
              {userEmail && (
                <div className="flex items-center space-x-2 bg-gray-100 px-3 py-2 rounded-md">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">
                    {userEmail}
                  </span>
                </div>
              )}
              <button 
                onClick={handleLogout}
                className="px-3 py-2 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          )}
          
          {!isLoggedIn && !isLoading && (
            <div className="flex items-center space-x-4">
              <Link
                href="/login"
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="px-3 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
} 