# Supabase SSR Integration

This directory contains examples of how to use Supabase with Server-Side Rendering (SSR) in Next.js using the `@supabase/ssr` package.

## Setup

The project has been configured to use Supabase with SSR. Here's what has been set up:

1. **Dependencies**: The `@supabase/ssr` package has been installed.
2. **Supabase Client**: The Supabase client has been configured in `lib/supabase.ts`.
3. **Middleware**: The middleware has been updated to use the SSR package in `middleware.ts`.

## Examples

This directory contains examples of how to use Supabase with different types of components:

1. **Server Components**: See `page.tsx` for an example of how to use Supabase with server components.
2. **Client Components**: See `client-component.tsx` for an example of how to use Supabase with client components.
3. **Route Handlers**: See `app/api/auth/route.ts` for an example of how to use Supabase with route handlers.

## Usage

### Server Components

```tsx
import { createServerClient } from '@supabase/ssr';

export default async function ServerComponent() {
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
  
  const { data } = await supabase.from('your_table').select('*');
  
  return <div>{/* Render your data */}</div>;
}
```

### Client Components

```tsx
'use client';

import { createClient } from '@/lib/supabase';

export default function ClientComponent() {
  const handleAction = async () => {
    const supabase = createClient();
    const { data } = await supabase.from('your_table').select('*');
    // Do something with the data
  };
  
  return <button onClick={handleAction}>Fetch Data</button>;
}
```

### Route Handlers

```tsx
import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const cookieStore = request.cookies;
  const response = NextResponse.next();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name, options) {
          response.cookies.set({
            name,
            value: '',
            ...options,
            maxAge: 0,
          });
        },
      },
    }
  );
  
  const { data } = await supabase.from('your_table').select('*');
  
  return NextResponse.json({ data });
}
```

## Authentication

The middleware has been configured to handle authentication. It will refresh the session if it has expired.

To protect routes, you can check for the presence of a session in your server components or route handlers.

## Resources

- [Supabase SSR Documentation](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Next.js App Router Documentation](https://nextjs.org/docs/app) 