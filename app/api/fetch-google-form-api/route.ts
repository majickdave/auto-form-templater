import { NextRequest, NextResponse } from 'next/server';
import { fetchGoogleFormWithApi } from '@/lib/googleFormsApi';

/**
 * API route handler for fetching Google Forms using the Google Forms API
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const { url, clientId, clientSecret, redirectUri, refreshToken } = body;

    // Validate required parameters
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    if (!clientId || !clientSecret || !redirectUri || !refreshToken) {
      return NextResponse.json(
        { error: 'OAuth credentials are required (clientId, clientSecret, redirectUri, refreshToken)' },
        { status: 400 }
      );
    }

    console.log('Server-side: Attempting to fetch Google Form from URL using API:', url);

    // Fetch the form data using the Google Forms API
    const formData = await fetchGoogleFormWithApi(
      url,
      clientId,
      clientSecret,
      redirectUri,
      refreshToken
    );

    console.log(`Successfully fetched form with ${formData.fields.length} fields`);

    // Return the form data
    return NextResponse.json(formData);
  } catch (error: any) {
    console.error('Error fetching Google Form with API:', error);

    // Return error response
    return NextResponse.json(
      { error: error.message || 'Failed to fetch Google Form. Please check the URL and your authentication credentials.' },
      { status: 500 }
    );
  }
} 