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
  DEDUCTION:    { color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' },
  SCORE_UPDATE: { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  ROUND_START:  { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  ROUND_END:    { color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
}

function getEventStyle(type: string) {
  return eventColors[type] ?? { color: 'text-sky-700', bg: 'bg-sky-50', border: 'border-sky-200' }
}

export default function LiveClient({ students, rounds, initialEvents = [], dict, locale, token }: {
  students: StudentRead[]
  rounds: RoundRead[]
  dict: Dict
  locale: string
  token: string
  initialEvents?: LiveEvent[]
}) {
  const t = dict.live
  const isAr = locale === 'ar'
  const [events, setEvents] = useState<LiveEvent[]>(initialEvents)
  const [wsConnected, setWsConnected] = useState(false)
  const [eventCount, setEventCount] = useState(initialEvents.length)

  const studentMap = useMemo(() => Object.fromEntries(students.map(s => [s.id, s.full_name])), [students])

  useEffect(() => {
    let ws: WebSocket
    let reconnectTimer: NodeJS.Timeout

    const connect = () => {
      ws = new WebSocket(getAdminWsUrl(token))
      ws.onopen = () => setWsConnected(true)
      ws.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data)
          let parsedEvent: LiveEvent | null = null

          if (raw.type === 'SCORE_UPDATED') {
            parsedEvent = {
              type: 'SCORE_UPDATE',
              timestamp: new Date().toISOString(),
              payload: { round_id: raw.round_id, student_id: raw.student_id }
            }
          } else if (raw.type === 'ACTIVE_STUDENT_CHANGED') {
            parsedEvent = {
              type: 'ROUND_START',
              timestamp: new Date().toISOString(),
              payload: { round_id: raw.round_id, student_id: raw.student_id }
            }
          } else if (raw.entries) {
            parsedEvent = {
              type: 'ROUND_END',
              timestamp: raw.broadcast_at || new Date().toISOString(),
              payload: { round_id: raw.round_id, final_score: raw.entries[0]?.final_score }
            }
          }
          
          if (parsedEvent) {
            setEvents(prev => [parsedEvent, ...prev].slice(0, 100))
            setEventCount(c => c + 1)
          }
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
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={t.title}
        subtitle="Real-time competition scoring event stream and socket connection"
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
              <Activity size={13} />
              <span>{eventCount} events</span>
            </div>

            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
              wsConnected ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span>{wsConnected ? t.connected : t.disconnected}</span>
              {wsConnected ? <Wifi size={13} /> : <WifiOff size={13} />}
            </div>
          </div>
        }
      />

      {/* Event Feed Table Card */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="flex items-center gap-2 px-6 py-3.5 border-b border-gray-100 bg-gray-50/80">
          <Zap size={14} className="text-[#c99335]" />
          <span className="text-xs font-bold uppercase tracking-wider text-gray-700 font-serif">
            Live Stream Logs
          </span>
          {wsConnected && events.length > 0 && (
            <span className="text-[11px] px-2 py-0.2 rounded-full font-bold bg-emerald-100 text-emerald-800 ml-1">
              {events.length} logs
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/60 border-b border-gray-200">
              <tr>
                <th className="table-th">{t.col_time}</th>
                <th className="table-th">Event Type</th>
                <th className="table-th">{t.col_round}</th>
                <th className="table-th">{t.col_student}</th>
                <th className="table-th">{t.col_score}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {events.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <Wifi size={18} />
                      </div>
                      <p className="font-semibold text-sm text-gray-700">
                        {wsConnected ? 'Listening for live events...' : 'Connecting to live websocket stream...'}
                      </p>
                      <p className="text-xs text-gray-400">Events will populate in real-time as judges submit scores.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                events.map((ev, i) => {
                  const studentName = ev.payload?.student_id ? studentMap[ev.payload.student_id] : '—'
                  const roundInfo   = ev.payload?.round_id   ? `Round #${ev.payload.round_id}` : '—'
                  const style       = getEventStyle(ev.type)
                  return (
                    <tr key={i} className="hover:bg-gray-50/60 transition-colors">
                      <td className="table-td text-gray-500 font-mono text-xs">
                        {formatDateTime(ev.timestamp || new Date().toISOString())}
                      </td>
                      <td className="table-td">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${style.bg} ${style.color} ${style.border}`}>
                          {ev.type}
                        </span>
                      </td>
                      <td className="table-td text-gray-700 text-xs font-medium">{roundInfo}</td>
                      <td className="table-td font-semibold text-gray-900 text-xs">{studentName}</td>
                      <td className="table-td">
                        {ev.payload?.final_score !== undefined ? (
                          <span className="font-bold text-sm text-emerald-700 font-serif">
                            {ev.payload.final_score.toFixed(2)}
                          </span>
                        ) : <span className="text-gray-400 text-xs">—</span>}
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
