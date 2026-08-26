'use client'

import { useState, useEffect, useMemo } from 'react'
import { getAdminWsUrl, type StudentRead, type RoundRead } from '@/lib/api'
import type { Dict } from '@/lib/dictionaries'
import { formatDateTime } from '@/lib/utils'

interface LiveEvent {
  type: string
  timestamp: string
  payload: any
}

export default function LiveClient({ students, rounds, dict, locale, token }: { students: StudentRead[], rounds: RoundRead[], dict: Dict, locale: string, token: string }) {
  const t = dict.live
  const isAr = locale === 'ar'
  const [events, setEvents] = useState<LiveEvent[]>([])
  const [wsConnected, setWsConnected] = useState(false)

  const studentMap = useMemo(() => Object.fromEntries(students.map(s => [s.id, s.full_name])), [students])
  const roundMap = useMemo(() => Object.fromEntries(rounds.map(r => [r.id, r])), [rounds])

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
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-stone-400">{t.title}</h1>
        <div className="glass-sm px-4 py-2 flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
          <span className={`text-sm font-medium ${wsConnected ? 'text-emerald-400' : 'text-red-400'}`}>
            {wsConnected ? t.connected : t.disconnected}
          </span>
        </div>
      </div>

      <div className="glass overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-white/10 bg-black/20">
              <tr>
                <th className="table-th">{t.col_time}</th>
                <th className="table-th">Event</th>
                <th className="table-th">{t.col_round}</th>
                <th className="table-th">{t.col_student}</th>
                <th className="table-th">{t.col_score}</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td colSpan={5} className="table-td text-center py-12 text-stone-500">
                    {wsConnected ? 'Waiting for live events...' : 'Connecting to live feed...'}
                  </td>
                </tr>
              ) : (
                events.map((ev, i) => {
                  const studentName = ev.payload?.student_id ? studentMap[ev.payload.student_id] : '—'
                  const roundInfo = ev.payload?.round_id ? `Round #${ev.payload.round_id}` : '—'
                  return (
                    <tr key={i} className="table-row-hover border-b border-white/5 last:border-0 animate-in fade-in slide-in-from-top-2">
                      <td className="table-td text-stone-400 text-xs">{formatDateTime(ev.timestamp || new Date().toISOString())}</td>
                      <td className="table-td font-medium text-amber-400">{ev.type}</td>
                      <td className="table-td text-stone-300">{roundInfo}</td>
                      <td className="table-td text-white">{studentName}</td>
                      <td className="table-td text-emerald-400 font-bold">
                        {ev.payload?.final_score !== undefined ? ev.payload.final_score.toFixed(2) : '—'}
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
