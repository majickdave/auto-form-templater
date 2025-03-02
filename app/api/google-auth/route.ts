import { NextRequest, NextResponse } from 'next/server';
import { generateAuthUrl, getTokensFromCode } from '@/lib/googleFormsApi';

/**
 * API route handler for generating an OAuth authorization URL
 */
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get('clientId');
    const clientSecret = searchParams.get('clientSecret');
    const redirectUri = searchParams.get('redirectUri');

    // Validate required parameters
    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.json(
        { error: 'OAuth credentials are required (clientId, clientSecret, redirectUri)' },
        { status: 400 }
      );
    }

    // Generate the authorization URL
    const authUrl = generateAuthUrl(
      clientId,
      clientSecret,
      redirectUri
    );

    // Return the authorization URL
    return NextResponse.json({ authUrl });
  } catch (error: any) {
    console.error('Error generating authorization URL:', error);

    // Return error response
    return NextResponse.json(
      { error: error.message || 'Failed to generate authorization URL.' },
      { status: 500 }
    );
  }
}

/**
 * API route handler for exchanging an authorization code for tokens
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const { code, clientId, clientSecret, redirectUri } = body;

    // Validate required parameters
    if (!code || !clientId || !clientSecret || !redirectUri) {
      return NextResponse.json(
        { error: 'Code and OAuth credentials are required (code, clientId, clientSecret, redirectUri)' },
        { status: 400 }
      );
    }

    // Exchange the code for tokens
    const tokens = await getTokensFromCode(
      code,
      clientId,
      clientSecret,
      redirectUri
    );

    // Return the tokens
    return NextResponse.json(tokens);
  } catch (error: any) {
    console.error('Error exchanging code for tokens:', error);

    // Return error response
    return NextResponse.json(
      { error: error.message || 'Failed to exchange code for tokens.' },
      { status: 500 }
    );
  }
} 