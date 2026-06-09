// ─── Service Stripe — Paiements via Edge Function ────────────────────────────
import { supabase } from './supabase'

export type StripePlan = 'starter' | 'pro' | 'autodidacte' | 'teacher'

/**
 * Redirige l'utilisateur vers la page de paiement Stripe.
 * Appelé quand l'utilisateur clique sur "S'abonner".
 */
export async function startCheckout(plan: StripePlan): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    throw new Error('Vous devez être connecté pour vous abonner.')
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`,
    {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        plan,
        successUrl: `${window.location.origin}?payment=success&plan=${plan}`,
        cancelUrl:  window.location.href,
      }),
    }
  )

  const data = await response.json() as { url?: string; error?: string }

  if (data.error) throw new Error(data.error)
  if (!data.url)  throw new Error('URL de paiement manquante.')

  // Redirige vers Stripe Checkout
  window.location.href = data.url
}

/**
 * Ouvre le portail client Stripe pour gérer l'abonnement (annuler, changer).
 */
export async function openBillingPortal(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Non connecté.')

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/billing-portal`,
    {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ returnUrl: window.location.origin }),
    }
  )

  const data = await response.json() as { url?: string; error?: string }
  if (data.url) window.location.href = data.url
}
