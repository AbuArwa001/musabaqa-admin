import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { refreshStaffSession } from '@/lib/api'
import { decodeAdminToken } from '@/lib/auth'

export async function POST() {
  try {
    const cookieStore = await cookies()
    const currentToken = cookieStore.get('musabaqa_admin_token')?.value

    if (!currentToken) {
      return NextResponse.json({ error: 'No active session token found' }, { status: 401 })
    }

    const data = await refreshStaffSession(currentToken)
    const claims = decodeAdminToken(data.access_token)

    const res = NextResponse.json({
      success: true,
      token: data.access_token,
      exp: claims?.exp,
      name: claims?.name,
      role: claims?.role,
    })

    res.cookies.set('musabaqa_admin_token', data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 12, // 12h
    })

    return res
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Session refresh failed'
    return NextResponse.json({ error: msg }, { status: 401 })
  }
}
