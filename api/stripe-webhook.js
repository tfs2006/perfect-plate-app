// This function runs on a server to securely handle payment confirmations from Stripe.
import Stripe from 'stripe';

// You would set up your database client here (e.g., Firebase Admin SDK)
// import { adminDb } from './_db-admin-client'; 

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Verify the event came from Stripe using your webhook signing secret
    event = stripe.webhooks.constructEvent(
      req.body, 
      sig, 
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the 'checkout.session.completed' event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.client_reference_id; // The user's ID you passed

    if (!userId) {
      return res.status(400).json({ error: 'Missing user ID in Stripe session.' });
    }

    try {
      // IMPORTANT: Update your database to mark the user as subscribed.
      // This is a placeholder for your actual database logic.
      // Example for Firestore:
      // await adminDb.collection('users').doc(userId).update({ isSubscribed: true });
      
      console.log(`User ${userId} has successfully subscribed!`);
      
    } catch (dbError) {
      return res.status(500).json({ error: 'Failed to update user subscription status.' });
    }
  }

  // Send a success response back to Stripe
  res.status(200).json({ received: true });
}
