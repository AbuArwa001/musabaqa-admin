// Typed API client for musabaqa-api (admin surface)
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const url = `${API_URL}${path}`
  const res = await fetch(url, { ...options, headers, cache: 'no-store' })

  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      detail = body.detail || detail
    } catch {}
    
    // Auto redirect to login on token expiration
    if (res.status === 401 && typeof window !== 'undefined') {
      fetch('/api/logout', { method: 'POST' }).finally(() => {
        window.location.href = '/en/login'
      })
    }
    
    throw new ApiError(res.status, detail)
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface TokenResponse { access_token: string; scope: string }

export async function loginStaff(email: string, password: string): Promise<TokenResponse> {
  const body = new URLSearchParams({ username: email, password })
  const res = await fetch(`${API_URL}/api/v1/auth/staff/login`, {
    method: 'POST', body,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new ApiError(res.status, err.detail || 'Login failed')
  }
  return res.json()
}

export async function refreshStaffSession(token: string): Promise<TokenResponse> {
  const res = await fetch(`${API_URL}/api/v1/auth/staff/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new ApiError(res.status, err.detail || 'Session refresh failed')
  }
  return res.json()
}

// ─── Institutions ─────────────────────────────────────────────────────────────

export interface InstitutionRead {
  id: number; name: string; type: string; contact_person: string;
  phone: string; email: string; region_id: number | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED'; rejection_reason: string | null;
  preferred_language: 'EN' | 'AR'; created_at: string; is_active: boolean;
  registration_document?: string | null;
  title_deed_document?: string | null;
  recommendation_letter?: string | null;
  contact_person_id_doc?: string | null;
  address?: string | null;
}

export async function listInstitutions(token: string, status?: string): Promise<InstitutionRead[]> {
  const qs = status ? `?status=${status}` : ''
  return request(`/api/v1/institutions/${qs}`, {}, token)
}

export async function getInstitution(token: string, id: number): Promise<InstitutionRead> {
  return request(`/api/v1/institutions/${id}`, {}, token)
}

export async function updateInstitution(token: string, id: number, data: Partial<InstitutionRead>): Promise<InstitutionRead> {
  return request(`/api/v1/institutions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, token)
}

export async function approveInstitution(token: string, id: number): Promise<InstitutionRead> {
  return request(`/api/v1/institutions/${id}/approve`, { method: 'POST' }, token)
}

export async function rejectInstitution(token: string, id: number, rejection_reason: string): Promise<InstitutionRead> {
  return request(`/api/v1/institutions/${id}/reject`, {
    method: 'POST', body: JSON.stringify({ rejection_reason })
  }, token)
}

// ─── Regions ──────────────────────────────────────────────────────────────────

export interface Region { id: number; name_en: string; name_ar: string; county_id: number }
export interface County { id: number; name: string; active?: boolean }

export async function listRegions(): Promise<Region[]> { return request('/api/v1/regions') }
export async function createRegion(token: string, data: { name_en: string; name_ar: string; county_id: number }): Promise<Region> {
  return request('/api/v1/regions', { method: 'POST', body: JSON.stringify(data) }, token)
}
export async function updateRegion(token: string, id: number, data: Partial<Region>): Promise<Region> {
  return request(`/api/v1/regions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, token)
}
export async function deleteRegion(token: string, id: number): Promise<void> {
  return request(`/api/v1/regions/${id}`, { method: 'DELETE' }, token)
}

export async function listCounties(): Promise<County[]> { return request('/api/v1/counties') }
export async function createCounty(token: string, data: { name: string; active?: boolean }): Promise<County> {
  return request('/api/v1/counties', { method: 'POST', body: JSON.stringify(data) }, token)
}
export async function updateCounty(token: string, id: number, data: Partial<County>): Promise<County> {
  return request(`/api/v1/counties/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, token)
}
export async function deleteCounty(token: string, id: number): Promise<void> {
  return request(`/api/v1/counties/${id}`, { method: 'DELETE' }, token)
}

export interface Category {
  id: number; name_en: string; name_ar: string;
  min_age: number | null; max_age: number; category_group: string; display_order: number
}

export async function listCategories(): Promise<Category[]> { return request('/api/v1/categories/') }

export async function createCategory(token: string, data: Partial<Category>): Promise<Category> {
  return request('/api/v1/categories/', { method: 'POST', body: JSON.stringify(data) }, token)
}

export async function updateCategory(token: string, id: number, data: Partial<Category>): Promise<Category> {
  return request(`/api/v1/categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, token)
}

// ─── Students ─────────────────────────────────────────────────────────────────

export type ReviewStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'

export interface StudentRead {
  id: number; institution_id: number; category_id: number; full_name: string;
  dob: string; gender: 'MALE' | 'FEMALE'; national_id: string; guardian_phone: string;
  photo: string | null; id_document: string | null; review_status: ReviewStatus;
  rejection_reason: string | null; is_backup: boolean; is_deleted: boolean;
  deletion_reason: string | null; archived_at: string | null;
  regret_email_sent: boolean; regret_email_sent_at: string | null; created_at: string;
  nationality?: string; residence?: string; home_county?: string; alternative_phone?: string;
  email?: string; review_notes?: string | null;
}

export async function listStudents(token: string, params?: Record<string, string>): Promise<StudentRead[]> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  return request(`/api/v1/students/${qs}`, {}, token)
}

export async function getStudent(token: string, id: number): Promise<StudentRead> {
  return request(`/api/v1/students/${id}`, {}, token)
}

export async function updateStudent(token: string, id: number, data: Partial<StudentRead>): Promise<StudentRead> {
  return request(`/api/v1/students/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, token)
}

export async function approveStudent(token: string, id: number): Promise<StudentRead> {
  return request(`/api/v1/students/${id}/approve`, { method: 'POST' }, token)
}

export async function rejectStudent(token: string, id: number, rejection_reason: string): Promise<StudentRead> {
  return request(`/api/v1/students/${id}/reject`, {
    method: 'POST', body: JSON.stringify({ rejection_reason })
  }, token)
}

export async function reassignStudentCategory(token: string, id: number, new_category_id: number, age_exemption?: boolean): Promise<StudentRead> {
  return request(`/api/v1/students/${id}/category`, {
    method: 'PATCH', body: JSON.stringify({ new_category_id, age_exemption })
  }, token)
}

export async function softDeleteStudent(token: string, id: number, deletion_reason: string): Promise<StudentRead> {
  return request(`/api/v1/students/${id}`, {
    method: 'DELETE', body: JSON.stringify({ deletion_reason })
  }, token)
}

export async function bulkSoftDeleteStudents(token: string, student_ids: number[], deletion_reason: string): Promise<StudentRead[]> {
  return request('/api/v1/students/bulk/soft-delete', {
    method: 'DELETE', body: JSON.stringify({ student_ids, deletion_reason })
  }, token)
}

export async function restoreStudent(token: string, id: number): Promise<StudentRead> {
  return request(`/api/v1/students/${id}/restore`, { method: 'POST' }, token)
}

export async function permanentDeleteStudent(token: string, id: number): Promise<void> {
  return request(`/api/v1/students/${id}/permanent`, { method: 'DELETE' }, token)
}

export async function sendRegretEmail(token: string, id: number): Promise<void> {
  return request(`/api/v1/students/${id}/regret-email`, { method: 'POST' }, token)
}

export async function getPhotoUrl(token: string, id: number): Promise<{ url: string | null }> {
  return request(`/api/v1/students/${id}/photo_url/`, {}, token)
}

export async function getDocUrl(token: string, id: number): Promise<{ url: string | null }> {
  return request(`/api/v1/students/${id}/doc_url/`, {}, token)
}

export function getStudentPdfUrl(id: number): string {
  return `${API_URL}/api/v1/students/${id}/download_pdf/`
}

export function getExportAnalyticsUrl(pivot: string = 'timeline'): string {
  return `${API_URL}/api/v1/students/export_analysis/?pivot=${pivot}`
}

export async function bulkSendRegretEmails(token: string, student_ids: number[]): Promise<void> {
  return request('/api/v1/students/bulk/regret-email', {
    method: 'POST', body: JSON.stringify({ student_ids })
  }, token)
}

export async function updateArchivalReason(token: string, id: number, deletion_reason: string): Promise<StudentRead> {
  return request(`/api/v1/students/${id}/deletion-reason`, {
    method: 'PATCH', body: JSON.stringify({ deletion_reason })
  }, token)
}

// ─── Rounds ───────────────────────────────────────────────────────────────────

export interface RoundRead {
  id: number; category_id: number; round_type: 'PRELIMINARY' | 'FINAL';
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED'; scheduled_at: string
}

export interface JudgeAssignment {
  id: number; round_id: number; admin_user_id: number;
  judge_role: 'REGULAR' | 'GUEST_NEUTRAL'
}

export async function listRounds(token: string, params?: Record<string, string>): Promise<RoundRead[]> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  return request(`/api/v1/rounds/${qs}`, {}, token)
}

