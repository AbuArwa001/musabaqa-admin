import re

with open("app/[locale]/dashboard/live/page.tsx", "r") as f:
    content = f.read()

old_logic = """  const [students, rounds] = await Promise.all([
    listStudents(token).catch(() => []),
    listRounds(token).catch(() => []),
  ])

  return <LiveClient students={students} rounds={rounds} dict={dict} locale={locale} token={token} />"""

new_logic = """  const { getRoundResults } = await import('@/lib/api')
  const [students, rounds] = await Promise.all([
    listStudents(token).catch(() => []),
    listRounds(token).catch(() => []),
  ])

  // Fetch past results for all active/completed rounds to populate the live feed initially
  const activeOrCompleted = rounds.filter(r => r.status === 'ACTIVE' || r.status === 'COMPLETED')
  const allResults = await Promise.all(
    activeOrCompleted.map(r => getRoundResults(token, r.id).catch(() => []))
  )
  const initialEvents = allResults.flat().map(res => ({
    type: 'ROUND_END',
    timestamp: res.computed_at || new Date().toISOString(),
    payload: { round_id: res.round_id, student_id: res.student_id, final_score: res.final_score }
  }))
  // Sort descending by timestamp
  initialEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return <LiveClient students={students} rounds={rounds} initialEvents={initialEvents} dict={dict} locale={locale} token={token} />"""

content = content.replace(old_logic, new_logic)

with open("app/[locale]/dashboard/live/page.tsx", "w") as f:
    f.write(content)
