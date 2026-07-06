export default function SyncScreen({ th, m3uUrl, setM3uUrl, syncing, lastSync, doSync }) {
  const statusText = syncing
    ? 'Récupération des chaînes, films et séries…'
    : lastSync
      ? `Dernière synchronisation réussie à ${lastSync.toLocaleTimeString('fr-FR')}`
      : 'Aucune synchronisation effectuée pour le moment'

  return (
    <div style={{ maxWidth: 560, margin: '20px auto 0', background: th.cardBg, borderRadius: 22, padding: 40, boxShadow: '0 14px 34px -12px rgba(22,50,79,0.2)', textAlign: 'center' }}>
      <div style={{ width: 74, height: 74, borderRadius: 20, background: 'linear-gradient(150deg,#1B3E63,#122840)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
        <svg
          width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#E8622C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
          style={syncing ? { animation: 'spin 1s linear infinite' } : undefined}
        >
          <path d="M20 11A8 8 0 0 0 6.3 6.3L4 8.7" /><path d="M4 4v4.7h4.7" />
          <path d="M4 13a8 8 0 0 0 13.7 4.7L20 15.3" /><path d="M20 20v-4.7h-4.7" />
        </svg>
      </div>

      <div style={{ fontSize: 20, fontWeight: 700 }}>Synchroniser un flux M3U</div>
      <div style={{ fontSize: 13, color: th.textMuted, marginTop: 6, marginBottom: 26, fontFamily: "'Montserrat', sans-serif" }}>
        Collez l'URL de votre playlist M3U pour mettre à jour vos chaînes, films et séries
      </div>

      <input
        value={m3uUrl}
        onChange={e => setM3uUrl(e.target.value)}
        placeholder="https://exemple.com/playlist.m3u"
        style={{
          width: '100%', boxSizing: 'border-box', border: `1.5px solid ${th.inputBorder}`, background: th.inputBg,
          color: th.inputText, borderRadius: 12, padding: '13px 16px', fontSize: 13.5,
          fontFamily: "'Poppins', sans-serif", outline: 'none', marginBottom: 16,
        }}
      />

      <div
        onClick={doSync}
        style={{ cursor: 'pointer', background: 'linear-gradient(135deg,#F07A45,#DE5A22)', color: '#FFFFFF', fontWeight: 700, letterSpacing: 0.5, fontSize: 14, padding: 14, borderRadius: 12, boxShadow: '0 10px 22px -8px rgba(232,98,44,0.55)', opacity: syncing ? 0.7 : 1 }}
      >
        {syncing ? 'Synchronisation…' : 'Synchroniser'}
      </div>

      <div style={{ marginTop: 18, fontSize: 12, color: th.textMuted, fontFamily: "'Montserrat', sans-serif" }}>{statusText}</div>
    </div>
  )
}
