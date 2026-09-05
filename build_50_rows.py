import os
import base64
import subprocess
from PIL import Image
import io

print("Preparing 50-row roster...")

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

def make_rows(start, end):
    rows_html = ""
    for i in range(start, end + 1):
        bg = 'style="background-color: #f8fafc;"' if i % 2 == 0 else ''
        rows_html += f'''
        <tr {bg}>
          <td style="text-align: center; font-weight: 700; color: #334155;">{i}</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td style="text-align: center;"><span class="check-box"></span></td>
        </tr>'''
    return rows_html

rows_p1 = make_rows(1, 25)
rows_p2 = make_rows(26, 50)

html_50 = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Musabaqa 2026 — 50-Madaris Master Intake Roster</title>
<link href="https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&family=Cinzel:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
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
    --border-dark: #475569;
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
    font-size: 9px;
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
    border: 1.6px solid var(--emerald);
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
    grid-template-columns: 65px 1fr 130px;
    align-items: center;
    gap: 8px;
    border-bottom: 1.2px solid var(--gold);
    padding-bottom: 2px;
  }}

  .bismillah {{
    font-family: 'Amiri', serif;
    font-size: 11.5px;
    color: var(--emerald);
    font-weight: 700;
    line-height: 1;
  }}

  .org-title-en {{
    font-family: 'Cinzel', serif;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 1px;
    color: var(--emerald-dark);
  }}

  .org-title-ar {{
    font-family: 'Amiri', serif;
    font-size: 12px;
    font-weight: 700;
    color: var(--gold);
    line-height: 1;
  }}

  .competition-title {{
    font-size: 8px;
    font-weight: 700;
    color: var(--charcoal);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }}

  .ref-pill {{
    border: 1px solid var(--border-dark);
    border-radius: 3px;
    padding: 1.5px 5px;
    text-align: right;
    background: #ffffff;
  }}

  .meta-bar {{
    display: flex;
    justify-content: space-between;
    background: var(--emerald-light);
    border: 1px solid var(--border-line);
    border-radius: 3px;
    padding: 1.5px 6px;
    font-size: 7.5px;
    font-weight: 600;
    margin-top: 2px;
    margin-bottom: 2px;
  }}

  .roster-table {{
    width: 100%;
    border-collapse: collapse;
    font-size: 7.5px;
  }}

  .roster-table th {{
    background: var(--emerald);
    color: #ffffff;
    border: 1px solid #14532d;
    padding: 2.2px 3px;
    text-align: left;
    font-weight: 700;
    text-transform: uppercase;
    font-size: 6.8px;
    letter-spacing: 0.2px;
  }}

  .roster-table td {{
    border: 1px solid var(--border-line);
    padding: 1px 3px;
    vertical-align: middle;
    height: 5.75mm;
  }}

  .check-box {{
    width: 9px;
    height: 9px;
    border: 1.1px solid var(--border-dark);
    border-radius: 2px;
    display: inline-block;
    background: #ffffff;
  }}

  .sub-note {{
    font-size: 5.5px;
    color: #cbd5e1;
    font-weight: normal;
    display: block;
  }}

  .footer-note {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 6.5px;
    color: var(--muted);
    border-top: 1px solid var(--border-line);
    padding-top: 1.5px;
    margin-top: 1.5px;
  }}
