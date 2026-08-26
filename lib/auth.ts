import { decodeJwt } from 'jose'

export type AdminRole = 'SUPERADMIN' | 'JUDGE' | 'MODERATOR'

export interface AdminClaims {
  sub: string
  email: string
  name: string
  role: AdminRole
  judge_role?: 'REGULAR' | 'GUEST_NEUTRAL'
  assigned_round_ids?: number[]
  scope: 'staff'
  exp: number
}

export function decodeAdminToken(token: string): AdminClaims | null {
  try {
    return decodeJwt(token) as AdminClaims
  } catch {
    return null
  }
}

export function canAccess(role: AdminRole, ...allowed: AdminRole[]): boolean {
  return allowed.includes(role)
}

export const ROLE_LABELS: Record<AdminRole, string> = {
  SUPERADMIN: 'Super Admin',
  JUDGE: 'Judge',
  MODERATOR: 'Moderator',
}
