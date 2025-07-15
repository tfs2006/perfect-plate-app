// This function runs on a server (Netlify), not in the user's browser.
// It acts as a secure proxy to the Google AI APIs.

export default async function handler(req, res) {
  // 1. Check if the request method is POST.
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 2. Destructure the endpoint and original body from the request.
  const { endpoint, body } = req.body;

  // 3. Get your secret Gemini API key from environment variables on Netlify.
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  // Check if the API key is available.
  if (!GEMINI_API_KEY) {
    console.error('Gemini API key not configured on the server.');
    return res.status(500).json({ error: 'API key not configured on the server.' });
  }

  // 4. Construct the correct URL for the Google AI service.
  const fullUrl = `https://generativelanguage.googleapis.com/v1beta/models/${endpoint}?key=${GEMINI_API_KEY}`;
  
  try {
    // 5. Securely call the Google API from your server using the original body.
    const googleResponse = await fetch(fullUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    // Handle errors from the Google API.
    if (!googleResponse.ok) {
      const error = await googleResponse.json();
      console.error('Google API Error:', error);
      throw new Error(error.error.message || 'An error occurred with the Google AI API.');
    }

    const data = await googleResponse.json();
    
    // 6. Send the successful result back to your frontend app.
    res.status(200).json(data);

  } catch (error) {
    console.error('Server-side error in generate-plan.js:', error);
    res.status(500).json({ error: error.message });
  }
}
