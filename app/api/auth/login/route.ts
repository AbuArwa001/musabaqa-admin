import { NextResponse } from 'next/server'
import { loginStaff } from '@/lib/api'
import { decodeAdminToken } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()
    const data = await loginStaff(email, password)
    const claims = decodeAdminToken(data.access_token)
    const res = NextResponse.json({ role: claims?.role, name: claims?.name })
    res.cookies.set('musabaqa_admin_token', data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 12, // 12h
    })
    return res
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Login failed'
    return NextResponse.json({ error: msg }, { status: 401 })
  }
}
