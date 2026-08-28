import re

with open("app/[locale]/dashboard/rounds/[id]/score/ScoringClient.tsx", "r") as f:
    content = f.read()

# 1. Add DeductionTypeOut to imports
content = content.replace("type RoundRead, type StudentRead, type RoundResult, type JudgeScoreSummary", 
                          "type RoundRead, type StudentRead, type RoundResult, type JudgeScoreSummary, type DeductionTypeOut")

# 2. Remove hardcoded DEDUCTION_TYPES
hardcoded = """const DEDUCTION_TYPES = [
  { id: 1, name_en: 'Memorization Error', name_ar: 'خطأ في الحفظ', default_amount: 0.5 },
  { id: 2, name_en: 'Tajweed Minor', name_ar: 'خطأ تجويد خفي', default_amount: 0.25 },
  { id: 3, name_en: 'Tajweed Major', name_ar: 'خطأ تجويد جلي', default_amount: 1.0 },
]
"""
content = content.replace(hardcoded, "")

# 3. Add deductionTypes to props
content = content.replace("round: RoundRead, students: StudentRead[], results: RoundResult[], dict: Dict, locale: string, token: string, currentUserId: number, role: string",
                          "round: RoundRead, students: StudentRead[], results: RoundResult[], deductionTypes: DeductionTypeOut[], dict: Dict, locale: string, token: string, currentUserId: number, role: string")

content = content.replace("round, students, results, dict, locale, token, currentUserId, role",
                          "round, students, results, deductionTypes, dict, locale, token, currentUserId, role")

# 4. Replace DEDUCTION_TYPES with deductionTypes inside the component
content = content.replace("const totalDeducted = DEDUCTION_TYPES.reduce((acc, dt) => acc + (deductions[dt.id] || 0) * dt.default_amount, 0)",
                          "const totalDeducted = deductionTypes.reduce((acc, dt) => acc + (deductions[dt.id] || 0) * (dt.points_deducted || 0), 0)")

content = content.replace("{DEDUCTION_TYPES.map(dt => (", "{deductionTypes.map(dt => (")

content = content.replace("dt.default_amount", "(dt.points_deducted || 0)")

# 5. Fix the criteria name display for buttons
old_button = """<p className="font-bold text-gray-900 text-sm font-serif">{isAr ? dt.name_ar : dt.name_en}</p>"""
new_button = """<p className="font-bold text-gray-900 text-sm font-serif">{isAr ? dt.name_ar : dt.name_en}</p>
                      <p className="text-[10px] text-gray-500 font-sans uppercase tracking-wider mt-0.5">{dt.criteria_name}</p>"""
content = content.replace(old_button, new_button)

with open("app/[locale]/dashboard/rounds/[id]/score/ScoringClient.tsx", "w") as f:
    f.write(content)
