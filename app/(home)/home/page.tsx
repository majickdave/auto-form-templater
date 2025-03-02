'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function HomePage() {
  const router = useRouter();
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="text-center max-w-2xl">
        <h1 className="text-3xl font-bold mb-4">Welcome to Form Templater</h1>
        <p className="mb-6 text-gray-600">
          Create, manage, and share forms with ease. Collect responses and analyze data all in one place.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/signup"
            className="px-6 py-3 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
} 