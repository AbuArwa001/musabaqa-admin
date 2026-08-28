import re

with open("app/[locale]/dashboard/students/_components/StudentsClient.tsx", "r") as f:
    content = f.read()

old_logic = "{s.review_status !== 'APPROVED' && ("
new_logic = "{s.review_status === 'PENDING_REVIEW' && ("
content = content.replace(old_logic, new_logic)

with open("app/[locale]/dashboard/students/_components/StudentsClient.tsx", "w") as f:
    f.write(content)
