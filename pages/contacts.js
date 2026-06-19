import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/router'

const STATUTS = ['actif', 'en attente', 'inactif']

export default function Contacts() {
  const [contacts, setContacts] = useState([])
  const [dossiers, setDossiers] = useState([])
  const [loading, setLoading] = useState(true)
  const [recherche, setRecherche] = useState('')
  const [ficheId, setFicheId] = useState(null)
  const [form, setForm] = useState({ nom: '', email: '', telephone: '', notes: '', statut: 'actif' })
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const router = useRouter()

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: c }, { data: d }] = await Promise.all([
      supabase.from('contacts').select('*').order('nom'),
      supabase.from('suivi_clients').select('*').order('created_at', { ascending: false })
    ])
    setContacts(c || [])
    setDossiers(d || [])
    setLoading(false)

    // Import automatique des emails des dossiers non encore enregistrés
    const emailsExistants = new Set((c || []).map(x => x.email?.toLowerCase()).filter(Boolean))
    const emailsDossiers = (d || []).filter(x => x.email_client && !emailsExistants.has(x.email_client.toLowerCase()))
    const emailsUniques = [...new Map(emailsDossiers.map(x => [x.email_client.toLowerCase(), x])).values()]
    for (const dossier of emailsUniques) {
      await supabase.from('contacts').insert([{ nom: dossier.sujet, email: dossier.email_client, statut: 'actif' }])
    }
    if (emailsUniques.length > 0) {
      const { data: fresh } = await supabase.from('contacts').select('*').order('nom')
      setContacts(fresh || [])
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    if (editingId) {
      await supabase.from('contacts').update(form).eq('id', editingId)
      setEditingId(null)
    } else {
      await supabase.from('contacts').insert([form])
    }
    setForm({ nom: '', email: '', telephone: '', notes: '', statut: 'actif' })
    setSaving(false)
    fetchAll()
  }

  async function deleteContact(id) {
    if (!confirm('Supprimer ce contact ?')) return
    await supabase.from('contacts').delete().eq('id', id)
    fetchAll()
  }

  function startEdit(c) {
    setEditingId(c.id)
    setForm({ nom: c.nom || '', email: c.email || '', telephone: c.telephone || '', notes: c.notes || '', statut: c.statut || 'actif' })
    setFicheId(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function statutColor(s) {
    if (s === 'actif') return { background: '#d4edda', color: '#155724' }
    if (s === 'en attente') return { background: '#fff3cd', color: '#856404' }
    return { background: '#f8d7da', color: '#721c24' }
  }

  function derniereDernierActivite(email) {
    if (!email) return null
    const ds = dossiers.filter(d => d.email_client?.toLowerCase() === email.toLowerCase())
    if (ds.length === 0) return null
    const dates = ds.map(d => d.created_at).filter(Boolean).sort().reverse()
    return dates[0] ? new Date(dates[0]).toLocaleDateString('fr-FR') : null
  }

  function statutRelation(contact) {
    const email = contact.email
    if (!email) return { label: 'Aucun dossier', color: '#999' }
    const ds = dossiers.filter(d => d.email_client?.toLowerCase() === email.toLowerCase())
    if (ds.length === 0) return { label: 'Aucun dossier', color: '#999' }
    const enCours = ds.filter(d => d.statut === 'en cours')
    if (enCours.length > 0) return { label: `${enCours.length} dossier(s) en cours`, color: '#155724' }
    const derniere = derniereDernierActivite(email)
    if (derniere) return { label: `Inactif depuis le ${derniere}`, color: '#856404' }
    return { label: 'Terminé', color: '#6c757d' }
  }

  const contactsFiltres = contacts.filter(c =>
    c.nom?.toLowerCase().includes(recherche.toLowerCase()) ||
    c.email?.toLowerCase().includes(recherche.toLowerCase()) ||
    c.statut?.toLowerCase().includes(recherche.toLowerCase())
  )

  const ficheContact = ficheId ? contacts.find(c => c.id === ficheId) : null
  const fichesDossiers = ficheContact?.email
    ? dossiers.filter(d => d.email_client?.toLowerCase() === ficheContact.email.toLowerCase())
    : []

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 1400, margin: '0 auto', padding: '0' }}>
      <div style={{ background: '#1a2b5e', padding: '0.5rem 3rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', overflow: 'visible', position: 'relative' }}>
        <img src="/logo-rond.png" alt="ATDB" style={{ height: 100, width: 100, objectFit: 'contain', marginTop: -15, marginBottom: -15 }} />
        <h1 style={{ position: 'absolute', left: 0, right: 0, textAlign: 'center', color: '#f5c400', fontSize: '2rem', fontWeight: 700, margin: 0, pointerEvents: 'none' }}>Contacts</h1>
        <button onClick={() => router.push('/')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#f5c400', fontSize: '1.8rem', cursor: 'pointer', zIndex: 1 }} title="Retour">←</button>
      </div>

      <div style={{ padding: '0 3rem 3rem' }}>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} style={{ background: '#f0f3fa', border: '2px solid #1a2b5e', padding: '1.5rem', borderRadius: 8, marginBottom: '2rem' }}>
          <h2 style={{ marginTop: 0, fontSize: '1.1rem', color: '#1a2b5e' }}>{editingId ? 'Modifier le contact' : 'Nouveau contact'}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <label>Nom *</label><br />
              <input required value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box', marginTop: 4 }} />
            </div>
            <div>
              <label>Email</label><br />
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box', marginTop: 4 }} />
            </div>
            <div>
              <label>Téléphone</label><br />
              <input value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box', marginTop: 4 }} />
            </div>
            <div>
              <label>Statut</label><br />
              <select value={form.statut} onChange={e => setForm({ ...form, statut: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box', marginTop: 4 }}>
                {STATUTS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: '2 / -1' }}>
              <label>Notes</label><br />
              <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box', marginTop: 4 }} />
            </div>
          </div>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
            <button type="submit" disabled={saving}
              style={{ padding: '0.5rem 1.5rem', background: '#f5c400', color: '#1a2b5e', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 700 }}>
              {saving ? 'Enregistrement...' : editingId ? 'Mettre à jour' : 'Ajouter'}
            </button>
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); setForm({ nom: '', email: '', telephone: '', notes: '', statut: 'actif' }) }}
                style={{ padding: '0.5rem 1rem', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer' }}>
                Annuler
              </button>
            )}
          </div>
        </form>

        {/* Recherche */}
        <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <input
            placeholder="🔍 Rechercher par nom, email ou statut..."
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
            style={{ flex: 1, padding: '0.6rem 1rem', borderRadius: 6, border: '2px solid #1a2b5e', fontSize: '1rem' }}
          />
          <span style={{ color: '#999', fontSize: '0.9rem' }}>{contactsFiltres.length} contact(s)</span>
        </div>

        {/* Liste */}
        {loading ? <p>Chargement...</p> : contactsFiltres.length === 0 ? (
          <p style={{ color: '#999', textAlign: 'center', marginTop: '3rem' }}>Aucun contact trouvé</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#1a2b5e', color: '#f5c400' }}>
                <th style={th}>Nom</th>
                <th style={th}>Email</th>
                <th style={th}>Téléphone</th>
                <th style={th}>Statut</th>
                <th style={th}>Relation</th>
                <th style={th}>Notes</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {contactsFiltres.map((c, i) => {
                const rel = statutRelation(c)
                return (
                  <tr key={c.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa', cursor: 'pointer' }}
                    onClick={() => setFicheId(ficheId === c.id ? null : c.id)}>
                    <td style={td}><strong>{c.nom}</strong></td>
                    <td style={td}>{c.email || <span style={{ color: '#bbb' }}>—</span>}</td>
                    <td style={td}>{c.telephone || <span style={{ color: '#bbb' }}>—</span>}</td>
                    <td style={td}>
                      <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: '0.8rem', ...statutColor(c.statut) }}>
                        {c.statut}
                      </span>
                    </td>
                    <td style={td}><span style={{ fontSize: '0.85rem', color: rel.color, fontWeight: 500 }}>{rel.label}</span></td>
                    <td style={td}>{c.notes || <span style={{ color: '#bbb' }}>—</span>}</td>
                    <td style={{ ...td }} onClick={e => e.stopPropagation()}>
                      <button onClick={() => startEdit(c)} style={btnEdit} title="Modifier">✏️</button>
                      <button onClick={() => deleteContact(c.id)} style={btnDelete} title="Supprimer">🗑️</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {/* Fiche contact */}
        {ficheContact && (
          <div style={{ marginTop: '2rem', background: '#f0f3fa', border: '2px solid #1a2b5e', borderRadius: 8, padding: '1.5rem' }}>
            <h2 style={{ color: '#1a2b5e', marginTop: 0 }}>📋 Fiche — {ficheContact.nom}</h2>
            <p style={{ margin: '0 0 0.5rem' }}><strong>Email :</strong> {ficheContact.email || '—'}</p>
            <p style={{ margin: '0 0 0.5rem' }}><strong>Téléphone :</strong> {ficheContact.telephone || '—'}</p>
            <p style={{ margin: '0 0 1rem' }}><strong>Notes :</strong> {ficheContact.notes || '—'}</p>
            <h3 style={{ color: '#1a2b5e', marginBottom: '0.5rem' }}>Dossiers associés ({fichesDossiers.length})</h3>
            {fichesDossiers.length === 0 ? <p style={{ color: '#999' }}>Aucun dossier</p> : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#1a2b5e', color: '#f5c400' }}>
                    <th style={th}>Sujet</th>
                    <th style={th}>Date promise</th>
                    <th style={th}>Rappel 1</th>
                    <th style={th}>Rappel 2</th>
                    <th style={th}>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {fichesDossiers.map((d, i) => (
                    <tr key={d.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8f9ff' }}>
                      <td style={td}>{d.sujet}</td>
                      <td style={td}>{formatDate(d.date_promise)}</td>
                      <td style={td}>{formatDate(d.date_rappel_1)}</td>
                      <td style={td}>{formatDate(d.date_rappel_2)}</td>
                      <td style={td}>
                        <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.8rem', background: d.statut === 'terminé' ? '#d4edda' : d.statut === 'annulé' ? '#f8d7da' : '#fff3cd' }}>
                          {d.statut}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const th = { padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600 }
const td = { padding: '0.75rem 1rem', borderBottom: '1px solid #eee', verticalAlign: 'middle' }
const btnEdit = { marginRight: 4, padding: '4px 10px', cursor: 'pointer', border: '1px solid #1a2b5e', borderRadius: 4, background: '#fff', fontSize: '1rem' }
const btnDelete = { padding: '4px 10px', cursor: 'pointer', border: '1px solid #ffcdd2', borderRadius: 4, background: '#fff5f5', fontSize: '1rem' }

function formatDate(d) {
  if (!d) return '—'
  const [y, m, j] = d.split('-')
  return `${j}/${m}/${y}`
}
