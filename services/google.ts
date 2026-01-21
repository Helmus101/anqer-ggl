
/**
 * GOOGLE OAUTH CONFIGURATION
 * 
 * IMPORTANT: To fix 'Error 400: invalid_request' (storagerelay):
 * 1. The 'Authorized JavaScript Origins' in Google Console MUST match your current URL exactly.
 * 2. Ensure your browser is not blocking third-party cookies/storage for accounts.google.com.
 * 3. This implementation uses the 'Token Model' (GIS) which is the modern standard.
 */
const CLIENT_ID = '376550598016-aofcs5cm395qh4abelirmdskkjokbr4p.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/contacts.readonly https://www.googleapis.com/auth/gmail.readonly';

let tokenClient: any;
let gapiInited = false;
let gisInited = false;

export async function initGoogleAuth(): Promise<void> {
  if (gapiInited && gisInited) return;

  return new Promise((resolve) => {
    const checkInit = () => {
      if (gapiInited && gisInited) resolve();
    };

    // Load and init GAPI client for API usage
    (window as any).gapi.load('client', async () => {
      await (window as any).gapi.client.init({
        discoveryDocs: [
          'https://www.googleapis.com/discovery/v1/apis/people/v1/rest',
          'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest'
        ],
      });
      gapiInited = true;
      checkInit();
    });

    // Load and init GIS (Google Identity Services) for Auth
    const gisScript = document.createElement('script');
    gisScript.src = 'https://accounts.google.com/gsi/client';
    gisScript.onload = () => {
      tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // Defined in getAccessToken
      });
      gisInited = true;
      checkInit();
    };
    document.head.appendChild(gisScript);
  });
}

export async function getAccessToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      tokenClient.callback = async (resp: any) => {
        if (resp.error !== undefined) {
          console.error('Anqer Auth Error:', resp);
          reject(resp);
          return;
        }
        (window as any).gapi.client.setToken(resp);
        resolve(resp.access_token);
      };

      // Standardizing request: removed forced prompts to avoid triggering policy blocks
      tokenClient.requestAccessToken({ prompt: '' });
    } catch (err) {
      reject(err);
    }
  });
}

export async function fetchContacts() {
  const response = await (window as any).gapi.client.people.people.connections.list({
    resourceName: 'people/me',
    pageSize: 100,
    personFields: 'names,emailAddresses,phoneNumbers',
  });
  return response.result.connections || [];
}

export async function fetchEmails(maxResults = 30, pageToken?: string) {
  const listResp = await (window as any).gapi.client.gmail.users.messages.list({
    userId: 'me',
    maxResults,
    pageToken,
    q: 'is:sent OR is:inbox -category:promotions -category:social -from:noreply'
  });
  
  const messages = listResp.result.messages || [];
  const fullEmails = [];
  
  for (const msg of messages) {
    try {
      const detail = await (window as any).gapi.client.gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'full'
      });
      fullEmails.push(detail.result);
    } catch (e) {
      console.warn(`Anqer: Skipped Gmail message ${msg.id}`);
    }
  }
  
  return {
    emails: fullEmails,
    nextPageToken: listResp.result.nextPageToken
  };
}
