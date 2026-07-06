export default function FilmsScreen({ th, movies, onPlay }) {
  return (
    <div>
      <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 22 }}>Films</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: 22 }}>
        {movies.map((m, i) => (
          <div
            key={i}
            onClick={() => onPlay({ kind: 'movie', title: m.title, meta: `${m.genre} · ${m.year}`, live: false, posterBg: m.posterBg })}
            style={{ cursor: 'pointer', borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 20px -6px rgba(22,50,79,0.18)', background: th.cardBg, transition: 'transform 0.15s ease' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <div style={{ background: m.posterBg, height: 260, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round">
                <path d="M3 8.5l16-4 1 4-16 4z" /><rect x="3" y="8.5" width="17" height="11" rx="2" />
              </svg>
              <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.5)', padding: '3px 8px', borderRadius: 8, fontSize: 10, color: '#fff', fontWeight: 600 }}>{m.year}</div>
            </div>
            <div style={{ padding: '12px 14px' }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: th.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</div>
              <div style={{ fontSize: 11.5, color: th.textMuted, marginTop: 3, fontFamily: "'Montserrat', sans-serif" }}>{m.genre}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
