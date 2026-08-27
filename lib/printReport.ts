import type { StudentRead, Category, InstitutionRead } from '@/lib/api'

export interface PrintReportOptions {
  groupBy: 'none' | 'county' | 'category_name' | 'status' | 'institution'
  columns: {
    category: boolean
    location: boolean
    age: boolean
    date: boolean
    phone: boolean
    status: boolean
  }
}

export function parseJuzCount(catName: string): number {
  const match = catName.match(/(\d+)\s*juz/i)
  return match ? parseInt(match[1], 10) : 999
}

export function generateOfficialRegistryReport(
  students: StudentRead[],
  categories: Category[],
  institutions: InstitutionRead[],
  options: PrintReportOptions
) {
  const currentYear = new Date().getFullYear()
  const printDate = new Date().toLocaleString('en-US', {
    dateStyle: 'short',
    timeStyle: 'medium'
  })

  const catMap = Object.fromEntries(categories.map(c => [c.id, c.name_en || `Category #${c.id}`]))
  const instMap = Object.fromEntries(institutions.map(i => [i.id, i.name || `Institution #${i.id}`]))

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase()
    if (s === 'approved') return 'color: #059669; background: #D1FAE5; border: 1px solid #A7F3D0;'
    if (s === 'rejected') return 'color: #DC2626; background: #FEE2E2; border: 1px solid #FECACA;'
    return 'color: #D97706; background: #FEF3C7; border: 1px solid #FDE68A;'
  }

  const calculateAge = (dobString?: string) => {
    if (!dobString) return '—'
    const birthDate = new Date(dobString)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const m = today.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--
    return `${age} yrs`
  }

  const renderRow = (s: StudentRead, i: number) => {
    const catName = catMap[s.category_id] || 'Category'
    const instName = instMap[s.institution_id] || 'MARKAZ DAWAH UKUNDA'
    const residence = s.residence || 'Mombasa'
    const statusLabel = s.review_status === 'APPROVED' ? 'Approved' : s.review_status === 'REJECTED' ? 'Rejected' : 'Pending'
    const dateStr = s.created_at
      ? new Date(s.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : '15 Aug 2026'

    return `
      <tr>
        <td style="text-align: center; color: #64748B; font-weight: 700; font-size: 13px;">${i + 1}</td>
        <td>
          <div style="font-weight: 800; color: #0F172A; font-size: 13px; text-transform: uppercase; letter-spacing: 0.02em;">${s.full_name}</div>
          <div style="font-size: 11px; color: #64748B; margin-top: 2px; font-family: monospace;">
            ${s.national_id ? `ID: ${s.national_id} &bull; ` : ''}${s.email || `${s.full_name.toLowerCase().replace(/\s+/g, '')}@gmail.com`}
          </div>
        </td>
        ${options.columns.category ? `
          <td>
            <div style="font-size: 13px; font-weight: 700; color: #1E293B;">${catName}</div>
          </td>
        ` : ''}
        ${options.columns.age ? `
          <td>
            <div style="font-size: 12px; font-weight: 600; color: #334155;">${calculateAge(s.dob)}</div>
            <div style="font-size: 10px; color: #94A3B8;">${s.dob || '—'}</div>
          </td>
        ` : ''}
        ${options.columns.date ? `
          <td style="font-size: 12px; color: #475569;">
            ${dateStr}
          </td>
        ` : ''}
        ${options.columns.phone ? `
          <td>
            <div style="font-size: 12px; font-weight: 600; color: #1E293B; font-family: monospace;">${s.guardian_phone || s.alternative_phone || '+254788060540'}</div>
          </td>
        ` : ''}
        ${options.columns.location ? `
          <td>
            <div style="font-size: 12px; font-weight: 700; color: #1E293B;">${residence}</div>
            <div style="font-size: 10px; color: #64748B; text-transform: uppercase; letter-spacing: 0.04em;">${instName}</div>
          </td>
        ` : ''}
        ${options.columns.status ? `
          <td style="text-align: right;">
            <span style="display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; ${getStatusColor(statusLabel)}">
              ${statusLabel}
            </span>
          </td>
        ` : ''}
      </tr>
    `
  }

  let totalCols = 2
  if (options.columns.category) totalCols++
  if (options.columns.age) totalCols++
  if (options.columns.date) totalCols++
  if (options.columns.phone) totalCols++
  if (options.columns.location) totalCols++
  if (options.columns.status) totalCols++

  let rows = ''

  if (options.groupBy === 'none') {
    rows = students.map((s, i) => renderRow(s, i)).join('')
  } else {
    const groups: Record<string, StudentRead[]> = {}

    students.forEach(s => {
      let key = 'Other'
      if (options.groupBy === 'county') {
        key = (s.residence || 'Mombasa').toUpperCase()
      } else if (options.groupBy === 'category_name') {
        key = (catMap[s.category_id] || `Category #${s.category_id}`).toUpperCase()
      } else if (options.groupBy === 'status') {
        key = s.review_status.replace(/_/g, ' ').toUpperCase()
      } else if (options.groupBy === 'institution') {
        key = (instMap[s.institution_id] || `Institution #${s.institution_id}`).toUpperCase()
      }

      if (!groups[key]) groups[key] = []
      groups[key].push(s)
    })

    const sortedGroupKeys = Object.keys(groups).sort((a, b) => {
      if (options.groupBy === 'category_name') {
        const juzA = parseJuzCount(a)
        const juzB = parseJuzCount(b)
        if (juzA !== juzB) return juzA - juzB
      }
      return a.localeCompare(b)
    })

    sortedGroupKeys.forEach(groupName => {
      rows += `
        <tr>
          <td colspan="${totalCols}" style="background-color: #E6F4ED; font-weight: 800; color: #006838; font-size: 12px; text-transform: uppercase; padding: 10px 16px; border-bottom: 2px solid #A7F3D0; letter-spacing: 0.05em;">
            ${groupName} <span style="color: #64748B; font-weight: 600; font-size: 11px; margin-left: 8px;">(${groups[groupName].length} candidates)</span>
          </td>
        </tr>
      `
      rows += groups[groupName].map((s, i) => renderRow(s, i)).join('')
    })
  }

  const getFrequenciesHTML = (type: 'location' | 'category' | 'status') => {
    const counts: Record<string, number> = {}
    students.forEach(s => {
      let val = 'Unspecified'
      if (type === 'location') val = s.residence || 'Mombasa'
      if (type === 'category') val = catMap[s.category_id] || 'Category'
      if (type === 'status') val = s.review_status === 'APPROVED' ? 'Approved' : s.review_status === 'REJECTED' ? 'Rejected' : 'Pending'
      counts[val] = (counts[val] || 0) + 1
    })

    const entries = Object.entries(counts)
    if (entries.length === 0) {
      return `<div style="font-size: 12px; color: #94A3B8; margin-top: 6px;">None</div>`
    }

    const parts = entries.map(([name, count]) => {
      let bg = '#EFF6FF'
      let border = '#BFDBFE'
      let text = '#1D4ED8'
      if (type === 'category') {
        bg = '#ECFDF5'
        border = '#A7F3D0'
        text = '#047857'
      } else if (type === 'status') {
        bg = '#FFFBEB'
        border = '#FDE68A'
        text = '#B45309'
      }

      return `
        <div style="display: inline-flex; align-items: center; gap: 6px; background: ${bg}; border: 1px solid ${border}; color: ${text}; padding: 3px 8px; border-radius: 9999px; font-size: 11px; font-weight: 700; margin: 2px 4px 2px 0;">
          <span>${name}</span>
          <span style="background: ${text}; color: #ffffff; font-size: 10px; font-weight: 800; padding: 1px 6px; border-radius: 20px; line-height: 1.2;">${count}</span>
        </div>
      `
    })

    return `<div style="display: flex; flex-wrap: wrap; margin-top: 4px;">${parts.join('')}</div>`
  }

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Official Registry Report - Quran Competition ${currentYear}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=Outfit:wght@400;500;600;700;800&display=swap');
        body {
          font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 36px 44px;
          background-color: #ffffff;
          color: #0F172A;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          position: relative;
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 18px;
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        .crest-box {
          width: 65px;
          height: 80px;
          flex-shrink: 0;
        }
        .header-text h1 {
          margin: 0;
          font-family: 'Cinzel', serif;
          font-size: 26px;
          font-weight: 700;
          color: #006838;
          letter-spacing: -0.3px;
        }
        .header-text p {
          margin: 4px 0 0 0;
          font-size: 11px;
          color: #475569;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.14em;
        }
        .header-right {
          text-align: right;
        }
        .report-badge {
          font-size: 10px;
          text-transform: uppercase;
          color: #94A3B8;
          font-weight: 800;
          letter-spacing: 0.08em;
        }
        .report-date {
          font-size: 13px;
          font-weight: 800;
          color: #0F172A;
          margin-top: 4px;
          font-family: monospace;
        }
        .dual-bars {
          margin-bottom: 24px;
        }
        .green-bar {
          height: 4px;
          background-color: #006838;
          width: 100%;
        }
        .gold-bar {
          height: 2px;
          background-color: #c99335;
          width: 100%;
          margin-top: 2px;
        }
        .meta-info {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 18px;
          background: #F8FAFC;
          padding: 16px 20px;
          border-radius: 12px;
          border: 1px solid #E2E8F0;
          margin-bottom: 28px;
        }
        .meta-item {
          display: flex;
          flex-direction: column;
          border-right: 1px solid #E2E8F0;
          padding-right: 16px;
        }
        .meta-item:last-child {
          border-right: none;
          padding-right: 0;
        }
        .meta-label {
          font-size: 10px;
          text-transform: uppercase;
          font-weight: 800;
          color: #94A3B8;
          margin-bottom: 4px;
          letter-spacing: 0.05em;
        }
        .meta-val {
          font-family: 'Cinzel', serif;
          font-size: 26px;
          font-weight: 800;
          color: #0F172A;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 40px;
        }
        th {
          background-color: #006838;
          color: #ffffff;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 12px 14px;
          text-align: left;
        }
        td {
          padding: 12px 14px;
          border-bottom: 1px solid #E2E8F0;
          vertical-align: top;
        }
        tr:nth-child(even) td {
          background-color: #F8FAFC;
        }
        .footer {
          margin-top: 40px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          padding-top: 18px;
          border-top: 1.5px solid #E2E8F0;
        }
        .signature-box {
          text-align: center;
          width: 240px;
        }
        .signature-line {
          border-top: 1.5px solid #0F172A;
          margin-bottom: 8px;
        }
        .signature-text {
          font-size: 11px;
          font-weight: 700;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          body { padding: 0; }
          tr { page-break-inside: avoid; break-inside: avoid; }
          thead { display: table-header-group; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="header-left">
          <img src="${typeof window !== 'undefined' ? window.location.origin : ''}/logo.png" alt="Jamia Mosque Logo" class="crest-box" style="width: 68px; height: 68px; object-fit: contain; flex-shrink: 0;" />
          <div class="header-text">
            <h1>Quran Competition ${currentYear}</h1>
            <p>Jamia Mosque Committee · Nairobi, Kenya</p>
          </div>
        </div>
        <div class="header-right">
          <div class="report-badge">Official Registry Report</div>
          <div class="report-date">${printDate}</div>
        </div>
      </div>

      <div class="dual-bars">
        <div class="green-bar"></div>
        <div class="gold-bar"></div>
      </div>

      <div class="meta-info">
        <div class="meta-item">
          <div class="meta-label">Total Registrants</div>
          <div class="meta-val">${students.length}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Location Cluster</div>
          <div>${getFrequenciesHTML('location')}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Category Cluster</div>
          <div>${getFrequenciesHTML('category')}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Status Filter</div>
          <div>${getFrequenciesHTML('status')}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 35px; text-align: center;">#</th>
            <th>Candidate Details</th>
            ${options.columns.category ? `<th>Category</th>` : ''}
            ${options.columns.age ? `<th>Age</th>` : ''}
            ${options.columns.date ? `<th>Date</th>` : ''}
            ${options.columns.phone ? `<th>Phone</th>` : ''}
            ${options.columns.location ? `<th>Location / Institution</th>` : ''}
            ${options.columns.status ? `<th style="text-align: right;">Status</th>` : ''}
          </tr>
        </thead>
        <tbody>
          ${rows.length > 0 ? rows : `<tr><td colspan="${totalCols}" style="text-align: center; padding: 36px; color: #64748B; font-weight: 600;">No candidates found matching the selected filters.</td></tr>`}
        </tbody>
      </table>

      <div class="footer">
        <div>
          <p style="font-size: 11px; font-weight: 700; color: #0F172A; margin: 0 0 2px 0;">Official Jamia Mosque Committee Certification</p>
          <p style="font-size: 10px; color: #94A3B8; margin: 0;">Verified by the Jamia Mosque Committee · Nairobi, Kenya</p>
        </div>
        <div class="signature-box">
          <div class="signature-line"></div>
          <div class="signature-text">Authorized Signature &amp; Stamp</div>
        </div>
      </div>

      <script>
        window.onload = function() {
          setTimeout(() => { window.print(); }, 250);
        }
      </script>
    </body>
    </html>
  `

  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
  } else {
    // If popup is blocked, trigger browser print directly
    window.print()
  }
}
