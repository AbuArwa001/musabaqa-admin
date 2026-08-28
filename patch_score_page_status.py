import re

with open("app/[locale]/dashboard/rounds/[id]/score/page.tsx", "r") as f:
    content = f.read()

old_logic = "const students = allStudents.filter(s => s.status === 'APPROVED')"
new_logic = "const students = allStudents.filter(s => s.review_status === 'APPROVED')"
content = content.replace(old_logic, new_logic)

with open("app/[locale]/dashboard/rounds/[id]/score/page.tsx", "w") as f:
    f.write(content)
