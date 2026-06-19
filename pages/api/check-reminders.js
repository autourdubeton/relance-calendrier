import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

export default async function handler(req, res) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Vercel Cron envoie l'Authorization header, appels manuels utilisent x-cron-secret
  const authHeader = req.headers['authorization']
  const cronSecret = req.headers['x-cron-secret']
  const isVercelCron = authHeader === `Bearer ${process.env.CRON_SECRET}`
  const isManual = cronSecret === process.env.CRON_SECRET

  if (!isVercelCron && !isManual) {
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
    return res.status(200).json({ message: "Aucun rappel aujourd'hui", sent: 0 })
  }

  let sent = 0
  const errors = []

  for (const client of clients) {
    const rappelNum = client.date_rappel_1 === today ? 1 : 2
    const destinataire = client.email_client || process.env.ADMIN_EMAIL

    try {
      await transporter.sendMail({
        from: `Autour du Béton <${process.env.GMAIL_USER}>`,
        to: destinataire,
        replyTo: process.env.ADMIN_EMAIL,
        subject: `Rappel — ${client.sujet}`,
        html: `
          <!DOCTYPE html>
          <html>
          <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 2rem; color: #333;">
            <div style="border-bottom: 3px solid #1a1a1a; padding-bottom: 1rem; margin-bottom: 2rem;">
              <h1 style="margin: 0; font-size: 1.4rem;">Autour du Béton</h1>
            </div>
            <p>Bonjour,</p>
            <p>Nous revenons vers vous concernant le dossier suivant :</p>
            <div style="background: #f5f5f5; padding: 1.5rem; border-radius: 8px; margin: 1.5rem 0;">
              <p style="margin: 0 0 0.5rem;"><strong>Sujet :</strong> ${client.sujet}</p>
              ${client.date_debut ? `<p style="margin: 0 0 0.5rem;"><strong>Date de début :</strong> ${formatDate(client.date_debut)}</p>` : ''}
              ${client.date_promise ? `<p style="margin: 0 0 0.5rem;"><strong>Date promise :</strong> ${formatDate(client.date_promise)}</p>` : ''}
              ${client.notes ? `<p style="margin: 0.5rem 0 0;"><strong>Notes :</strong> ${client.notes}</p>` : ''}
            </div>
            <p>N'hésitez pas à nous contacter si vous avez des questions.</p>
            <p>Cordialement,<br><strong>L'équipe Autour du Béton</strong></p>
            <hr style="margin: 2rem 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 0.75rem;">Rappel automatique n°${rappelNum} — ${today}</p>
          </body>
          </html>
        `
      })
      sent++
    } catch (err) {
      console.error(`Erreur envoi pour ${client.sujet}:`, err)
      errors.push({ sujet: client.sujet, error: err.message })
    }
  }

  return res.status(200).json({
    message: `${sent} rappel(s) envoyé(s)`,
    sent,
    errors: errors.length > 0 ? errors : undefined
  })
}

function formatDate(d) {
  if (!d) return ''
  const [y, m, j] = d.split('-')
  return `${j}/${m}/${y}`
}
