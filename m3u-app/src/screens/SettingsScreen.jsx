const orange = '#E8622C'
const navy = '#16324F'

const SETTINGS_DEF = [
  { key: 'autoplay', label: 'Lecture automatique', desc: 'Enchaîner les épisodes automatiquement' },
  { key: 'notifications', label: 'Notifications', desc: 'Alertes de nouveaux contenus synchronisés' },
  { key: 'darkMode', label: 'Thème sombre', desc: 'Interface en tons foncés' },
]

export default function SettingsScreen({ th, settings, toggleSetting, quality, setQuality }) {
  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 22 }}>Paramètres</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, background: th.cardBg, borderRadius: 18, boxShadow: '0 8px 22px -8px rgba(22,50,79,0.12)', overflow: 'hidden' }}>
        {SETTINGS_DEF.map(opt => {
          const on = settings[opt.key]
          return (
            <div key={opt.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: `1px solid ${th.rowBorder}` }}>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 600, color: th.textPrimary }}>{opt.label}</div>
                <div style={{ fontSize: 12, color: th.textMuted, marginTop: 2, fontFamily: "'Montserrat', sans-serif" }}>{opt.desc}</div>
              </div>
              <div
                onClick={() => toggleSetting(opt.key)}
                style={{ width: 46, height: 26, borderRadius: 14, background: on ? orange : '#D7DCE3', position: 'relative', cursor: 'pointer', transition: 'background 0.2s ease', flexShrink: 0 }}
              >
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#FFFFFF', position: 'absolute', top: 3, left: on ? 23 : 3, transition: 'left 0.2s ease', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
              </div>
            </div>
          )
        })}

        {/* Quality selector */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px' }}>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 600, color: th.textPrimary }}>Qualité de lecture</div>
            <div style={{ fontSize: 12, color: th.textMuted, marginTop: 2, fontFamily: "'Montserrat', sans-serif" }}>Résolution préférée de diffusion</div>
          </div>
          <div style={{ display: 'flex', gap: 6, background: th.qualityGroupBg, padding: 4, borderRadius: 10 }}>
            {['Auto', '720p', '1080p'].map(q => (
              <div
                key={q}
                onClick={() => setQuality(q)}
                style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', background: quality === q ? navy : 'transparent', color: quality === q ? '#FFFFFF' : th.tabInactiveColor, transition: 'background 0.15s ease' }}
              >
                {q}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
