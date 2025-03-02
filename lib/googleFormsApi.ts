import { google, forms_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

// Define types for form fields similar to our scraper
export interface ApiFormField {
  id: string;
  type: 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'date' | 'number' | 'email';
  label: string;
  description?: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
  helpText?: string;
}

export interface ApiForm {
  title: string;
  description: string;
  fields: ApiFormField[];
}

/**
 * Extracts the form ID from a Google Form URL
 * @param url The Google Form URL
 * @returns The form ID
 */
export function extractFormId(url: string): string {
  // Clean up the URL
  const trimmedUrl = url.trim();
  
  // Extract the form ID from the URL
  const formIdRegex = /\/forms\/d\/e\/([a-zA-Z0-9_-]+)\/|\/forms\/([a-zA-Z0-9_-]+)\//;
  const match = trimmedUrl.match(formIdRegex);
  
  if (!match) {
    throw new Error('Could not extract form ID from URL. Please ensure it is a valid Google Form URL.');
  }
  
  // Return the first matching group that has a value
  return match[1] || match[2];
}

/**
 * Creates an OAuth2 client using the provided credentials
 * @param clientId OAuth client ID
 * @param clientSecret OAuth client secret
 * @param redirectUri OAuth redirect URI
 * @param refreshToken OAuth refresh token
 * @returns An authenticated OAuth2 client
 */
function createOAuth2Client(
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  refreshToken: string
): OAuth2Client {
  const oAuth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );
  
  oAuth2Client.setCredentials({
    refresh_token: refreshToken
  });
  
  return oAuth2Client;
}

/**
 * Fetches a Google Form using the Google Forms API
 * @param formId The ID of the form to fetch
 * @param auth The authenticated OAuth2 client
 * @returns A promise that resolves to the form data
 */
async function fetchFormWithApi(
  formId: string,
  auth: OAuth2Client
): Promise<forms_v1.Schema$Form> {
  const forms = google.forms({
    version: 'v1',
    auth
  });
  
  const response = await forms.forms.get({
    formId
  });
  
  return response.data;
}

/**
 * Maps a Google Forms API question type to our internal type
 * @param questionType The Google Forms API question type
 * @returns Our internal question type
 */
function mapQuestionType(questionType: string): ApiFormField['type'] {
  switch (questionType) {
    case 'TEXT':
      return 'text';
    case 'PARAGRAPH_TEXT':
      return 'textarea';
    case 'MULTIPLE_CHOICE':
      return 'radio';
    case 'CHECKBOX':
      return 'checkbox';
    case 'DROP_DOWN':
      return 'select';
    case 'DATE':
      return 'date';
    case 'TIME':
      return 'text';
    case 'SCALE':
      return 'radio';
    case 'GRID':
      return 'radio'; // Simplified mapping
    case 'FILE_UPLOAD':
      return 'text'; // Simplified mapping
    default:
      return 'text';
  }
}

/**
 * Fetches a Google Form using the Google Forms API and converts it to our internal format
 * @param url The Google Form URL
 * @param clientId OAuth client ID
 * @param clientSecret OAuth client secret
 * @param redirectUri OAuth redirect URI
 * @param refreshToken OAuth refresh token
 * @returns A promise that resolves to the form data in our internal format
 */
export async function fetchGoogleFormWithApi(
  url: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  refreshToken: string
): Promise<ApiForm> {
  try {
    // Extract the form ID from the URL
    const formId = extractFormId(url);
    
    // Create an authenticated OAuth2 client
    const auth = createOAuth2Client(
      clientId,
      clientSecret,
      redirectUri,
      refreshToken
    );
    
    // Fetch the form data
    const formData = await fetchFormWithApi(formId, auth);
    
    // Extract the form title and description
    const title = formData.info?.title || 'Untitled Form';
    const description = formData.info?.description || '';
    
    // Initialize fields array
    const fields: ApiFormField[] = [];
    
    // Process each form item
    if (formData.items) {
      formData.items.forEach((item: forms_v1.Schema$Item, index: number) => {
        if (!item.questionItem) return;
        
        const question = item.questionItem;
        
        // Extract field label
        const label = question.question?.questionTitle || `Question ${index + 1}`;
        
        // Extract question description
        const description = question.question?.description || '';
        
        // Check if field is required
        const required = question.required || false;
        
        // Determine field type and extract options if applicable
        const type = mapQuestionType(question.question?.questionType || '');
        
        // Extract options for multiple choice questions
        let options: string[] = [];
        if (question.question?.choiceQuestion?.options) {
          options = question.question.choiceQuestion.options.map((option: forms_v1.Schema$Option) => option.value || '').filter(Boolean);
        }
        
        // Generate a unique ID for the field
        const id = item.itemId || `field-${Date.now()}-${index}`;
        
        // Add field to fields array
        fields.push({
          id,
          type,
          label,
          description,
          required,
          ...(options.length > 0 ? { options } : {})
        });
      });
    }
    
    return {
      title,
      description,
      fields
    };
  } catch (error: any) {
    console.error('Error fetching Google Form with API:', error);
    
    // Provide more specific error messages based on the error
    if (error.response) {
      if (error.response.status === 403) {
        throw new Error('Access to this Google Form is forbidden. Please check your authentication credentials.');
      } else if (error.response.status === 404) {
        throw new Error('Google Form not found. Please check the URL and try again.');
      } else {
        throw new Error(`Failed to access Google Form: HTTP error ${error.response.status}`);
      }
    }
    
    // If it's our own error, pass it through
    if (error.message) {
      throw new Error(error.message);
    }
    
    // Generic fallback error
    throw new Error('Failed to fetch Google Form. Please check the URL and your authentication credentials.');
  }
}

/**
 * Generates an authorization URL for OAuth 2.0 authentication
 * @param clientId OAuth client ID
 * @param clientSecret OAuth client secret
 * @param redirectUri OAuth redirect URI
 * @returns The authorization URL
 */
export function generateAuthUrl(
  clientId: string,
  clientSecret: string,
  redirectUri: string
): string {
  const oAuth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );
  
  return oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/forms.body.readonly',
      'https://www.googleapis.com/auth/forms.responses.readonly'
    ],
    prompt: 'consent'
  });
}

/**
 * Exchanges an authorization code for tokens
 * @param code The authorization code
 * @param clientId OAuth client ID
 * @param clientSecret OAuth client secret
 * @param redirectUri OAuth redirect URI
 * @returns A promise that resolves to the tokens
 */
export async function getTokensFromCode(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<{
  access_token: string;
  refresh_token: string;
  expiry_date: number;
}> {
  const oAuth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );
  
  const { tokens } = await oAuth2Client.getToken(code);
  
  if (!tokens.refresh_token || !tokens.access_token || !tokens.expiry_date) {
    throw new Error('Failed to retrieve valid tokens. Please try again.');
  }
  
  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date
  };
} 