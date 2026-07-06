export default function SeriesScreen({ th, series, onPlay }) {
  return (
    <div>
      <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 22 }}>Séries</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: 22 }}>
        {series.map((s, i) => (
          <div
            key={i}
            onClick={() => onPlay({ kind: 'series', title: s.title, meta: `${s.genre} · Saison 1, Épisode 1`, live: false, posterBg: s.posterBg })}
            style={{ cursor: 'pointer', borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 20px -6px rgba(22,50,79,0.18)', background: th.cardBg, transition: 'transform 0.15s ease' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <div style={{ background: s.posterBg, height: 260, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round">
                <rect x="4" y="6" width="16" height="12" rx="4" /><circle cx="12" cy="12" r="2.2" />
              </svg>
              <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.5)', padding: '3px 8px', borderRadius: 8, fontSize: 10, color: '#fff', fontWeight: 600 }}>{s.seasons} S</div>
            </div>
            <div style={{ padding: '12px 14px' }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: th.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</div>
              <div style={{ fontSize: 11.5, color: th.textMuted, marginTop: 3, fontFamily: "'Montserrat', sans-serif" }}>{s.genre}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
