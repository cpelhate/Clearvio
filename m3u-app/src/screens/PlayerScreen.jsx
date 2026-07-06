const navy = '#16324F'

export default function PlayerScreen({ th, nowPlaying, isPlaying, muted, playerRef, onBack, onTogglePlay, onToggleMute, onToggleFullscreen }) {
  const kindLabel = nowPlaying.kind === 'channel' ? 'Direct' : nowPlaying.kind === 'movie' ? 'Film' : 'Série'
  const posterBg = nowPlaying.posterBg || `linear-gradient(150deg,${nowPlaying.tint || navy},#0F2438)`

  return (
    <div>
      {/* Back button */}
      <div onClick={onBack} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 18, color: th.textMuted, fontSize: 13, fontWeight: 600 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15,18 9,12 15,6" />
        </svg>
        Retour
      </div>

      {/* Player container */}
      <div ref={playerRef} style={{ borderRadius: 20, overflow: 'hidden', boxShadow: '0 20px 40px -14px rgba(0,0,0,0.4)', background: '#0B131C' }}>
        {/* Poster / video area */}
        <div style={{ background: posterBg, height: 560, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {nowPlaying.live && (
            <div style={{ position: 'absolute', top: 18, left: 18, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.4)', padding: '6px 12px', borderRadius: 20 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#E8622C' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#FFFFFF', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>EN DIRECT</span>
            </div>
          )}

          {/* Play/Pause big button */}
          <div onClick={onTogglePlay} style={{ cursor: 'pointer', width: 84, height: 84, borderRadius: '50%', background: 'rgba(255,255,255,0.16)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid rgba(255,255,255,0.35)' }}>
            {isPlaying
              ? <svg width="30" height="30" viewBox="0 0 24 24" fill="#FFFFFF"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
              : <svg width="30" height="30" viewBox="0 0 24 24" fill="#FFFFFF" style={{ marginLeft: 4 }}><polygon points="6,4 22,12 6,20" /></svg>
            }
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ padding: '16px 22px 10px' }}>
          <div style={{ height: 4, width: '100%', background: 'rgba(255,255,255,0.18)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: nowPlaying.live ? '100%' : '38%', background: nowPlaying.live ? '#E8622C' : '#F07A45', borderRadius: 2 }} />
          </div>
        </div>

        {/* Controls bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '6px 22px 20px' }}>
          <CtrlBtn onClick={onTogglePlay}>
            {isPlaying
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="#FFFFFF"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="#FFFFFF" style={{ marginLeft: 2 }}><polygon points="6,4 20,12 6,20" /></svg>
            }
          </CtrlBtn>

          <CtrlBtn onClick={onToggleMute}>
            {!muted
              ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="4,9 8,9 12,5 12,19 8,15 4,15" fill="#FFFFFF" stroke="none" />
                  <path d="M16 8a5 5 0 0 1 0 8" /><path d="M18.5 5.5a9 9 0 0 1 0 13" />
                </svg>
              : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="4,9 8,9 12,5 12,19 8,15 4,15" fill="#FFFFFF" stroke="none" />
                  <line x1="17" y1="9" x2="22" y2="14" /><line x1="22" y1="9" x2="17" y2="14" />
                </svg>
            }
          </CtrlBtn>

          <div style={{ flex: 1 }} />

          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.12)', padding: '5px 12px', borderRadius: 8 }}>
            {kindLabel}
          </div>

          <CtrlBtn onClick={onToggleFullscreen}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M16 3h3a2 2 0 0 1 2 2v3" />
              <path d="M8 21H5a2 2 0 0 1-2-2v-3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" />
            </svg>
          </CtrlBtn>
        </div>
      </div>

      {/* Title / meta */}
      <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: th.textPrimary }}>{nowPlaying.title}</div>
          <div style={{ fontSize: 13, color: th.textMuted, marginTop: 4, fontFamily: "'Montserrat', sans-serif" }}>{nowPlaying.meta}</div>
        </div>
      </div>
    </div>
  )
}

function CtrlBtn({ onClick, children }) {
  return (
    <div onClick={onClick} style={{ cursor: 'pointer', width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {children}
    </div>
  )
}
