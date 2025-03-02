import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  
  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }
  
  try {
    // Validate the URL is a Google Form
    if (!url.includes('docs.google.com/forms')) {
      return NextResponse.json({ error: 'Only Google Forms URLs are allowed' }, { status: 400 });
    }
    
    // Fetch the form content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });
    
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch the form' }, { status: response.status });
    }
    
    const html = await response.text();
    
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json({ error: 'Failed to fetch the form' }, { status: 500 });
  }
} 