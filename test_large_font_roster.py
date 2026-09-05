import os
import base64
import subprocess
from PIL import Image
import io

# 1. Logo
img = Image.open('/home/khalfan/Desktop/musabaqa-web/public/images/jamia_logo.png')
new_w = 480
new_h = int(new_w * img.height / img.width)
resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
buf = io.BytesIO()
resized.save(buf, format='PNG', optimize=True)
b64_logo = base64.b64encode(buf.getvalue()).decode('utf-8')

# 2. Watermark
wm = Image.open('/home/khalfan/Desktop/musabaqa-web/public/images/watermark.png')
wm_w = 420
wm_h = int(wm_w * wm.height / wm.width)
wm_resized = wm.resize((wm_w, wm_h), Image.Resampling.LANCZOS)
buf_wm = io.BytesIO()
wm_resized.save(buf_wm, format='PNG', optimize=True)
b64_watermark = base64.b64encode(buf_wm.getvalue()).decode('utf-8')

pages_data = [
    (1, 1, 13),
    (2, 14, 26),
    (3, 27, 38),
    (4, 39, 50),
]

def make_rows(start, end):
    rows_html = ""
    for i in range(start, end + 1):
        bg = 'style="background-color: #f8fafc;"' if i % 2 == 0 else ''
        rows_html += f'''
        <tr {bg}>
          <td class="col-num">{i}</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td style="text-align: center;"><span class="check-box"></span></td>
        </tr>'''
    return rows_html

pages_html = ""
for page_num, start, end in pages_data:
    rows = make_rows(start, end)
    is_last = (page_num == 4)
    footer_extra = "Secretariat Lead Endorsement: ___________________________ Signature: ___________________________" if is_last else "Desk Officer Signature: ___________________________ Date: ____/____/2026"
    meta_extra = f'<div>Sheet Total: <span style="border-bottom: 1.2px solid var(--border-dark); display:inline-block; min-width: 40px;">&nbsp;</span> / {end - start + 1}</div>' if not is_last else f'<div>Grand Total: <strong style="color:var(--emerald);">&nbsp;____ / 50</strong></div>'
    
    pages_html += f'''
  <!-- ==================== PAGE {page_num}: ROWS {start:02d} - {end:02d} ==================== -->
  <div class="sheet-page">
    <img src="data:image/png;base64,{b64_watermark}" class="watermark-bg" alt="Watermark">
    <div class="sheet-content">
      <div class="frame-border">
        <div class="corner-ornament corner-tl"></div>
        <div class="corner-ornament corner-tr"></div>
        <div class="corner-ornament corner-bl"></div>
        <div class="corner-ornament corner-br"></div>

        <header class="roster-header">
          <div style="display: flex; align-items: center; justify-content: center;">
            <img src="data:image/png;base64,{b64_logo}" alt="Jamia Mosque Logo" style="max-height: 48px; max-width: 65px; object-fit: contain;">
          </div>
          <div style="text-align: center;">
            <div class="bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
            <div class="org-title-en">JAMIA MOSQUE COMMITTEE NAIROBI — MUSABAQA 2026</div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 2.5px;">
            <div class="ref-pill">
              <span class="ref-label">Roster Ref</span><br>
              <strong class="ref-val">ROSTER-50 / P{page_num}</strong>
            </div>
            <div class="ref-pill">
              <span class="ref-label">Sheet Range</span><br>
              <strong class="ref-val" style="color: var(--emerald);">Madaris {start:02d} — {end:02d}</strong>
            </div>
          </div>
        </header>

        <div class="meta-bar">
          <div>Event: <span class="meta-line" style="min-width: 140px;">&nbsp;</span></div>
          <div>Intake Desk Officer: <span class="meta-line" style="min-width: 130px;">&nbsp;</span></div>
          <div>Target Area / Region: <span class="meta-line" style="min-width: 120px;">&nbsp;Nairobi & Environs</span></div>
          <div>Date: <span class="meta-line" style="min-width: 80px;">&nbsp;____/____/2026</span></div>
          {meta_extra}
          <div>Page: <strong>Sheet {page_num} of 4</strong></div>
        </div>

        <table class="roster-table">
          <thead>
            <tr>
              <th style="width: 28px; text-align: center;">#</th>
              <th style="width: 23%;">Madrasa / Institution Official Name<span class="sub-note">اسم المدرسة / المركز القرآني</span></th>
              <th style="width: 14%;">County & Area / Estate<span class="sub-note">المحافظة / الحي (e.g. Eastleigh)</span></th>
              <th style="width: 16%;">Headteacher / Mudir<span class="sub-note">اسم المدير / المشرف</span></th>
              <th style="width: 15%;">Mobile & WhatsApp No.<span class="sub-note">الهاتف والواتساب (+254)</span></th>
              <th style="width: 19%;">Official Email (Portal Login)<span class="sub-note">البريد الإلكتروني لحساب المنصة</span></th>
              <th style="width: 8%; text-align: center;">Students<span class="sub-note">الطلاب</span></th>
              <th style="width: 5%; text-align: center;">Entered<span class="sub-note">[✓]</span></th>
            </tr>
          </thead>
          <tbody>
            {rows}
          </tbody>
        </table>

        <div class="footer-note">
          <span>* All verified entries are transferred directly to <strong>musabaqa-admin</strong> database for institution onboarding and portal access.</span>
          <span>{footer_extra}</span>
          <span>Musabaqa 2026 • 50-Madaris Master Intake • Sheet {page_num} of 4</span>
        </div>
      </div>
    </div>
  </div>
'''

