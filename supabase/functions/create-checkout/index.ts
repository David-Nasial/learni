// ─── Edge Function : create-checkout ─────────────────────────────────────────
// Crée une session Stripe Checkout et retourne l'URL de paiement.

import { serve }        from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe           from 'https://esm.sh/stripe@14?target=deno'

const stripe     = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2025-03-31.basil' })
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin':  Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Price IDs Stripe — à remplacer par tes vrais IDs après création des produits
const PRICE_IDS: Record<string, string> = {
  starter:      Deno.env.get('STRIPE_PRICE_STARTER')      ?? 'price_starter_placeholder',
  pro:          Deno.env.get('STRIPE_PRICE_PRO')          ?? 'price_pro_placeholder',
  autodidacte:  Deno.env.get('STRIPE_PRICE_AUTODIDACTE')  ?? 'price_autodidacte_placeholder',
  teacher:      Deno.env.get('STRIPE_PRICE_TEACHER')      ?? 'price_teacher_placeholder',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── Vérifier l'utilisateur connecté ─────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Non authentifié')

    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) throw new Error('Token invalide')

    const { plan, successUrl, cancelUrl } = await req.json()
    const priceId = PRICE_IDS[plan]
    if (!priceId) throw new Error(`Plan inconnu : ${plan}`)

    // ── Créer ou récupérer le customer Stripe ───────────────────────────────
    let customerId: string | undefined

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (profile?.stripe_customer_id) {
      customerId = profile.stripe_customer_id
    } else {
      const customer = await stripe.customers.create({
        email:    user.email,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
    }

    // ── Créer la session Checkout ───────────────────────────────────────────
    const session = await stripe.checkout.sessions.create({
      customer:   customerId,
      mode:       'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl ?? `${req.headers.get('origin')}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  cancelUrl  ?? `${req.headers.get('origin')}/pricing`,
      metadata: {
        supabase_user_id: user.id,
        plan,
      },
      subscription_data: {
        metadata: { supabase_user_id: user.id, plan },
      },
    })

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur serveur'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})