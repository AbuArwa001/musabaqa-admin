import re

with open("app/[locale]/dashboard/rounds/[id]/score/page.tsx", "r") as f:
    content = f.read()

# Filter students to only include APPROVED
old_logic = "const students = await listStudents(token, { category_id: round.category_id.toString() })"
new_logic = "const allStudents = await listStudents(token, { category_id: round.category_id.toString() })\n    const students = allStudents.filter(s => s.status === 'APPROVED')"
content = content.replace(old_logic, new_logic)

with open("app/[locale]/dashboard/rounds/[id]/score/page.tsx", "w") as f:
    f.write(content)