</style>
</head>
<body>

  <!-- ==================== PAGE 1: ROWS 01 - 25 ==================== -->
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
            <img src="data:image/png;base64,{b64_logo}" alt="Jamia Mosque Logo" style="max-height: 42px; max-width: 58px; object-fit: contain;">
          </div>
          <div style="text-align: center;">
            <div class="bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
            <div class="org-title-en">JAMIA MOSQUE COMMITTEE NAIROBI — MUSABAQA 2026</div>
            <div class="org-title-ar">مسابقة القرآن الكريم السنوية — سجل حصر وتسجيل المدارس القرآنية (كشف الـ ٥٠ مؤسسة)</div>
            <div class="competition-title">MASTER 50-MADARIS FIELD INTAKE ROSTER • PART 1 (ENTRIES 01 — 25)</div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 2px;">
            <div class="ref-pill">
              <span style="font-size: 6px; text-transform: uppercase; color: #64748b;">Roster Ref</span><br>
              <strong style="font-family: 'JetBrains Mono'; font-size: 7.5px;">ROSTER-50 / P1</strong>
            </div>
            <div class="ref-pill">
              <span style="font-size: 6px; text-transform: uppercase; color: #64748b;">Sheet Range</span><br>
              <strong style="font-family: 'JetBrains Mono'; font-size: 7.5px; color: var(--emerald);">Madaris 01 — 25</strong>
            </div>
          </div>
        </header>

        <div class="meta-bar">
          <div>Event / Gathering: <span style="border-bottom: 1px solid var(--border-dark); display:inline-block; min-width: 130px;">&nbsp;Madaris Leaders Gathering</span></div>
          <div>Intake Desk Officer: <span style="border-bottom: 1px solid var(--border-dark); display:inline-block; min-width: 120px;">&nbsp;</span></div>
          <div>Target Area / Region: <span style="border-bottom: 1px solid var(--border-dark); display:inline-block; min-width: 110px;">&nbsp;Nairobi & Environs</span></div>
          <div>Date: <span style="border-bottom: 1px solid var(--border-dark); display:inline-block; min-width: 70px;">&nbsp;____/____/2026</span></div>
          <div>Page: <strong>Sheet 1 of 2</strong></div>
        </div>

        <table class="roster-table">
          <thead>
            <tr>
              <th style="width: 20px; text-align: center;">#</th>
              <th style="width: 24%;">Madrasa / Institution Official Name<span class="sub-note">اسم المدرسة / المركز القرآني</span></th>
              <th style="width: 14%;">County & Area / Estate<span class="sub-note">المحافظة / الحي (e.g. Eastleigh)</span></th>
              <th style="width: 15%;">Headteacher / Mudir<span class="sub-note">اسم المدير / المشرف</span></th>
              <th style="width: 15%;">Mobile & WhatsApp No.<span class="sub-note">الهاتف والواتساب (+254)</span></th>
              <th style="width: 20%;">Official Email (Portal Login)<span class="sub-note">البريد الإلكتروني لحساب المنصة</span></th>
              <th style="width: 7%; text-align: center;">Students<span class="sub-note">الطلاب</span></th>
              <th style="width: 5%; text-align: center;">Entered<span class="sub-note">[✓]</span></th>
            </tr>
          </thead>
          <tbody>
            {rows_p1}
          </tbody>
        </table>

        <div class="footer-note">
          <span>* All verified entries are transferred directly to <strong>musabaqa-admin</strong> database for institution onboarding and portal access.</span>
          <span>Desk Officer Signature: ___________________________ Date: ____/____/2026</span>
          <span>Musabaqa 2026 • 50-Madaris Master Intake • Sheet 1 of 2</span>
        </div>
      </div>
    </div>
  </div>

  <!-- ==================== PAGE 2: ROWS 26 - 50 ==================== -->
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
            <img src="data:image/png;base64,{b64_logo}" alt="Jamia Mosque Logo" style="max-height: 42px; max-width: 58px; object-fit: contain;">
          </div>
          <div style="text-align: center;">
            <div class="bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
            <div class="org-title-en">JAMIA MOSQUE COMMITTEE NAIROBI — MUSABAQA 2026</div>
            <div class="org-title-ar">مسابقة القرآن الكريم السنوية — سجل حصر وتسجيل المدارس القرآنية (تابع)</div>
            <div class="competition-title">MASTER 50-MADARIS FIELD INTAKE ROSTER • PART 2 (ENTRIES 26 — 50)</div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 2px;">
            <div class="ref-pill">
              <span style="font-size: 6px; text-transform: uppercase; color: #64748b;">Roster Ref</span><br>
              <strong style="font-family: 'JetBrains Mono'; font-size: 7.5px;">ROSTER-50 / P2</strong>
            </div>
            <div class="ref-pill">
              <span style="font-size: 6px; text-transform: uppercase; color: #64748b;">Sheet Range</span><br>
              <strong style="font-family: 'JetBrains Mono'; font-size: 7.5px; color: var(--emerald);">Madaris 26 — 50</strong>
            </div>
          </div>
        </header>

        <div class="meta-bar">
          <div>Event / Gathering: <span style="border-bottom: 1px solid var(--border-dark); display:inline-block; min-width: 130px;">&nbsp;Madaris Leaders Gathering</span></div>
          <div>Intake Desk Officer: <span style="border-bottom: 1px solid var(--border-dark); display:inline-block; min-width: 120px;">&nbsp;</span></div>
          <div>Total Madaris Collected on this Sheet: <span style="border-bottom: 1px solid var(--border-dark); display:inline-block; min-width: 40px;">&nbsp;</span> / 25</div>
          <div>Grand Total (Sheets 1 & 2): <span style="border-bottom: 1px solid var(--border-dark); display:inline-block; min-width: 40px;">&nbsp;</span> / 50</div>
          <div>Page: <strong>Sheet 2 of 2</strong></div>
        </div>

        <table class="roster-table">
          <thead>
            <tr>
              <th style="width: 20px; text-align: center;">#</th>
              <th style="width: 24%;">Madrasa / Institution Official Name<span class="sub-note">اسم المدرسة / المركز القرآني</span></th>
              <th style="width: 14%;">County & Area / Estate<span class="sub-note">المحافظة / الحي (e.g. Eastleigh)</span></th>
              <th style="width: 15%;">Headteacher / Mudir<span class="sub-note">اسم المدير / المشرف</span></th>
              <th style="width: 15%;">Mobile & WhatsApp No.<span class="sub-note">الهاتف والواتساب (+254)</span></th>
              <th style="width: 20%;">Official Email (Portal Login)<span class="sub-note">البريد الإلكتروني لحساب المنصة</span></th>
              <th style="width: 7%; text-align: center;">Students<span class="sub-note">الطلاب</span></th>
              <th style="width: 5%; text-align: center;">Entered<span class="sub-note">[✓]</span></th>
            </tr>
          </thead>
          <tbody>
            {rows_p2}
          </tbody>
        </table>

        <div class="footer-note">
          <span>* All verified entries are transferred directly to <strong>musabaqa-admin</strong> database for institution onboarding and portal access.</span>
          <span>Secretariat Lead Endorsement: ___________________________ Signature: ___________________________</span>
          <span>Musabaqa 2026 • 50-Madaris Master Intake • Sheet 2 of 2</span>
        </div>
      </div>
    </div>
  </div>

