export default function DirectScreen({ th, channels, onPlay }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 22 }}>
        <div style={{ fontSize: 24, fontWeight: 700 }}>Chaînes en direct</div>
        <div style={{ fontSize: 13, color: th.textMuted, fontFamily: "'Montserrat', sans-serif" }}>{channels.length} chaînes</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {channels.map((ch, i) => (
          <div
            key={i}
            style={{ display: 'flex', alignItems: 'center', gap: 18, background: th.cardBg, borderRadius: 16, padding: '14px 20px', boxShadow: th.cardShadow, border: `1px solid ${th.cardBorder}` }}
          >
            {/* Logo placeholder */}
            <div style={{ background: ch.tint, width: 96, height: 96, borderRadius: 16, flexShrink: 0, boxShadow: '0 4px 10px rgba(22,50,79,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: 20, letterSpacing: 1 }}>
                {ch.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </span>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: th.textPrimary }}>{ch.name}</div>
              <div style={{ fontSize: 12.5, color: th.textMuted, marginTop: 2, fontFamily: "'Montserrat', sans-serif" }}>
                {ch.category} · <span style={{ color: th.textBody }}>{ch.program}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#FDECE5', padding: '5px 12px', borderRadius: 20, flexShrink: 0 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#E8622C', flexShrink: 0 }} />
              <span style={{ fontSize: 10.5, fontWeight: 700, color: '#E8622C', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>EN DIRECT</span>
            </div>

            <div
              onClick={() => onPlay({ kind: 'channel', title: ch.name, meta: `${ch.category} · ${ch.program}`, live: true, tint: ch.tint })}
              style={{ width: 40, height: 40, borderRadius: 10, background: '#16324F', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#FFFFFF"><polygon points="5,3 21,12 5,21" /></svg>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
