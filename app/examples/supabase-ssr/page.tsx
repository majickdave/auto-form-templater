import { createServerClient } from '@supabase/ssr';
import Link from 'next/link';
import ClientComponentExample from './client-component';

export default async function SupabaseSSRExample() {
  // Create a Supabase client for server components
  const cookieStore = await import('next/headers').then((mod) => mod.cookies());
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );
  
  // Get the user's session
  const { data: { session } } = await supabase.auth.getSession();
  
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Supabase SSR Example</h1>
      
      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Server Component Authentication</h2>
        {session ? (
          <div>
            <p className="text-green-600 mb-2">✅ Authenticated in Server Component</p>
            <p>User ID: {session.user.id}</p>
            <p>Email: {session.user.email}</p>
          </div>
        ) : (
          <p className="text-red-600">❌ Not authenticated in Server Component</p>
        )}
      </div>
      
      <ClientComponentExample />
      
      <div className="flex gap-4 mt-8">
        <Link 
          href="/login" 
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Login
        </Link>
        {session && (
          <Link 
            href="/auth/signout" 
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Sign Out
          </Link>
        )}
      </div>
    </div>
  );
} 