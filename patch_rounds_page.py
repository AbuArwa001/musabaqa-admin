import re

with open("app/[locale]/dashboard/rounds/page.tsx", "r") as f:
    content = f.read()

content = content.replace("import { isValidLocale, getDictionary } from '@/lib/dictionaries'", 
                          "import { isValidLocale, getDictionary } from '@/lib/dictionaries'\nimport { decodeAdminToken } from '@/lib/auth'")

content = content.replace("const dict = await getDictionary(locale)", 
                          "const dict = await getDictionary(locale)\n  const claims = decodeAdminToken(token)\n  const role = claims?.role || 'JUDGE'")

content = content.replace("<RoundsClient initialData={rounds} categories={categories} judges={eligibleJudges} dict={dict} locale={locale} token={token} />",
                          "<RoundsClient initialData={rounds} categories={categories} judges={eligibleJudges} dict={dict} locale={locale} token={token} role={role} />")

with open("app/[locale]/dashboard/rounds/page.tsx", "w") as f:
    f.write(content)
