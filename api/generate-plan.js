// This function runs on a server (Netlify), not in the user's browser.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Destructure the endpoint and original body from the request
  const { endpoint, body } = req.body;

  // Get your secret Gemini API key from environment variables
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'API key not configured on the server.' });
  }

  const fullUrl = `https://generativelanguage.googleapis.com/v1beta/models/${endpoint}?key=${GEMINI_API_KEY}`;

  try {
    // Securely call the Google API from your server using the original body
    const googleResponse = await fetch(fullUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!googleResponse.ok) {
      const error = await googleResponse.json();
      throw new Error(error.error.message || 'An error occurred with the Google AI API.');
    }

    const data = await googleResponse.json();
    
    // Send the successful result back to your frontend app
    res.status(200).json(data);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
