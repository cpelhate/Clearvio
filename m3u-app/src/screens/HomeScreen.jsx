export default function HomeScreen({ th, goTo }) {
  return (
    <div>
      <div style={{ marginBottom: 26 }}>
        <div style={{ fontSize: 26, fontWeight: 700, color: th.textPrimary }}>Bienvenue 👋</div>
        <div style={{ fontSize: 14, color: th.textMuted, marginTop: 4, fontFamily: "'Montserrat', sans-serif" }}>Choisissez ce que vous voulez regarder</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr) 1fr', gridTemplateRows: 'repeat(2,180px)', gap: 22 }}>
        {/* DIRECT — spans 2 rows */}
        <Tile
          onClick={() => goTo('direct')}
          style={{ gridRow: 'span 2', background: 'linear-gradient(150deg,#1B3E63,#122840)', boxShadow: '0 14px 30px -10px rgba(22,50,79,0.45)' }}
        >
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 8l3-4 M17 8l-3-4" /><rect x="3" y="8" width="18" height="12" rx="2" />
            <circle cx="17.5" cy="11" r="0.6" fill="#FFFFFF" /><line x1="6" y1="14" x2="14" y2="14" />
          </svg>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 2, color: '#FFFFFF' }}>DIRECT</div>
        </Tile>

        {/* FILMS — spans 2 rows */}
        <Tile
          onClick={() => goTo('films')}
          style={{ gridRow: 'span 2', background: 'linear-gradient(150deg,#F07A45,#DE5A22)', boxShadow: '0 14px 30px -10px rgba(232,98,44,0.5)' }}
        >
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8.5l16-4 1 4-16 4z" /><rect x="3" y="8.5" width="17" height="11" rx="2" />
            <line x1="6.5" y1="8" x2="8" y2="4.6" /><line x1="11.5" y1="7" x2="13" y2="3.6" />
          </svg>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 2, color: '#FFFFFF' }}>FILMS</div>
        </Tile>

        {/* SÉRIES — spans 2 rows */}
        <Tile
          onClick={() => goTo('series')}
          style={{ gridRow: 'span 2', background: 'linear-gradient(150deg,#1B3E63,#122840)', boxShadow: '0 14px 30px -10px rgba(22,50,79,0.45)' }}
        >
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="6" width="16" height="12" rx="4" /><circle cx="12" cy="12" r="2.2" />
            <path d="M9 3.5l1.5 2.5 M15 3.5l-1.5 2.5" />
          </svg>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 2, color: '#FFFFFF' }}>SÉRIES</div>
        </Tile>

        {/* SYNCHRONISER */}
        <SmallTile onClick={() => goTo('sync')}>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#F07A45" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 11A8 8 0 0 0 6.3 6.3L4 8.7" /><path d="M4 4v4.7h4.7" />
            <path d="M4 13a8 8 0 0 0 13.7 4.7L20 15.3" /><path d="M20 20v-4.7h-4.7" />
          </svg>
          <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 1.5, color: '#F07A45' }}>SYNCHRONISER</div>
        </SmallTile>

        {/* PARAMÈTRES */}
        <SmallTile onClick={() => goTo('settings')}>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#F07A45" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 1.5, color: '#F07A45' }}>PARAMÈTRES</div>
        </SmallTile>
      </div>
    </div>
  )
}

function Tile({ onClick, style, children }) {
  return (
    <div
      onClick={onClick}
      style={{ cursor: 'pointer', borderRadius: 22, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: 24, transition: 'transform 0.15s ease', ...style }}
      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      {children}
    </div>
  )
}

function SmallTile({ onClick, children }) {
  return (
    <div
      onClick={onClick}
      style={{ cursor: 'pointer', borderRadius: 22, background: 'linear-gradient(150deg,#1B3E63,#122840)', boxShadow: '0 10px 24px -8px rgba(22,50,79,0.45)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 14, transition: 'transform 0.15s ease' }}
      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      {children}
    </div>
  )
}