export async function getRound(token: string, id: number): Promise<RoundRead> {
  return request(`/api/v1/rounds/${id}`, {}, token)
}

export async function createRound(token: string, data: { category_id: number; round_type: string; scheduled_at: string }): Promise<RoundRead> {
  return request('/api/v1/rounds/', { method: 'POST', body: JSON.stringify(data) }, token)
}

export async function getRoundJudges(token: string, roundId: number): Promise<JudgeAssignment[]> {
  return request(`/api/v1/rounds/${roundId}/judges`, {}, token)
}

export async function assignJudge(token: string, roundId: number, data: { admin_user_id: number; judge_role: string }): Promise<JudgeAssignment> {
  return request(`/api/v1/rounds/${roundId}/judges`, { method: 'POST', body: JSON.stringify(data) }, token)
}

export async function startRound(token: string, roundId: number): Promise<RoundRead> {
  return request(`/api/v1/rounds/${roundId}/start`, { method: 'POST' }, token)
}

export async function completeRound(token: string, roundId: number): Promise<RoundRead> {
  return request(`/api/v1/rounds/${roundId}/complete`, { method: 'POST' }, token)
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

export interface DeductionEventCreate {
  round_id: number; student_id: number; deduction_type_id: number;
  amount?: number; note?: string
}

export interface DeductionEventRead {
  id: number; round_id: number; student_id: number; judge_id: number;
  deduction_type_id: number; amount: number; logged_at: string;
  note: string | null; consistency_flagged: boolean
}

export interface JudgeScoreSummary {
  student_id: number; round_id: number; judge_id: number;
  per_criterion_score: Record<string, number>; total_score: number;
  all_judges_submitted: boolean; panel_score: number | null
}

export async function submitDeduction(token: string, data: DeductionEventCreate): Promise<DeductionEventRead> {
  return request('/api/v1/scoring/deductions', { method: 'POST', body: JSON.stringify(data) }, token)
}

export async function getMyScore(token: string, roundId: number, studentId: number): Promise<JudgeScoreSummary> {
  return request(`/api/v1/scoring/rounds/${roundId}/students/${studentId}/my-score`, {}, token)
}

// ─── Results ──────────────────────────────────────────────────────────────────

export interface RoundResult {
  id: number; round_id: number; student_id: number; final_score: number;
  rank: number | null; computed_at: string; consistency_flagged: boolean
}

export async function getRoundResults(token: string, roundId: number): Promise<RoundResult[]> {
  return request(`/api/v1/results/rounds/${roundId}`, {}, token)
}

// ─── Admin Users ──────────────────────────────────────────────────────────────

export interface AdminUserRead {
  id: number; name: string; email: string;
  role: 'SUPERADMIN' | 'JUDGE' | 'MODERATOR';
  judge_role: 'REGULAR' | 'GUEST_NEUTRAL' | null;
  preferred_language: 'EN' | 'AR'; active: boolean
}

export async function listAdminUsers(token: string): Promise<AdminUserRead[]> {
  return request('/api/v1/admin-users/', {}, token)
}

export async function createAdminUser(token: string, data: Partial<AdminUserRead> & { password: string }): Promise<AdminUserRead> {
  return request('/api/v1/admin-users/', { method: 'POST', body: JSON.stringify(data) }, token)
}

export async function updateAdminUser(token: string, id: number, data: Partial<AdminUserRead>): Promise<AdminUserRead> {
  return request(`/api/v1/admin-users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, token)
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: number; actor_id: number | null; action: string; module: string;
  target_record_id: number | null; ip_address: string | null;
  payload: Record<string, unknown>; created_at: string
}

export async function listAuditLogs(token: string, params?: Record<string, string>): Promise<AuditLogEntry[]> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  return request(`/api/v1/audit-logs/${qs}`, {}, token)
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export function getReportUrl(type: 'print-ready' | 'power-bi' | 'granular', params?: Record<string, string>): string {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  return `${API_URL}/api/v1/reports/${type}${qs}`
}

// ─── Bulk Dossier ─────────────────────────────────────────────────────────────

export interface BulkDossierJob {
  job_id: string; status: string; total: number; completed: number;
  failed: number; zip_url?: string; items?: Array<{ id: number; status: string; error?: string }>
}

export async function startBulkDossiers(token: string, student_ids: number[], lang?: string): Promise<{ job_id: string; status: string; total: number }> {
  return request(`/api/v1/archive/dossiers/bulk?lang=${lang || 'EN'}`, {
    method: 'POST', body: JSON.stringify(student_ids)
  }, token)
}

export async function getDossierJobStatus(token: string, jobId: string): Promise<BulkDossierJob> {
  return request(`/api/v1/archive/dossiers/jobs/${jobId}`, {}, token)
}

// ─── Competition Configuration ────────────────────────────────────────────────

export interface CompetitionConfig {
  scope: 'NATIONAL' | 'COUNTY_REGIONAL';
  reg_opening_date: string;
  reg_closing_date: string;
  prelims_start_date: string;
  prelims_end_date: string;
  finals_start_date: string;
  finals_end_date: string;
  venue_en: string;
  venue_ar: string;
  overview_en: string;
  overview_ar: string;
  category_limit: number;
  county_limit: number;
  granular_limits: Record<string, Record<string, number | 'Def'>>;
  custom_regions: Array<{ id: string; name_en: string; name_ar: string }>;
  national_rows: string[];
  county_rows: string[];
}

const DEFAULT_COMPETITION_CONFIG: CompetitionConfig = {
  scope: 'NATIONAL',
  reg_opening_date: '2026-08-13',
  reg_closing_date: '2026-09-01',
  prelims_start_date: '2026-09-05',
  prelims_end_date: '2026-09-07',
  finals_start_date: '2026-10-11',
  finals_end_date: '2026-10-13',
  venue_en: 'Jamia Mosque Nairobi, Kenya',
  venue_ar: 'مسجد جامعة نيروبي، كينيا',
  overview_en: 'The Quran Competition 2026 is an annual prestigious event organised by Jamia Mosque Committee. Open to Muslim youth across Kenya to celebrate memorisation (Hifz) and exemplary recitation (Tajweed).',
  overview_ar: 'مسابقة القرآن الكريم ٢٠٢٦ حدث سنوي مرموق تنظمه لجنة مسجد جامعة نيروبي في كينيا. مفتوحة للشباب المسلم للاحتفاء بحفظ القرآن الكريم وحسن تلاوته.',
  category_limit: 10,
  county_limit: 10,
  granular_limits: {
    'Isiolo County': { '30': 8, '20': 9, '15': 11, '5': 12 },
    'Nairobi County': { '30': 'Def', '20': 'Def', '15': 'Def', '5': 'Def' },
    'Mandera County': { '30': 'Def', '20': 'Def', '15': 'Def', '5': 'Def' },
    'Nakuru County': { '30': 8, '20': 'Def', '15': 11, '5': 11 },
    'Wajir County': { '30': 'Def', '20': 'Def', '15': 'Def', '5': 'Def' },
    'Mombasa County': { '30': 'Def', '20': 'Def', '15': 'Def', '5': 'Def' },
    'Garissa County': { '30': 11, '20': 8, '15': 9, '5': 12 },
    'Eastleigh': { '30': 10, '20': 10, '15': 12, '5': 15 },
    'Kiamaiko': { '30': 8, '20': 8, '15': 10, '5': 12 },
    'Komarock': { '30': 6, '20': 8, '15': 8, '5': 10 },
    'Kasarani': { '30': 8, '20': 8, '15': 10, '5': 10 },
    'Westlands': { '30': 'Def', '20': 'Def', '15': 'Def', '5': 'Def' },
    'Kibra': { '30': 'Def', '20': 'Def', '15': 'Def', '5': 'Def' },
    'South C': { '30': 'Def', '20': 'Def', '15': 'Def', '5': 'Def' },
    'Pangani': { '30': 'Def', '20': 'Def', '15': 'Def', '5': 'Def' },
    'Dandora': { '30': 'Def', '20': 'Def', '15': 'Def', '5': 'Def' },
    'Kayole': { '30': 'Def', '20': 'Def', '15': 'Def', '5': 'Def' },
  },
  custom_regions: [
    { id: 'eastleigh', name_en: 'Eastleigh', name_ar: 'إيستلي' },
    { id: 'kiamaiko', name_en: 'Kiamaiko', name_ar: 'كياميكو' },
    { id: 'komarock', name_en: 'Komarock', name_ar: 'كوماروك' },
    { id: 'kasarani', name_en: 'Kasarani', name_ar: 'كاساراني' },
    { id: 'westlands', name_en: 'Westlands', name_ar: 'ويستلاندز' },
    { id: 'kibra', name_en: 'Kibra', name_ar: 'كيبرا' },
  ],
  national_rows: [
    'Nairobi County', 'Mombasa County', 'Nakuru County', 'Garissa County',
    'Isiolo County', 'Mandera County', 'Wajir County', 'Kisumu County',
    'Kilifi County', 'Lamu County'
  ],
  county_rows: [
    'Eastleigh', 'Kiamaiko', 'Komarock', 'Kasarani', 'Westlands',
    'Kibra', 'South C', 'Pangani', 'Dandora', 'Kayole'
  ]
}

export function getCompetitionConfig(): CompetitionConfig {
  if (typeof window === 'undefined') return DEFAULT_COMPETITION_CONFIG
  try {
    const saved = localStorage.getItem('musabaqa_competition_config')
    if (saved) return JSON.parse(saved)
  } catch {}
  return DEFAULT_COMPETITION_CONFIG
}

export function saveCompetitionConfig(config: CompetitionConfig): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem('musabaqa_competition_config', JSON.stringify(config))
    window.dispatchEvent(new Event('storage'))
  } catch {}
}

// ─── WebSocket URL ────────────────────────────────────────────────────────────

export function getAdminWsUrl(token: string): string {
  const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/^http/, 'ws')
  return `${base}/ws/admin/live-scoring?token=${token}`
}
