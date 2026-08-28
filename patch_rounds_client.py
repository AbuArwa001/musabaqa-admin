import re

with open("app/[locale]/dashboard/rounds/RoundsClient.tsx", "r") as f:
    content = f.read()

# 1. Add role to props
old_props = "export default function RoundsClient({ initialData, categories, judges, dict, locale, token }: { initialData: RoundRead[], categories: Category[], judges: AdminUserRead[], dict: Dict, locale: string, token: string }) {"
new_props = "export default function RoundsClient({ initialData, categories, judges, dict, locale, token, role }: { initialData: RoundRead[], categories: Category[], judges: AdminUserRead[], dict: Dict, locale: string, token: string, role: string }) {"
content = content.replace(old_props, new_props)

# 2. Add isModerator
is_ar = "const isAr = locale === 'ar'"
is_mod = "const isAr = locale === 'ar'\n  const isModerator = role === 'SUPERADMIN' || role === 'MODERATOR'"
content = content.replace(is_ar, is_mod)

# 3. Hide 'Create' button
create_btn = """<button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
            <Gavel size={16} /> {t.create}
          </button>"""
new_create_btn = """{isModerator && (
            <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
              <Gavel size={16} /> {t.create}
            </button>
          )}"""
content = content.replace(create_btn, new_create_btn)

# 4. Hide 'Assign Judge' and 'Start Round'
actions_pending = """{round.status === 'PENDING' && (
                          <>
                            <button onClick={() => setAssigningRoundId(round.id)} className="btn-secondary !py-1 !px-2.5 text-xs">{t.assign_judge}</button>
                            <button onClick={() => handleStart(round.id)} disabled={!isPanelValid} className="btn-primary !py-1 !px-2.5 text-xs flex items-center gap-1">
                              <Play size={11} /> {t.start}
                            </button>
                          </>
                        )}"""
new_actions_pending = """{round.status === 'PENDING' && isModerator && (
                          <>
                            <button onClick={() => setAssigningRoundId(round.id)} className="btn-secondary !py-1 !px-2.5 text-xs">{t.assign_judge}</button>
                            <button onClick={() => handleStart(round.id)} disabled={!isPanelValid} className="btn-primary !py-1 !px-2.5 text-xs flex items-center gap-1">
                              <Play size={11} /> {t.start}
                            </button>
                          </>
                        )}
                        {round.status === 'PENDING' && !isModerator && (
                          <span className="text-gray-400 text-xs font-medium">Pending assignment</span>
                        )}"""
content = content.replace(actions_pending, new_actions_pending)

# 5. Hide 'Complete Round'
actions_active = """{round.status === 'ACTIVE' && (
                          <>
                            <Link href={`/${locale}/dashboard/rounds/${round.id}/score`} className="btn-gold !py-1 !px-2.5 text-xs">{t.score}</Link>
                            <button onClick={() => handleComplete(round.id)} className="btn-secondary !py-1 !px-2.5 text-xs text-emerald-700 hover:bg-emerald-50 flex items-center gap-1">
                              <CheckCircle size={11} /> {t.complete}
                            </button>
                          </>
                        )}"""
new_actions_active = """{round.status === 'ACTIVE' && (
                          <>
                            <Link href={`/${locale}/dashboard/rounds/${round.id}/score`} className="btn-gold !py-1 !px-2.5 text-xs">{t.score}</Link>
                            {isModerator && (
                              <button onClick={() => handleComplete(round.id)} className="btn-secondary !py-1 !px-2.5 text-xs text-emerald-700 hover:bg-emerald-50 flex items-center gap-1">
                                <CheckCircle size={11} /> {t.complete}
                              </button>
                            )}
                          </>
                        )}"""
content = content.replace(actions_active, new_actions_active)

with open("app/[locale]/dashboard/rounds/RoundsClient.tsx", "w") as f:
    f.write(content)
