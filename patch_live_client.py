import re

with open("app/[locale]/dashboard/live/LiveClient.tsx", "r") as f:
    content = f.read()

old_logic = """      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          setEvents(prev => [data, ...prev].slice(0, 100))
          setEventCount(c => c + 1)
        } catch (e) {}
      }"""

new_logic = """      ws.onmessage = (event) => {
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
      }"""

content = content.replace(old_logic, new_logic)

with open("app/[locale]/dashboard/live/LiveClient.tsx", "w") as f:
    f.write(content)