html_large = f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Musabaqa 2026 — 50-Madaris Master Intake Roster</title>
  <link href="https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&family=Cinzel:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {{
      --gold: #b38226;
      --gold-light: #fdfaf3;
      --gold-border: #d4af37;
      --emerald: #0f3b28;
      --emerald-dark: #072317;
      --emerald-light: #f2f8f5;
      --charcoal: #1e293b;
      --ink: #0f172a;
      --muted: #64748b;
      --border-line: #cbd5e1;
      --border-dark: #334155;
    }}

    * {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }}

    body {{
      background-color: #ffffff;
      color: var(--ink);
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 11px;
    }}

    @page {{
      size: A4 landscape;
      margin: 4mm 5mm;
    }}

    .sheet-page {{
      width: 100%;
      height: 100%;
      max-height: 200mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      page-break-after: always;
      break-after: page;
      overflow: hidden;
    }}

    .sheet-page:last-child {{
      page-break-after: avoid;
      break-after: avoid;
    }}

    .watermark-bg {{
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 45%;
      opacity: 0.035;
      pointer-events: none;
      z-index: 0;
    }}

    .sheet-content {{
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      height: 100%;
      justify-content: space-between;
    }}

    .frame-border {{
      border: 1.8px solid var(--emerald);
      border-radius: 4px;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      background: #ffffff;
      padding: 3mm 4.5mm;
    }}

    .frame-border::before {{
      content: "";
      position: absolute;
      inset: 2px;
      border: 0.8px solid var(--gold);
      border-radius: 2px;
      pointer-events: none;
    }}

    .corner-ornament {{
      position: absolute;
      width: 12px;
      height: 12px;
      pointer-events: none;
    }}

    .corner-tl {{ top: 4px; left: 4px; border-top: 2px solid var(--gold); border-left: 2px solid var(--gold); }}
    .corner-tr {{ top: 4px; right: 4px; border-top: 2px solid var(--gold); border-right: 2px solid var(--gold); }}
    .corner-bl {{ bottom: 4px; left: 4px; border-bottom: 2px solid var(--gold); border-left: 2px solid var(--gold); }}
    .corner-br {{ bottom: 4px; right: 4px; border-bottom: 2px solid var(--gold); border-right: 2px solid var(--gold); }}

    .roster-header {{
      display: grid;
      grid-template-columns: 75px 1fr 140px;
      align-items: center;
      gap: 10px;
      border-bottom: 1.5px solid var(--gold);
      padding-bottom: 3px;
    }}

    .bismillah {{
      font-family: 'Amiri', serif;
      font-size: 15px;
      color: var(--emerald);
      font-weight: 700;
      line-height: 1.1;
      margin-bottom: 1px;
    }}

    .org-title-en {{
      font-family: 'Cinzel', serif;
      font-size: 13.5px;
      font-weight: 800;
      letter-spacing: 1.2px;
      color: var(--emerald-dark);
    }}

    .ref-pill {{
      border: 1px solid var(--border-dark);
      border-radius: 3px;
      padding: 2px 6px;
      text-align: right;
      background: #ffffff;
    }}

    .ref-label {{
      font-size: 7px;
      text-transform: uppercase;
      font-weight: 700;
      color: var(--muted);
      letter-spacing: 0.5px;
    }}

    .ref-val {{
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
      font-weight: 700;
      color: var(--charcoal);
    }}

    .meta-bar {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--emerald-light);
      border: 1px solid var(--border-line);
      border-radius: 3px;
      padding: 3px 8px;
      font-size: 9.5px;
      font-weight: 600;
      margin-top: 2.5px;
      margin-bottom: 2.5px;
    }}

    .meta-line {{
      border-bottom: 1.2px solid var(--border-dark);
      display: inline-block;
    }}

    .roster-table {{
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5px;
    }}

    .roster-table th {{
      background: var(--emerald);
      color: #ffffff;
      border: 1px solid #14532d;
      padding: 4.5px 5px;
      text-align: left;
      font-weight: 800;
      text-transform: uppercase;
      font-size: 8.5px;
      letter-spacing: 0.4px;
    }}

    .roster-table td {{
      border: 1px solid var(--border-line);
      padding: 2px 5px;
      vertical-align: middle;
      height: 9.6mm;
    }}

    .col-num {{
      text-align: center;
      font-weight: 800;
      font-size: 11.5px;
      color: #0f172a;
      font-family: 'Plus Jakarta Sans', sans-serif;
    }}

    .check-box {{
      width: 13px;
      height: 13px;
      border: 1.5px solid var(--border-dark);
      border-radius: 2.5px;
      display: inline-block;
      background: #ffffff;
    }}

    .sub-note {{
      font-size: 7.5px;
      color: #e2e8f0;
      font-weight: 600;
      display: block;
      font-family: 'Amiri', serif;
      margin-top: 1px;
    }}

    .footer-note {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8px;
      color: var(--muted);
      border-top: 1px solid var(--border-line);
      padding-top: 2px;
      margin-top: 2px;
    }}
  </style>
</head>
<body>
{pages_html}
</body>
</html>'''

with open('/home/khalfan/Desktop/roster_50_rows_landscape.html', 'w', encoding='utf-8') as f:
    f.write(html_large)

print('Generated updated 4-page HTML with large visible fonts!')

cmd_pdf = [
    'chromium', '--headless', '--disable-gpu', '--no-sandbox',
    '--print-to-pdf=/home/khalfan/Desktop/Madrasa_50_Rows_Intake_Roster_A4.pdf',
    '/home/khalfan/Desktop/roster_50_rows_landscape.html'
]
subprocess.run(cmd_pdf, check=True)
print('Recompiled PDF: /home/khalfan/Desktop/Madrasa_50_Rows_Intake_Roster_A4.pdf')

