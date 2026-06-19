import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/router'

export default function Archives() {
  const [archives, setArchives] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetchArchives()
  }, [])

  async function fetchArchives() {
    setLoading(true)
    const { data } = await supabase
      .from('suivi_clients')
      .select('*')
      .eq('statut', 'terminé')
      .order('created_at', { ascending: false })
    setArchives(data || [])
    setLoading(false)
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
      statut: client.statut || 'terminé'
    })
  }

  async function handleSave(id) {
    setSaving(true)
    const payload = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, v === '' ? null : v])
    )
    await supabase.from('suivi_clients').update(payload).eq('id', id)
    setEditingId(null)
    setSaving(false)
    fetchArchives()
  }

  async function restaurer(id) {
    await supabase.from('suivi_clients').update({ statut: 'en cours' }).eq('id', id)
    fetchArchives()
  }

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 1400, margin: '0 auto', padding: '0' }}>
      <div style={{ background: '#1a2b5e', padding: '0.5rem 3rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', overflow: 'visible', position: 'relative' }}>
        <img src="/logo-rond.png" alt="ATDB" style={{ height: 100, width: 100, objectFit: 'contain', marginTop: -15, marginBottom: -15 }} />
        <h1 style={{ position: 'absolute', left: 0, right: 0, textAlign: 'center', color: '#f5c400', fontSize: '2rem', fontWeight: 700, margin: 0, pointerEvents: 'none' }}>Archives</h1>
        <button onClick={() => router.push('/')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#f5c400', fontSize: '1.8rem', cursor: 'pointer', zIndex: 1 }} title="Retour">←</button>
      </div>

      <div style={{ padding: '0 3rem 3rem' }}>
        {loading ? <p>Chargement...</p> : archives.length === 0 ? (
          <p style={{ color: '#999', textAlign: 'center', marginTop: '3rem' }}>Aucune archive</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#1a2b5e', color: '#f5c400' }}>
                <th style={th}>Sujet</th>
                <th style={th}>Email contact</th>
                <th style={th}>Début</th>
                <th style={th}>Date promise</th>
                <th style={th}>Rappel 1</th>
                <th style={th}>Rappel 2</th>
                <th style={th}>Notes</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {archives.map((c, i) => (
                <tr key={c.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  {editingId === c.id ? (
                    <>
                      <td style={td}><input value={form.sujet} onChange={e => setForm({ ...form, sujet: e.target.value })} style={inputStyle} /></td>
                      <td style={td}><input type="email" value={form.email_client} onChange={e => setForm({ ...form, email_client: e.target.value })} style={inputStyle} /></td>
                      <td style={td}><input type="date" value={form.date_debut} onChange={e => setForm({ ...form, date_debut: e.target.value })} style={inputStyle} /></td>
                      <td style={td}><input type="date" value={form.date_promise} onChange={e => setForm({ ...form, date_promise: e.target.value })} style={inputStyle} /></td>
                      <td style={td}><input type="date" value={form.date_rappel_1} onChange={e => setForm({ ...form, date_rappel_1: e.target.value })} style={inputStyle} /></td>
                      <td style={td}><input type="date" value={form.date_rappel_2} onChange={e => setForm({ ...form, date_rappel_2: e.target.value })} style={inputStyle} /></td>
                      <td style={td}><input value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} style={inputStyle} /></td>
                      <td style={td}>
                        <button onClick={() => handleSave(c.id)} disabled={saving} style={btnSave}>✓</button>
                        <button onClick={() => setEditingId(null)} style={btnCancel}>✕</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={td}>{c.sujet}</td>
                      <td style={td}>{c.email_client || <span style={{ color: '#bbb' }}>—</span>}</td>
                      <td style={td}>{formatDate(c.date_debut)}</td>
                      <td style={td}>{formatDate(c.date_promise)}</td>
                      <td style={td}>{formatDate(c.date_rappel_1)}</td>
                      <td style={td}>{formatDate(c.date_rappel_2)}</td>
                      <td style={td}>{c.notes || <span style={{ color: '#bbb' }}>—</span>}</td>
                      <td style={td}>
                        <button onClick={() => startEdit(c)} style={btnEdit} title="Modifier">✏️</button>
                        <button onClick={() => restaurer(c.id)} style={btnRestore} title="Restaurer en cours">↩️</button>
                      </td>
                    </>
                  )}
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
const inputStyle = { width: '100%', padding: '0.3rem', boxSizing: 'border-box', fontSize: '0.9rem' }
const btnEdit = { marginRight: 4, padding: '4px 10px', cursor: 'pointer', border: '1px solid #1a2b5e', borderRadius: 4, background: '#fff', fontSize: '1rem' }
const btnRestore = { padding: '4px 10px', cursor: 'pointer', border: '1px solid #1a2b5e', borderRadius: 4, background: '#f0f3fa', fontSize: '1rem' }
const btnSave = { marginRight: 4, padding: '4px 10px', cursor: 'pointer', border: 'none', borderRadius: 4, background: '#1a2b5e', color: '#f5c400', fontWeight: 700 }
const btnCancel = { padding: '4px 10px', cursor: 'pointer', border: '1px solid #ccc', borderRadius: 4, background: '#fff' }

function formatDate(d) {
  if (!d) return '—'
  const [y, m, j] = d.split('-')
  return `${j}/${m}/${y}`
}
