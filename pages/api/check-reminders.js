import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const secret = req.headers['x-cron-secret']
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const today = new Date().toISOString().split('T')[0]

  const { data: clients, error } = await supabase
    .from('clients')
    .select('*')
    .or(`date_rappel_1.eq.${today},date_rappel_2.eq.${today}`)
    .eq('statut', 'en cours')

  if (error) {
    console.error('Supabase error:', error)
    return res.status(500).json({ error: error.message })
  }

  if (!clients || clients.length === 0) {
    return res.status(200).json({ message: 'Aucun rappel aujourd\'hui', sent: 0 })
  }

  let sent = 0

  for (const client of clients) {
    const rappelNum = client.date_rappel_1 === today ? 1 : 2

    await resend.emails.send({
      from: 'noreply@autourdubeton.com',
      to: 'anthony@autourdubeton.com',
      subject: `Rappel ${rappelNum} — ${client.sujet}`,
      html: `
        <h2>Rappel client — Autour du Béton</h2>
        <p><strong>Sujet :</strong> ${client.sujet}</p>
        <p><strong>Date de début :</strong> ${client.date_debut || '—'}</p>
        <p><strong>Date promise :</strong> ${client.date_promise || '—'}</p>
        ${client.notes ? `<p><strong>Notes :</strong> ${client.notes}</p>` : ''}
        <hr>
        <p style="color: #666; font-size: 12px;">Rappel automatique n°${rappelNum} envoyé le ${today}</p>
      `
    })

    sent++
  }

  return res.status(200).json({ message: `${sent} rappel(s) envoyé(s)`, sent })
}
