const router = require('express').Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const prisma = new PrismaClient();

// POST /api/stripe/create-checkout — start subscription
router.post('/create-checkout', authenticate, async (req, res, next) => {
  try {
    const { priceId } = req.body;
    const tenant = await prisma.tenant.findUnique({ where: { id: req.tenantId } });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.CLIENT_URL}/settings/billing?success=true`,
      cancel_url: `${process.env.CLIENT_URL}/settings/billing?cancelled=true`,
      metadata: { tenantId: req.tenantId },
      customer_email: req.user?.email,
    });

    res.json({ url: session.url });
  } catch (err) { next(err); }
});

// POST /api/stripe/webhook
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const { tenantId } = event.data.object.metadata || {};

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    await prisma.subscription.upsert({
      where: { tenantId: tenantId || '' },
      create: { tenantId, stripeCustomerId: session.customer, stripeSubId: session.subscription, status: 'active' },
      update: { stripeCustomerId: session.customer, stripeSubId: session.subscription, status: 'active' },
    });
    await prisma.tenant.update({ where: { id: tenantId }, data: { plan: 'PROFESSIONAL' } });
  }

  if (event.type === 'customer.subscription.deleted') {
    await prisma.tenant.update({ where: { id: tenantId }, data: { plan: 'STARTER' } });
  }

  res.json({ received: true });
});

module.exports = router;
