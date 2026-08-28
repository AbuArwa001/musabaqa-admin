import re

with open("app/[locale]/dashboard/live/LiveClient.tsx", "r") as f:
    content = f.read()

# Add initialEvents to props
old_props = """export default function LiveClient({ students, rounds, dict, locale, token }: {"""
new_props = """export default function LiveClient({ students, rounds, initialEvents = [], dict, locale, token }: {"""
content = content.replace(old_props, new_props)

old_props_type = """  token: string
}) {"""
new_props_type = """  token: string
  initialEvents?: LiveEvent[]
}) {"""
content = content.replace(old_props_type, new_props_type)

# Use initialEvents in useState
old_state = """  const [events, setEvents] = useState<LiveEvent[]>([])
  const [wsConnected, setWsConnected] = useState(false)
  const [eventCount, setEventCount] = useState(0)"""
new_state = """  const [events, setEvents] = useState<LiveEvent[]>(initialEvents)
  const [wsConnected, setWsConnected] = useState(false)
  const [eventCount, setEventCount] = useState(initialEvents.length)"""
content = content.replace(old_state, new_state)

with open("app/[locale]/dashboard/live/LiveClient.tsx", "w") as f:
    f.write(content)
