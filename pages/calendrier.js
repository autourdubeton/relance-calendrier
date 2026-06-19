import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/router'

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

const TYPE_COLORS = {
  date_debut:    { bg: '#dbeafe', border: '#3b82f6', label: 'Commande' },
  date_promise:  { bg: '#fef9c3', border: '#f5c400', label: 'Livraison promise' },
  date_rappel_1: { bg: '#fee2e2', border: '#ef4444', label: 'Rappel 1' },
  date_rappel_2: { bg: '#fce7f3', border: '#ec4899', label: 'Rappel 2' },
}

function startOfWeek(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1 - day)
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function toYMD(date) {
  return date.toISOString().split('T')[0]
}

export default function Calendrier() {
  const [dossiers, setDossiers] = useState([])
  const [semaine, setSemaine] = useState(startOfWeek(new Date()))
  const router = useRouter()

  useEffect(() => {
    supabase.from('suivi_clients').select('*').not('statut', 'in', '("livré","annulé")').then(({ data }) => setDossiers(data || []))
  }, [])

  const joursArray = Array.from({ length: 7 }, (_, i) => addDays(semaine, i))

  function evenementsDuJour(date) {
    const ymd = toYMD(date)
    const evts = []
    for (const d of dossiers) {
      for (const type of ['date_debut', 'date_promise', 'date_rappel_1', 'date_rappel_2']) {
        if (d[type] === ymd) {
          evts.push({ type, dossier: d })
        }
      }
    }
    return evts
  }

  const aujourdhui = toYMD(new Date())
  const debutSemaine = toYMD(semaine)
  const finSemaine = toYMD(addDays(semaine, 6))

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 1400, margin: '0 auto', padding: '0' }}>
      {/* Bandeau */}
      <div style={{ background: '#1a2b5e', padding: '0.5rem 3rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', overflow: 'visible', position: 'relative' }}>
        <img src="/logo-rond.png" alt="ATDB" style={{ height: 100, width: 100, objectFit: 'contain', marginTop: -15, marginBottom: -15 }} />
        <h1 style={{ position: 'absolute', left: 0, right: 0, textAlign: 'center', color: '#f5c400', fontSize: '2rem', fontWeight: 700, margin: 0, pointerEvents: 'none' }}>Calendrier</h1>
        <button onClick={() => router.push('/')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#f5c400', fontSize: '1.8rem', cursor: 'pointer', zIndex: 1 }} title="Retour">←</button>
      </div>

      <div style={{ padding: '0 3rem 3rem' }}>

        {/* Navigation semaine */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <button onClick={() => setSemaine(addDays(semaine, -7))} style={btnNav}>← Semaine précédente</button>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '1.6rem', color: '#1a2b5e' }}>
              Semaine du {addDays(semaine, 0).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              {' '}au {addDays(semaine, 6).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
            <br />
            <button onClick={() => setSemaine(startOfWeek(new Date()))} style={{ marginTop: 4, fontSize: '0.8rem', color: '#f5c400', background: '#1a2b5e', border: 'none', borderRadius: 4, padding: '2px 10px', cursor: 'pointer' }}>
              Aujourd'hui
            </button>
          </div>
          <button onClick={() => setSemaine(addDays(semaine, 7))} style={btnNav}>Semaine suivante →</button>
        </div>

        {/* Légende */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {Object.entries(TYPE_COLORS).map(([type, { bg, border, label }]) => (
            <span key={type} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
              <span style={{ width: 14, height: 14, borderRadius: 3, background: bg, border: `2px solid ${border}`, display: 'inline-block' }} />
              {label}
            </span>
          ))}
        </div>

        {/* Grille 7 jours */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
          {joursArray.map((jour, i) => {
            const ymd = toYMD(jour)
            const evts = evenementsDuJour(jour)
            const estAujourdhui = ymd === aujourdhui
            const estWeekend = i >= 5

            return (
              <div key={ymd} style={{
                border: estAujourdhui ? '2px solid #f5c400' : '1px solid #ddd',
                borderRadius: 8,
                background: estAujourdhui ? '#fffbea' : estWeekend ? '#f9f9f9' : '#fff',
                minHeight: 'calc(100vh - 320px)',
                padding: '0.75rem',
              }}>
                {/* En-tête du jour */}
                <div style={{
                  textAlign: 'center',
                  marginBottom: '0.5rem',
                  paddingBottom: '0.4rem',
                  borderBottom: `2px solid ${estAujourdhui ? '#f5c400' : '#eee'}`,
                }}>
                  <div style={{ fontSize: '0.75rem', color: estWeekend ? '#999' : '#1a2b5e', fontWeight: 600, textTransform: 'uppercase' }}>
                    {JOURS[i]}
                  </div>
                  <div style={{
                    fontSize: '1.4rem',
                    fontWeight: 700,
                    color: estAujourdhui ? '#f5c400' : estWeekend ? '#bbb' : '#1a2b5e',
                    background: estAujourdhui ? '#1a2b5e' : 'transparent',
                    borderRadius: estAujourdhui ? '50%' : 0,
                    width: estAujourdhui ? 36 : 'auto',
                    height: estAujourdhui ? 36 : 'auto',
                    lineHeight: estAujourdhui ? '36px' : 'normal',
                    margin: estAujourdhui ? '0 auto' : 0,
                  }}>
                    {jour.getDate()}
                  </div>
                </div>

                {/* Événements */}
                {evts.length === 0 ? (
                  <div style={{ color: '#ccc', fontSize: '0.75rem', textAlign: 'center', marginTop: 8 }}>—</div>
                ) : evts.map((evt, j) => {
                  const { bg, border, label } = TYPE_COLORS[evt.type]
                  return (
                    <div key={j} style={{
                      background: bg,
                      borderLeft: `3px solid ${border}`,
                      borderRadius: 4,
                      padding: '3px 6px',
                      marginBottom: 4,
                      fontSize: '0.75rem',
                    }}>
                      <div style={{ fontWeight: 600, color: '#333' }}>{evt.dossier.sujet}</div>
                      <div style={{ color: '#666' }}>{label}</div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const btnNav = { padding: '0.5rem 1rem', background: '#1a2b5e', color: '#f5c400', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }
