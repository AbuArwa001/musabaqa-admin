'use client'

import { useState, useEffect, useMemo } from 'react'
import { getAdminWsUrl, type StudentRead, type RoundRead } from '@/lib/api'
import type { Dict } from '@/lib/dictionaries'
import { formatDateTime } from '@/lib/utils'
import PageHeader from '@/components/PageHeader'
import { Wifi, WifiOff, Activity, Zap } from 'lucide-react'

interface LiveEvent {
  type: string
  timestamp: string
  payload: any
}

const eventColors: Record<string, { color: string; bg: string; border: string }> = {
  DEDUCTION:    { color: '#f56b7e', bg: 'rgba(245,107,126,0.1)', border: 'rgba(245,107,126,0.25)' },
  SCORE_UPDATE: { color: '#00d88a', bg: 'rgba(0,216,138,0.1)',   border: 'rgba(0,216,138,0.25)' },
  ROUND_START:  { color: '#f0c060', bg: 'rgba(240,192,96,0.1)',  border: 'rgba(240,192,96,0.25)' },
  ROUND_END:    { color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.25)' },
}
function getEventStyle(type: string) {
  return eventColors[type] ?? { color: '#5b8df5', bg: 'rgba(91,141,245,0.1)', border: 'rgba(91,141,245,0.25)' }
}

export default function LiveClient({ students, rounds, dict, locale, token }: {
  students: StudentRead[]
  rounds: RoundRead[]
  dict: Dict
  locale: string
  token: string
}) {
  const t = dict.live
  const isAr = locale === 'ar'
  const [events, setEvents] = useState<LiveEvent[]>([])
  const [wsConnected, setWsConnected] = useState(false)
  const [eventCount, setEventCount] = useState(0)

  const studentMap = useMemo(() => Object.fromEntries(students.map(s => [s.id, s.full_name])), [students])
  const roundMap   = useMemo(() => Object.fromEntries(rounds.map(r => [r.id, r])), [rounds])

  useEffect(() => {
    let ws: WebSocket
    let reconnectTimer: NodeJS.Timeout

    const connect = () => {
      ws = new WebSocket(getAdminWsUrl(token))
      ws.onopen = () => setWsConnected(true)
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          setEvents(prev => [data, ...prev].slice(0, 100))
          setEventCount(c => c + 1)
        } catch (e) {}
      }
      ws.onclose = () => {
        setWsConnected(false)
        reconnectTimer = setTimeout(connect, 3000)
      }
    }

    connect()
    return () => {
      clearTimeout(reconnectTimer)
      if (ws) ws.close()
    }
  }, [token])

  return (
    <div className="animate-fade-slide-up">
      {/* Header */}
      <div className={`flex items-start justify-between gap-4 mb-8 ${isAr ? 'flex-row-reverse' : ''}`}>
        <PageHeader
          title={t.title}
          subtitle="Real-time competition event stream"
        />

        {/* Connection status + stats */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Event counter */}
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
            style={{
              background: 'rgba(167,139,250,0.1)',
              border: '1px solid rgba(167,139,250,0.2)',
              color: '#a78bfa',
              fontFamily: 'var(--font-display)',
            }}
          >
            <Activity size={13} />
            <span>{eventCount} events</span>
          </div>

          {/* WS status */}
          <div
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl relative overflow-hidden"
            style={{
              background: wsConnected ? 'rgba(0,216,138,0.1)' : 'rgba(245,107,126,0.1)',
              border: wsConnected ? '1px solid rgba(0,216,138,0.25)' : '1px solid rgba(245,107,126,0.25)',
            }}
          >
            {/* Pulse rings when connected */}
            {wsConnected && (
              <div className="relative w-3 h-3">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{ background: '#00d88a', animation: 'pulse-ring 1.8s ease-out infinite' }}
                />
                <div
                  className="absolute inset-0 rounded-full"
                  style={{ background: '#00d88a', animation: 'pulse-ring 1.8s ease-out infinite', animationDelay: '0.6s' }}
                />
                <div className="relative w-3 h-3 rounded-full" style={{ background: '#00d88a', boxShadow: '0 0 8px #00d88a' }} />
              </div>
            )}
            {!wsConnected && (
              <div className="w-3 h-3 rounded-full" style={{ background: '#f56b7e', boxShadow: '0 0 6px #f56b7e' }} />
            )}
            <span
              className="text-sm font-semibold"
              style={{
                color: wsConnected ? '#00d88a' : '#f56b7e',
                fontFamily: 'var(--font-display)',
              }}
            >
              {wsConnected ? t.connected : t.disconnected}
            </span>
            {wsConnected ? <Wifi size={14} style={{ color: '#00d88a' }} /> : <WifiOff size={14} style={{ color: '#f56b7e' }} />}
          </div>
        </div>
      </div>

      {/* Event Feed Table */}
      <div
        className="overflow-hidden rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
        }}
      >
        {/* Feed header bar */}
        <div
          className="flex items-center gap-3 px-6 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)' }}
        >
          <Zap size={15} style={{ color: '#f0c060' }} />
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(160,160,192,0.6)', fontFamily: 'var(--font-display)' }}>
            Live Event Stream
          </span>
          {wsConnected && events.length > 0 && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ background: 'rgba(0,216,138,0.12)', color: '#00d88a', border: '1px solid rgba(0,216,138,0.2)' }}
            >
              {events.length} / 100
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.15)' }}>
              <tr>
                <th className="table-th">{t.col_time}</th>
                <th className="table-th">Event Type</th>
                <th className="table-th">{t.col_round}</th>
                <th className="table-th">{t.col_student}</th>
                <th className="table-th">{t.col_score}</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      {/* Animated beacon */}
                      <div className="relative w-14 h-14">
                        {wsConnected && (
                          <>
                            <div className="absolute inset-0 rounded-full" style={{ background: 'rgba(0,216,138,0.15)', animation: 'pulse-ring 2s ease-out infinite' }} />
                            <div className="absolute inset-0 rounded-full" style={{ background: 'rgba(0,216,138,0.1)', animation: 'pulse-ring 2s ease-out infinite', animationDelay: '0.8s' }} />
                          </>
                        )}
                        <div
                          className="relative w-14 h-14 rounded-full flex items-center justify-center"
                          style={{
                            background: wsConnected ? 'rgba(0,216,138,0.12)' : 'rgba(245,107,126,0.1)',
                            border: wsConnected ? '1px solid rgba(0,216,138,0.25)' : '1px solid rgba(245,107,126,0.25)',
                          }}
                        >
                          {wsConnected
                            ? <Wifi size={22} style={{ color: '#00d88a' }} />
                            : <WifiOff size={22} style={{ color: '#f56b7e' }} />
                          }
                        </div>
                      </div>
                      <div>
                        <p className="font-semibold text-sm" style={{ color: 'rgba(240,240,255,0.7)', fontFamily: 'var(--font-display)' }}>
                          {wsConnected ? 'Listening for events...' : 'Connecting to live feed...'}
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'rgba(160,160,192,0.4)' }}>
                          Events will appear here in real-time
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                events.map((ev, i) => {
                  const studentName = ev.payload?.student_id ? studentMap[ev.payload.student_id] : '—'
                  const roundInfo   = ev.payload?.round_id   ? `Round #${ev.payload.round_id}` : '—'
                  const style       = getEventStyle(ev.type)
                  return (
                    <tr
                      key={i}
                      className="table-row-hover"
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        animation: 'fade-slide-in 0.3s ease forwards',
                        animationDelay: '0ms',
                      }}
                    >
                      <td className="table-td">
                        <span className="text-xs" style={{ color: 'rgba(160,160,192,0.55)', fontFamily: 'var(--font-display)' }}>
                          {formatDateTime(ev.timestamp || new Date().toISOString())}
                        </span>
                      </td>
                      <td className="table-td">
                        <span
                          className="text-xs font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider"
                          style={{ background: style.bg, color: style.color, border: `1px solid ${style.border}`, fontFamily: 'var(--font-display)' }}
                        >
                          {ev.type}
                        </span>
                      </td>
                      <td className="table-td">
                        <span className="text-sm" style={{ color: 'rgba(240,240,255,0.7)' }}>{roundInfo}</span>
                      </td>
                      <td className="table-td">
                        <span className="text-sm font-medium" style={{ color: '#f0f0ff' }}>{studentName}</span>
                      </td>
                      <td className="table-td">
                        {ev.payload?.final_score !== undefined ? (
                          <span className="font-bold text-sm" style={{ color: '#00d88a', fontFamily: 'var(--font-display)' }}>
                            {ev.payload.final_score.toFixed(2)}
                          </span>
                        ) : <span style={{ color: 'rgba(160,160,192,0.4)' }}>—</span>}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
