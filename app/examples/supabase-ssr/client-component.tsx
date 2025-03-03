'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';

export default function ClientComponentExample() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const supabase = createClient();
    
    // Check for an existing session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
      
      // Set up auth state listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          setSession(session);
        }
      );
      
      // Clean up the subscription when the component unmounts
      return () => {
        subscription.unsubscribe();
      };
    };
    
    checkSession();
  }, []);
  
  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
  };
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  return (
    <div className="bg-white shadow-md rounded-lg p-6 mt-8">
      <h2 className="text-xl font-semibold mb-4">Client Component Authentication</h2>
      
      {session ? (
        <div>
          <p className="text-green-600 mb-2">✅ Authenticated in Client Component</p>
          <p>User ID: {session.user.id}</p>
          <p>Email: {session.user.email}</p>
          
          <button
            onClick={handleSignOut}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Sign Out (Client-side)
          </button>
        </div>
      ) : (
        <p className="text-red-600">❌ Not authenticated in Client Component</p>
      )}
    </div>
  );
} 