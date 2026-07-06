import { useState, useRef } from 'react'
import TopBar from './components/TopBar'
import HomeScreen from './screens/HomeScreen'
import DirectScreen from './screens/DirectScreen'
import FilmsScreen from './screens/FilmsScreen'
import SeriesScreen from './screens/SeriesScreen'
import SyncScreen from './screens/SyncScreen'
import SettingsScreen from './screens/SettingsScreen'
import PlayerScreen from './screens/PlayerScreen'
import { getTheme } from './theme'
import { CHANNELS, MOVIES, SERIES } from './data'

export default function App() {
  const [screen, setScreen] = useState('home')
  const [search, setSearch] = useState('')
  const [m3uUrl, setM3uUrl] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState(null)
  const [settings, setSettings] = useState({ autoplay: true, notifications: false, darkMode: false })
  const [quality, setQuality] = useState('Auto')
  const [nowPlaying, setNowPlaying] = useState(null)
  const [isPlaying, setIsPlaying] = useState(true)
  const [muted, setMuted] = useState(false)
  const [fromScreen, setFromScreen] = useState('home')
  const playerRef = useRef(null)

  const th = getTheme(settings.darkMode)

  const goPlayer = (item) => {
    setFromScreen(prev => screen === 'player' ? prev : screen)
    setNowPlaying(item)
    setIsPlaying(true)
    setScreen('player')
  }

  const doSync = () => {
    if (syncing) return
    setSyncing(true)
    setTimeout(() => { setSyncing(false); setLastSync(new Date()) }, 1600)
  }

  const toggleSetting = (key) => setSettings(s => ({ ...s, [key]: !s[key] }))

  const toggleFullscreen = () => {
    const el = playerRef.current
    if (!el) return
    document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen?.()
  }

  const q = search.toLowerCase()
  const filteredChannels = CHANNELS.filter(c => !q || c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q))
  const filteredMovies = MOVIES.filter(m => !q || m.title.toLowerCase().includes(q) || m.genre.toLowerCase().includes(q))
  const filteredSeries = SERIES.filter(s => !q || s.title.toLowerCase().includes(q) || s.genre.toLowerCase().includes(q))

  return (
    <div style={{ minHeight: '100vh', width: '100%', background: th.pageBg, fontFamily: "'Poppins', sans-serif", color: th.textPrimary, transition: 'background 0.2s ease, color 0.2s ease' }}>
      <TopBar th={th} screen={screen} search={search} onSearch={e => setSearch(e.target.value)} goTo={setScreen} />
      <div style={{ maxWidth: 1360, margin: '0 auto', padding: 40, animation: 'fadeIn 0.35s ease' }}>
        {screen === 'home' && <HomeScreen th={th} goTo={setScreen} />}
        {screen === 'direct' && <DirectScreen th={th} channels={filteredChannels} onPlay={goPlayer} />}
        {screen === 'films' && <FilmsScreen th={th} movies={filteredMovies} onPlay={goPlayer} />}
        {screen === 'series' && <SeriesScreen th={th} series={filteredSeries} onPlay={goPlayer} />}
        {screen === 'sync' && <SyncScreen th={th} m3uUrl={m3uUrl} setM3uUrl={setM3uUrl} syncing={syncing} lastSync={lastSync} doSync={doSync} />}
        {screen === 'settings' && <SettingsScreen th={th} settings={settings} toggleSetting={toggleSetting} quality={quality} setQuality={setQuality} />}
        {screen === 'player' && nowPlaying && (
          <PlayerScreen
            th={th}
            nowPlaying={nowPlaying}
            isPlaying={isPlaying}
            muted={muted}
            playerRef={playerRef}
            onBack={() => setScreen(fromScreen)}
            onTogglePlay={() => setIsPlaying(p => !p)}
            onToggleMute={() => setMuted(m => !m)}
            onToggleFullscreen={toggleFullscreen}
          />
        )}
      </div>
    </div>
  )
}
