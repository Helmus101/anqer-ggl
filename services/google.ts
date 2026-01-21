/**
 * GOOGLE OAUTH CONFIGURATION
 * 
 * IMPORTANT: To resolve 'Error 400: invalid_request' (storagerelay):
 * 1. Your Google Cloud Console OAuth Client MUST have 'http://localhost:3000' in Authorized JavaScript Origins.
 * 2. It MUST have 'http://localhost:3000/api/auth/google/callback' in Authorized Redirect URIs.
 */
const CLIENT_ID = '376550598016-aofcs5cm395qh4abelirmdskkjokbr4p.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/contacts.readonly https://www.googleapis.com/auth/gmail.readonly';
const REDIRECT_URI = 'http://localhost:3000/api/auth/google/callback';

let tokenClient: any;
let gapiInited = false;
let gisInited = false;

export async function initGoogleAuth(): Promise<void> {
  if (gapiInited && gisInited) return;

  return new Promise((resolve) => {
    const checkInit = () => {
      if (gapiInited && gisInited) resolve();
    };

    // Initialize GAPI for API requests
    (window as any).gapi.load('client', async () => {
      try {
        await (window as any).gapi.client.init({
          discoveryDocs: [
            'https://www.googleapis.com/discovery/v1/apis/people/v1/rest',
            'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest'
          ],
        });
        gapiInited = true;
        checkInit();
      } catch (err) {
        console.error('Anqer GAPI Init Failed:', err);
        // We still resolve so the app can continue in non-google mode
        gapiInited = true;
        checkInit();
      }
    });

    // Initialize GIS for Authorization
    const initializeGIS = () => {
      if (!(window as any).google?.accounts?.oauth2) {
        setTimeout(initializeGIS, 100);
        return;
      }
      tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        ux_mode: 'popup',
        redirect_uri: REDIRECT_URI,
        callback: '', // Defined at runtime
      });
      gisInited = true;
      checkInit();
    };
    initializeGIS();
  });
}

export async function getAccessToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      if (!tokenClient) {
        reject(new Error("Anqer: Token client not initialized. Ensure GIS script is loaded."));
        return;
      }

      tokenClient.callback = async (resp: any) => {
        if (resp.error !== undefined) {
          console.error('Anqer OAuth Runtime Error:', resp);
          reject(resp);
          return;
        }
        (window as any).gapi.client.setToken(resp);
        resolve(resp.access_token);
      };

      // Request token with a standard popup
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
      console.warn(`Anqer: Skipped message retrieval for ${msg.id}`);
    }
  }
  
  return {
    emails: fullEmails,
    nextPageToken: listResp.result.nextPageToken
  };
}