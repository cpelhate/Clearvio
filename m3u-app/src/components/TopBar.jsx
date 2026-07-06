const TABS = [
  { id: 'home', label: 'Accueil' },
  { id: 'direct', label: 'Direct' },
  { id: 'films', label: 'Films' },
  { id: 'series', label: 'Séries' },
]

export default function TopBar({ th, screen, search, onSearch, goTo }) {
  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 24, padding: '18px 40px', background: th.headerBg, borderBottom: `1px solid ${th.headerBorder}`, boxShadow: th.headerShadow }}>
      {/* Logo */}
      <div onClick={() => goTo('home')} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', lineHeight: 1, flexShrink: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 4, color: th.textPrimary }}>
          M3U <span style={{ color: '#E8622C' }}>PERSO</span>
        </div>
        <div style={{ height: 3, width: '100%', background: 'linear-gradient(90deg,#16324F,#E8622C)', marginTop: 5, borderRadius: 2 }} />
        <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: 0.5, color: th.textMuted, marginTop: 5, fontFamily: "'Montserrat', sans-serif" }}>
          Mon appli perso pour les flux vidéo
        </div>
      </div>

      {/* Nav tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: th.tabsBg, padding: 5, borderRadius: 12, flexShrink: 0 }}>
        {TABS.map(tab => {
          const active = screen === tab.id
          return (
            <div
              key={tab.id}
              onClick={() => goTo(tab.id)}
              style={{
                padding: '9px 18px', borderRadius: 9, fontSize: 13, fontWeight: 600, letterSpacing: 0.3,
                cursor: 'pointer', transition: 'all 0.15s ease',
                background: active ? th.tabActiveBg : 'transparent',
                color: active ? th.tabActiveColor : th.tabInactiveColor,
                boxShadow: active ? th.tabActiveShadow : 'none',
              }}
            >
              {tab.label}
            </div>
          )
        })}
      </div>

      <div style={{ flex: 1 }} />

      {/* Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, border: `1.5px solid ${th.searchBorder}`, background: th.searchBg, borderRadius: 24, padding: '9px 18px', width: 280 }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#8592A3" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          value={search}
          onChange={onSearch}
          placeholder="Rechercher une chaîne, un film, une série..."
          style={{ border: 'none', outline: 'none', fontSize: 13, fontFamily: "'Poppins', sans-serif", color: th.inputText, width: '100%', background: 'transparent' }}
        />
      </div>

      {/* Sync button */}
      <IconBtn onClick={() => goTo('sync')} title="Synchroniser">
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#E8622C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 11A8 8 0 0 0 6.3 6.3L4 8.7" /><path d="M4 4v4.7h4.7" />
          <path d="M4 13a8 8 0 0 0 13.7 4.7L20 15.3" /><path d="M20 20v-4.7h-4.7" />
        </svg>
      </IconBtn>

      {/* Settings button */}
      <IconBtn onClick={() => goTo('settings')} title="Paramètres">
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#E8622C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </IconBtn>
    </div>
  )
}

function IconBtn({ onClick, title, children }) {
  return (
    <div
      onClick={onClick}
      title={title}
      style={{ cursor: 'pointer', width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(145deg,#1B3E63,#16324F)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(22,50,79,0.25)', flexShrink: 0 }}
    >
      {children}
    </div>
  )
}
