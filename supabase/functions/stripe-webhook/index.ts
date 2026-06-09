import { serve }        from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!
const supabaseUrl   = Deno.env.get('SUPABASE_URL')!
const supabaseKey   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase      = createClient(supabaseUrl, supabaseKey)

// Vérification de signature Stripe sans librairie
async function verifyStripeSignature(body: string, signature: string, secret: string): Promise<boolean> {
  try {
    const parts = signature.split(',')
    const tPart = parts.find(p => p.startsWith('t='))
    const v1Part = parts.find(p => p.startsWith('v1='))
    if (!tPart || !v1Part) return false

    const timestamp = tPart.substring(2)
    const expectedSig = v1Part.substring(3)
    const payload = `${timestamp}.${body}`

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const signatureBytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
    const computedSig = Array.from(new Uint8Array(signatureBytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    return computedSig === expectedSig
  } catch {
    return false
  }
}

serve(async (req) => {
  const body      = await req.text()
  const signature = req.headers.get('stripe-signature') ?? ''

  const valid = await verifyStripeSignature(body, signature, webhookSecret)
  if (!valid) {
    console.error('Signature invalide')
    return new Response('Signature invalide', { status: 400 })
  }

  let event: { type: string; data: { object: Record<string, unknown> } }
  try {
    event = JSON.parse(body)
  } catch {
    return new Response('JSON invalide', { status: 400 })
  }

  console.log('Webhook reçu:', event.type)

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object
        const userId  = (session.metadata as Record<string, string>)?.supabase_user_id
        const plan    = (session.metadata as Record<string, string>)?.plan
        console.log('userId:', userId, '| plan:', plan)

        if (userId && plan) {
          const { error } = await supabase.from('profiles').update({ plan }).eq('id', userId)
          if (error) console.error('Update error:', JSON.stringify(error))
          else console.log(`Plan "${plan}" activé pour user ${userId}`)
        }
        break
      }

      case 'customer.subscription.updated': {
        const sub    = event.data.object
        const userId = (sub.metadata as Record<string, string>)?.supabase_user_id
        const plan   = (sub.metadata as Record<string, string>)?.plan
        if (userId && plan && sub.status === 'active') {
          await supabase.from('profiles').update({ plan }).eq('id', userId)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub    = event.data.object
        const userId = (sub.metadata as Record<string, string>)?.supabase_user_id
        if (userId) {
          await supabase.from('profiles').update({ plan: 'free' }).eq('id', userId)
          console.log(`Plan réinitialisé à "free" pour user ${userId}`)
        }
        break
      }

      case 'invoice.payment_failed': {
        console.log('Paiement échoué:', event.data.object)
        break
      }

      default:
        console.log('Événement ignoré:', event.type)
    }
  } catch (err) {
    console.error('Erreur traitement:', err)
    return new Response('Erreur traitement', { status: 500 })
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
