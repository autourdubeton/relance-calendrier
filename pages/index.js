import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

const STATUTS = ['en attente', 'livré', 'annulé']

export default function Home() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    sujet: '',
    email_client: '',
    date_debut: '',
    date_promise: '',
    date_rappel_1: '',
    date_rappel_2: '',
    notes: '',
    statut: 'en attente'
  })
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [recherche, setRecherche] = useState('')
  const [filtreStatut, setFiltreStatut] = useState('')
  const router = useRouter()

  useEffect(() => {
    fetchClients()
  }, [])

  async function fetchClients() {
    setLoading(true)
    const { data } = await supabase
      .from('suivi_clients')
      .select('*')
      .order('created_at', { ascending: false })
    setClients(data || [])
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)

    const payload = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, v === '' ? null : v])
    )

    if (editingId) {
      await supabase.from('suivi_clients').update(payload).eq('id', editingId)
      setEditingId(null)
    } else {
      await supabase.from('suivi_clients').insert([payload])
    }

    setForm({ sujet: '', email_client: '', date_debut: '', date_promise: '', date_rappel_1: '', date_rappel_2: '', notes: '', statut: 'en attente' })
    setSaving(false)
    fetchClients()
  }

  function startEdit(client) {
    setEditingId(client.id)
    setForm({
      sujet: client.sujet || '',
      email_client: client.email_client || '',
      date_debut: client.date_debut || '',
      date_promise: client.date_promise || '',
      date_rappel_1: client.date_rappel_1 || '',
      date_rappel_2: client.date_rappel_2 || '',
      notes: client.notes || '',
      statut: client.statut || 'en attente'
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function marquerLivre(id) {
    await supabase.from('suivi_clients').update({ statut: 'livré' }).eq('id', id)
    fetchClients()
  }

  // Calcul du badge calendrier : rappels cette semaine
  const aujourdhui = new Date()
  aujourdhui.setHours(0, 0, 0, 0)
  const finSemaine = new Date(aujourdhui)
  finSemaine.setDate(finSemaine.getDate() + 7)
  const rappelsSemaine = clients.filter(c => {
    if (c.statut !== 'en attente') return false
    for (const champ of ['date_rappel_1', 'date_rappel_2']) {
      if (c[champ]) {
        const d = new Date(c[champ])
        if (d >= aujourdhui && d <= finSemaine) return true
      }
    }
    return false
  }).length

  // Filtres
  const clientsFiltres = clients.filter(c => {
    const matchRecherche = !recherche ||
      c.sujet?.toLowerCase().includes(recherche.toLowerCase()) ||
      c.email_client?.toLowerCase().includes(recherche.toLowerCase())
    const matchStatut = !filtreStatut || c.statut === filtreStatut
    return matchRecherche && matchStatut
  })

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 1400, margin: '0 auto', padding: '0' }}>
      <div style={{ background: '#1a2b5e', padding: '0.5rem 3rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', overflow: 'visible', position: 'relative' }}>
        <img src="/logo-rond.png" alt="ATDB" style={{ height: 100, width: 100, objectFit: 'contain', marginTop: -15, marginBottom: -15 }} />
        <h1 style={{ position: 'absolute', left: 0, right: 0, textAlign: 'center', color: '#f5c400', fontSize: '2rem', fontWeight: 700, margin: 0, pointerEvents: 'none' }}>Suivi Livraison</h1>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', zIndex: 1 }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <button onClick={() => router.push('/calendrier')} style={{ background: 'none', border: 'none', color: '#f5c400', fontSize: '1.8rem', cursor: 'pointer' }} title="Calendrier">📅</button>
            {rappelsSemaine > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -4,
                background: '#e74c3c', color: '#fff',
                borderRadius: '50%', width: 18, height: 18,
                fontSize: '0.7rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                pointerEvents: 'none'
              }}>{rappelsSemaine}</span>
            )}
          </div>
          <button onClick={() => router.push('/contacts')} style={{ background: 'none', border: 'none', color: '#f5c400', fontSize: '1.8rem', cursor: 'pointer' }} title="Contacts">👥</button>
          <button onClick={() => router.push('/archives')} style={{ background: 'none', border: 'none', color: '#f5c400', fontSize: '1.8rem', cursor: 'pointer' }} title="Archives">🗄️</button>
        </div>
      </div>

      <div style={{ padding: '0 3rem 3rem' }}>

      <form onSubmit={handleSubmit} style={{ background: '#f0f3fa', border: '2px solid #1a2b5e', padding: '1.5rem', borderRadius: 8, marginBottom: '2rem' }}>
        <h2 style={{ marginTop: 0, fontSize: '1.1rem', color: '#1a2b5e' }}>{editingId ? 'Modifier la commande' : 'Nouvelle commande'}</h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label>Commande *</label><br />
            <input required value={form.sujet} onChange={e => setForm({ ...form, sujet: e.target.value })}
              style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box', marginTop: 4 }} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label>Email fournisseur <span style={{ color: '#999', fontWeight: 'normal', fontSize: '0.85rem' }}>(les rappels seront envoyés à cette adresse)</span></label><br />
            <input type="email" value={form.email_client} onChange={e => setForm({ ...form, email_client: e.target.value })}
              placeholder="fournisseur@exemple.com"
              style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box', marginTop: 4 }} />
          </div>
          <div>
            <label>Date de commande</label><br />
            <input type="date" value={form.date_debut} onChange={e => setForm({ ...form, date_debut: e.target.value })}
              style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box', marginTop: 4 }} />
          </div>
          <div>
            <label>Date de livraison promise</label><br />
            <input type="date" value={form.date_promise} onChange={e => setForm({ ...form, date_promise: e.target.value })}
              style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box', marginTop: 4 }} />
          </div>
          <div>
            <label>Mail de rappel 1</label><br />
            <input type="date" value={form.date_rappel_1} onChange={e => setForm({ ...form, date_rappel_1: e.target.value })}
              style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box', marginTop: 4 }} />
          </div>
          <div>
            <label>Mail de rappel 2</label><br />
            <input type="date" value={form.date_rappel_2} onChange={e => setForm({ ...form, date_rappel_2: e.target.value })}
              style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box', marginTop: 4 }} />
          </div>
          <div>
            <label>Statut</label><br />
            <select value={form.statut} onChange={e => setForm({ ...form, statut: e.target.value })}
              style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box', marginTop: 4 }}>
              {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label>Notes</label><br />
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
              rows={3} style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box', marginTop: 4 }} />
          </div>
        </div>

        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
          <button type="submit" disabled={saving}
            style={{ padding: '0.5rem 1.5rem', background: '#f5c400', color: '#1a2b5e', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 700 }}>
            {saving ? 'Enregistrement...' : editingId ? 'Mettre à jour' : 'Ajouter'}
          </button>
          {editingId && (
            <button type="button" onClick={() => { setEditingId(null); setForm({ sujet: '', email_client: '', date_debut: '', date_promise: '', date_rappel_1: '', date_rappel_2: '', notes: '', statut: 'en attente' }) }}
              style={{ padding: '0.5rem 1rem', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer' }}>
              Annuler
            </button>
          )}
        </div>
      </form>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center' }}>
        <input
          placeholder="🔍 Rechercher une commande ou un email..."
          value={recherche}
          onChange={e => setRecherche(e.target.value)}
          style={{ flex: 1, padding: '0.6rem 1rem', borderRadius: 6, border: '2px solid #1a2b5e', fontSize: '1rem' }}
        />
        <select
          value={filtreStatut}
          onChange={e => setFiltreStatut(e.target.value)}
          style={{ padding: '0.6rem 1rem', borderRadius: 6, border: '2px solid #1a2b5e', fontSize: '1rem', minWidth: 150 }}
        >
          <option value="">Tous les statuts</option>
          {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span style={{ color: '#999', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>{clientsFiltres.length} commande(s)</span>
        {(recherche || filtreStatut) && (
          <button onClick={() => { setRecherche(''); setFiltreStatut('') }}
            style={{ padding: '0.5rem 1rem', border: '1px solid #ccc', borderRadius: 6, cursor: 'pointer', background: '#fff', fontSize: '0.9rem' }}>
            Effacer
          </button>
        )}
      </div>

      {loading ? <p>Chargement...</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#1a2b5e', color: '#f5c400' }}>
              <th style={th}>Commande</th>
              <th style={th}>Email fournisseur</th>
              <th style={th}>Date commande</th>
              <th style={th}>Livraison promise</th>
              <th style={th}>Mail de rappel 1</th>
              <th style={th}>Mail de rappel 2</th>
              <th style={th}>Statut</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {clientsFiltres.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>Aucune commande</td></tr>
            )}
            {clientsFiltres.map((c, i) => (
              <tr key={c.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td style={td}>{c.sujet}</td>
                <td style={td}>{c.email_client || <span style={{ color: '#bbb' }}>—</span>}</td>
                <td style={td}>{formatDate(c.date_debut)}</td>
                <td style={td}>{formatDate(c.date_promise)}</td>
                <td style={td}>{formatDate(c.date_rappel_1)}</td>
                <td style={td}>{formatDate(c.date_rappel_2)}</td>
                <td style={td}>
                  <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.8rem', background: c.statut === 'livré' ? '#d4edda' : c.statut === 'annulé' ? '#f8d7da' : '#fff3cd' }}>
                    {c.statut}
                  </span>
                </td>
                <td style={td}>
                  <button onClick={() => startEdit(c)} style={btnEdit} title="Modifier">✏️</button>
                  <button onClick={() => marquerLivre(c.id)} style={btnLivre} title="Marquer comme livré">✓</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      </div>
    </div>
  )
}

const th = { padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600 }
const td = { padding: '0.75rem 1rem', borderBottom: '1px solid #eee', verticalAlign: 'middle' }
const btnEdit = { marginRight: 4, padding: '4px 10px', cursor: 'pointer', border: '1px solid #1a2b5e', borderRadius: 4, background: '#fff', fontSize: '1rem' }
const btnLivre = { padding: '4px 12px', cursor: 'pointer', border: '1px solid #28a745', borderRadius: 4, background: '#d4edda', color: '#155724', fontWeight: 700, fontSize: '1rem' }

function formatDate(d) {
  if (!d) return '—'
  const [y, m, j] = d.split('-')
  return `${j}/${m}/${y}`
}