</body>
</html>
'''

with open('/home/khalfan/Desktop/roster_50_rows_landscape.html', 'w', encoding='utf-8') as f:
    f.write(html_50)

print("Compiling 50-row PDF via Chromium...")
cmd_pdf = [
    'chromium', '--headless', '--disable-gpu', '--no-sandbox',
    '--print-to-pdf=/home/khalfan/Desktop/Madrasa_50_Rows_Intake_Roster_A4.pdf',
    '/home/khalfan/Desktop/roster_50_rows_landscape.html'
]
subprocess.run(cmd_pdf, check=True)
print("Generated: /home/khalfan/Desktop/Madrasa_50_Rows_Intake_Roster_A4.pdf")

# Sync to admin and web
for base_dir in ['/home/khalfan/Desktop/musabaqa-admin/public/forms', '/home/khalfan/Desktop/musabaqa-web/public/forms']:
    os.makedirs(base_dir, exist_ok=True)
    subprocess.run(['cp', '/home/khalfan/Desktop/Madrasa_50_Rows_Intake_Roster_A4.pdf', f'{base_dir}/'], check=True)
    subprocess.run(['cp', '/home/khalfan/Desktop/roster_50_rows_landscape.html', f'{base_dir}/'], check=True)

print("50-row roster complete!")
