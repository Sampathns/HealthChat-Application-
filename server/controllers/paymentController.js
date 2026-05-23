const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create a PaymentIntent for card payments (Visa/Mastercard)
exports.createPaymentIntent = async (req, res) => {
  const { amount, currency = 'usd', appointmentId } = req.body;
  if (!amount) return res.status(400).json({ success: false, message: 'Amount is required' });

  const amountInCents = Math.round(Number(amount) * 100);
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency,
      payment_method_types: ['card'],
      metadata: { appointmentId: appointmentId || '' },
    });

    res.json({ success: true, clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error('Stripe createPaymentIntent error:', err);
    res.status(500).json({ success: false, message: 'Payment initialization failed', error: err.message });
  }
};
