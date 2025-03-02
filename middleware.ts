import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  
  // Refresh session if expired
  await supabase.auth.getSession();
  
  return res;
}

export const config = {
  matcher: [
    // Apply this middleware to all routes except public ones
    '/((?!_next/static|_next/image|favicon.ico|api/auth).*)',
  ],
};
