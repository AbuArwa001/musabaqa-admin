import os
import base64
import subprocess
from PIL import Image
import io

print("Preparing optimized assets...")

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
wm_w = 400
wm_h = int(wm_w * wm.height / wm.width)
wm_resized = wm.resize((wm_w, wm_h), Image.Resampling.LANCZOS)
buf_wm = io.BytesIO()
wm_resized.save(buf_wm, format='PNG', optimize=True)
b64_watermark = base64.b64encode(buf_wm.getvalue()).decode('utf-8')

print("Assets ready. Constructing high-aesthetic HTML forms...")

html_content = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Musabaqa 2026 — Madaris Registration & Intake Dossier</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&family=Cinzel:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
<style>
  :root {{
    --gold: #b38226;
    --gold-light: #fbf5e8;
    --gold-border: #d4af37;
    --emerald: #0f3b28;
    --emerald-dark: #072317;
    --emerald-light: #f0f7f3;
    --charcoal: #1e293b;
    --ink: #0f172a;
    --muted: #64748b;
    --border-line: #cbd5e1;
    --border-dark: #475569;
    --bg-page: #ffffff;
    --accent-badge: #0f3b28;
  }}

  /* Monochrome theme overrides */
  body.theme-monochrome {{
    --gold: #334155;
    --gold-light: #f8fafc;
    --gold-border: #475569;
    --emerald: #0f172a;
    --emerald-dark: #000000;
    --emerald-light: #f1f5f9;
    --charcoal: #000000;
    --ink: #000000;
    --muted: #475569;
    --border-line: #94a3b8;
    --border-dark: #334155;
    --accent-badge: #1e293b;
  }}

  * {{
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }}

  body {{
    background-color: #f1f5f9;
    color: var(--ink);
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 11px;
    line-height: 1.35;
  }}

  /* SCREEN CONTROL BAR */
  .toolbar {{
    position: sticky;
    top: 0;
    z-index: 9999;
    background: #0f172a;
    color: #ffffff;
    padding: 12px 24px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.25);
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }}

  .toolbar-brand {{
    display: flex;
    align-items: center;
    gap: 12px;
  }}

  .toolbar-brand img {{
    height: 34px;
    width: auto;
    border-radius: 4px;
    background: #ffffff;
    padding: 2px 4px;
  }}

  .toolbar-brand-text h1 {{
    font-size: 15px;
    font-weight: 700;
    color: #f8fafc;
    letter-spacing: 0.5px;
    margin: 0;
  }}

  .toolbar-brand-text p {{
    font-size: 11px;
    color: #94a3b8;
    margin: 0;
  }}

  .toolbar-actions {{
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
  }}

  .btn {{
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
    border: none;
    text-decoration: none;
  }}

  .btn-gold {{
    background: linear-gradient(135deg, #d4af37 0%, #b38226 100%);
    color: #09170e;
    box-shadow: 0 2px 8px rgba(179,130,38,0.35);
  }}
  .btn-gold:hover {{
    filter: brightness(1.1);
    transform: translateY(-1px);
  }}

  .btn-emerald {{
    background: #0f3b28;
    color: #ffffff;
    border: 1px solid #22c55e;
  }}
  .btn-emerald:hover {{
    background: #14532d;
  }}

  .btn-outline {{
    background: transparent;
    color: #e2e8f0;
    border: 1px solid #475569;
  }}
  .btn-outline:hover {{
    background: #1e293b;
    border-color: #94a3b8;
  }}

  .btn-group {{
    display: inline-flex;
    background: #1e293b;
    padding: 3px;
    border-radius: 6px;
    border: 1px solid #334155;
  }}

  .btn-group .btn-pill {{
    background: transparent;
    color: #94a3b8;
    padding: 6px 12px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    border: none;
    cursor: pointer;
  }}

  .btn-group .btn-pill.active {{
    background: #334155;
    color: #ffffff;
  }}

  /* PAGE CONTAINER */
  .pages-wrapper {{
    max-width: 1020px;
    margin: 24px auto;
    padding: 0 16px 60px;
    display: flex;
    flex-direction: column;
    gap: 32px;
    align-items: center;
  }}

  /* A4 SHEET SPECIFICATIONS */
  .sheet {{
    background: #ffffff;
    box-shadow: 0 10px 35px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06);
    position: relative;
    overflow: hidden;
  }}

  /* A4 Portrait */
  .sheet-portrait {{
    width: 210mm;
    height: 297mm;
    max-height: 297mm;
    padding: 8mm 9mm 6mm;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }}

  /* A4 Landscape */
  .sheet-landscape {{
    width: 297mm;
    height: 210mm;
    max-height: 210mm;
    padding: 7mm 9mm 5mm;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }}

  /* WATERMARK */
  .watermark-bg {{
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 60%;
    opacity: 0.038;
    pointer-events: none;
    z-index: 0;
  }}

  /* SHEET CONTENT WRAPPER TO SIT ABOVE WATERMARK */
  .sheet-content {{
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    height: 100%;
    justify-content: space-between;
  }}

  /* LUXURY ISLAMIC BORDER FRAME */
  .frame-border {{
    border: 2px solid var(--emerald);
    border-radius: 4px;
    padding: 6mm 7mm;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    position: relative;
  }}

  .frame-border::before {{
    content: "";
    position: absolute;
    inset: 2px;
    border: 0.8px solid var(--gold);
    border-radius: 2px;
    pointer-events: none;
  }}

  /* CORNER ORNAMENTS */
  .corner-ornament {{
    position: absolute;
    width: 14px;
    height: 14px;
    pointer-events: none;
  }}
  .corner-tl {{ top: 4px; left: 4px; border-top: 2px solid var(--gold); border-left: 2px solid var(--gold); }}
  .corner-tr {{ top: 4px; right: 4px; border-top: 2px solid var(--gold); border-right: 2px solid var(--gold); }}
  .corner-bl {{ bottom: 4px; left: 4px; border-bottom: 2px solid var(--gold); border-left: 2px solid var(--gold); }}
  .corner-br {{ bottom: 4px; right: 4px; border-bottom: 2px solid var(--gold); border-right: 2px solid var(--gold); }}

  /* ==================== HEADER STYLES ==================== */
  .form-header {{
    display: grid;
    grid-template-columns: 85px 1fr 105px;
    align-items: center;
    gap: 10px;
    padding-bottom: 5px;
    border-bottom: 1.5px solid var(--gold);
    margin-bottom: 5px;
  }}

  .header-logo {{
    display: flex;
    align-items: center;
    justify-content: center;
  }}

  .header-logo img {{
    max-width: 82px;
    max-height: 82px;
    object-fit: contain;
  }}

  .header-titles {{
    text-align: center;
  }}

  .bismillah {{
    font-family: 'Amiri', serif;
    font-size: 15px;
    color: var(--emerald);
    font-weight: 700;
    line-height: 1.1;
    margin-bottom: 1px;
    letter-spacing: 0.5px;
  }}

  .org-title-en {{
    font-family: 'Cinzel', serif;
    font-size: 12.5px;
    font-weight: 800;
    letter-spacing: 1.2px;
    color: var(--emerald-dark);
    margin-bottom: 0px;
  }}

  .org-title-ar {{
    font-family: 'Amiri', serif;
    font-size: 14px;
    font-weight: 700;
    color: var(--gold);
    line-height: 1.1;
    margin-bottom: 1px;
  }}

  .competition-title {{
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 10px;
    font-weight: 700;
    color: var(--charcoal);
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-bottom: 1px;
  }}

  .doc-badge {{
    display: inline-block;
    background: var(--emerald);
    color: #ffffff;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    padding: 2.5px 10px;
    border-radius: 12px;
    border: 1px solid var(--gold);
  }}

  .header-ref-box {{
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 3px;
  }}

  .ref-pill {{
    border: 1px solid var(--border-dark);
    border-radius: 4px;
    padding: 3px 6px;
    text-align: right;
    width: 100%;
    background: #ffffff;
  }}

  .ref-pill-label {{
    font-size: 7.5px;
    text-transform: uppercase;
    font-weight: 700;
    color: var(--muted);
    letter-spacing: 0.5px;
  }}

  .ref-pill-val {{
    font-family: 'JetBrains Mono', monospace;
    font-size: 8.5px;
    font-weight: 600;
    color: var(--charcoal);
  }}

  /* ==================== SECTION STYLING ==================== */
  .form-section {{
    margin-bottom: 4px;
  }}

  .section-header {{
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: linear-gradient(90deg, var(--emerald) 0%, #155738 100%);
    color: #ffffff;
    padding: 3px 8px;
    border-radius: 3px;
    margin-bottom: 4px;
    border-left: 3.5px solid var(--gold);
  }}

  body.theme-monochrome .section-header {{
    background: #1e293b;
    border-left: 3.5px solid #475569;
  }}

  .section-header-title {{
    font-size: 9.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    display: flex;
    align-items: center;
    gap: 6px;
  }}

  .section-num {{
    background: var(--gold);
    color: #09170e;
    font-size: 8px;
    font-weight: 800;
    width: 14px;
    height: 14px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
  }}

  body.theme-monochrome .section-num {{
    background: #ffffff;
    color: #0f172a;
  }}

  .section-header-ar {{
    font-family: 'Amiri', serif;
    font-size: 11px;
    font-weight: 700;
    color: #fef08a;
  }}

  body.theme-monochrome .section-header-ar {{
    color: #e2e8f0;
  }}

  /* GRID SYSTEMS */
  .grid-2 {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px 12px;
  }}

  .grid-3 {{
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 6px 10px;
  }}

  .grid-4 {{
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr;
    gap: 6px 8px;
  }}

  .grid-custom-inst {{
    display: grid;
    grid-template-columns: 1.4fr 1fr;
    gap: 6px 12px;
  }}

  .grid-contact {{
    display: grid;
    grid-template-columns: 1.3fr 1fr;
    gap: 6px 12px;
  }}

  /* FIELD BLOCKS */
  .field-block {{
    display: flex;
    flex-direction: column;
    margin-bottom: 3.5px;
  }}

  .field-label {{
    font-size: 8px;
    font-weight: 700;
    color: var(--charcoal);
    text-transform: uppercase;
    letter-spacing: 0.3px;
    margin-bottom: 1.5px;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }}

  .label-ar {{
    font-family: 'Amiri', serif;
    font-size: 9.5px;
    color: var(--muted);
    font-weight: 600;
  }}

  .field-input-line {{
    border-bottom: 1px solid var(--border-dark);
    height: 17px;
    display: flex;
    align-items: flex-end;
    font-size: 9.5px;
    font-weight: 600;
    color: #0f172a;
    padding-bottom: 1px;
  }}

  .field-input-box {{
    border: 1px solid var(--border-line);
    background: #ffffff;
    border-radius: 3px;
    height: 20px;
    display: flex;
    align-items: center;
    padding: 0 6px;
    font-size: 9.5px;
    font-weight: 600;
  }}

  /* DIGIT BOXES (for phone, postal) */
  .digit-boxes {{
    display: inline-flex;
    gap: 2px;
    align-items: center;
  }}

  .digit-box {{
    width: 13px;
    height: 16px;
    border: 1px solid var(--border-line);
    border-radius: 2px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    background: #fafafa;
  }}

  /* CHECKBOX ITEMS */
  .check-grid {{
    display: flex;
    flex-wrap: wrap;
    gap: 5px 12px;
    align-items: center;
    padding: 3px 0;
  }}

  .check-item {{
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 8.5px;
    font-weight: 600;
    color: var(--charcoal);
    cursor: default;
  }}

  .check-box {{
    width: 11px;
    height: 11px;
    border: 1.4px solid var(--border-dark);
    border-radius: 2px;
    display: inline-block;
    background: #ffffff;
    flex-shrink: 0;
  }}

  .check-box.checked {{
    background-color: var(--emerald);
    position: relative;
  }}

  .check-box.checked::after {{
    content: "✓";
    color: #ffffff;
    font-size: 9px;
    position: absolute;
    top: -2px;
    left: 1px;
  }}

  /* CATEGORIES TABLE MINI */
  .category-table {{
    width: 100%;
    border-collapse: collapse;
    margin: 2px 0;
    font-size: 8px;
  }}

  .category-table th {{
    background: var(--emerald-light);
    color: var(--emerald-dark);
    border: 1px solid var(--border-line);
    padding: 2.5px 5px;
    text-align: left;
    font-weight: 700;
    text-transform: uppercase;
    font-size: 7.5px;
  }}

  .category-table td {{
    border: 1px solid var(--border-line);
    padding: 2.5px 5px;
    vertical-align: middle;
  }}

  .badge-category {{
    display: inline-block;
    padding: 1px 5px;
    border-radius: 3px;
    font-weight: 700;
    font-size: 7.5px;
    background: #e2e8f0;
    color: #1e293b;
  }}

  /* SIGNATURE & STAMP BLOCK */
  .auth-stamp-block {{
    display: grid;
    grid-template-columns: 1.4fr 1fr;
    gap: 12px;
    margin-top: 3px;
    padding-top: 3px;
    border-top: 1px dashed var(--gold);
  }}

  .stamp-box {{
    border: 1.5px dashed var(--border-dark);
    border-radius: 4px;
    height: 72px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: #fafafa;
    text-align: center;
    padding: 4px;
    position: relative;
  }}

  .stamp-box-label {{
    font-size: 8px;
    font-weight: 700;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }}

  .stamp-box-ar {{
    font-family: 'Amiri', serif;
    font-size: 10px;
    color: var(--muted);
  }}

  /* OFFICE USE ONLY FOOTER BOX */
  .office-box {{
    background: #f8fafc;
    border: 1.2px solid var(--border-line);
    border-radius: 4px;
    padding: 4px 8px;
    margin-top: 3px;
  }}

  .office-header {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--border-line);
    padding-bottom: 2px;
    margin-bottom: 3px;
  }}

  .office-title {{
    font-size: 8px;
    font-weight: 800;
    color: var(--emerald-dark);
    text-transform: uppercase;
    letter-spacing: 0.8px;
  }}

  .office-sub {{
    font-size: 7.5px;
    color: var(--muted);
    font-style: italic;
  }}

  .footer-copyright {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 7px;
    color: var(--muted);
    padding-top: 3px;
    margin-top: 2px;
  }}

  /* ==================== FORM 2: MULTI-MADARIS ROSTER ==================== */
  .roster-header {{
    display: grid;
    grid-template-columns: 80px 1fr 150px;
    align-items: center;
    gap: 12px;
    border-bottom: 1.5px solid var(--gold);
    padding-bottom: 4px;
    margin-bottom: 5px;
  }}

  .roster-meta-bar {{
    display: flex;
    justify-content: space-between;
    background: var(--emerald-light);
    border: 1px solid var(--border-line);
    border-radius: 3px;
    padding: 3px 8px;
    font-size: 8px;
    font-weight: 600;
    margin-bottom: 5px;
  }}

  .roster-meta-item {{
    display: inline-flex;
    gap: 4px;
    align-items: center;
  }}

  .roster-meta-item .underline {{
    border-bottom: 1px solid var(--border-dark);
    display: inline-block;
    min-width: 90px;
    height: 12px;
  }}

  .roster-table {{
    width: 100%;
    border-collapse: collapse;
    font-size: 8px;
    margin-bottom: 4px;
  }}

  .roster-table th {{
    background: var(--emerald);
    color: #ffffff;
    border: 1px solid #14532d;
    padding: 3.5px 4px;
    text-align: left;
    font-weight: 700;
    text-transform: uppercase;
    font-size: 7.5px;
    letter-spacing: 0.3px;
  }}

  body.theme-monochrome .roster-table th {{
    background: #1e293b;
    border: 1px solid #0f172a;
  }}

  .roster-table td {{
    border: 1px solid var(--border-line);
    padding: 2.5px 4px;
    vertical-align: middle;
    height: 22px;
  }}

  .roster-table tr:nth-child(even) {{
    background-color: #f8fafc;
  }}

  .col-num {{ width: 22px; text-align: center; font-weight: 700; }}
  .col-name {{ width: 22%; }}
  .col-loc {{ width: 14%; }}
  .col-head {{ width: 16%; }}
  .col-phone {{ width: 15%; }}
  .col-email {{ width: 20%; }}
  .col-check {{ width: 5%; text-align: center; }}

  .sub-note {{
    font-size: 6.5px;
    color: var(--muted);
    font-weight: normal;
    display: block;
  }}

  /* PRINT SPECIFIC STYLES */
  @page {{
    margin: 0;
    size: auto;
  }}

  @page portrait-page {{
    size: A4 portrait;
    margin: 8mm 9mm 6mm;
  }}

  @page landscape-page {{
    size: A4 landscape;
    margin: 7mm 9mm 5mm;
  }}

  @media print {{
    .no-print {{
      display: none !important;
    }}

    body {{
      background: #ffffff !important;
      color: #000000 !important;
    }}

    .pages-wrapper {{
      margin: 0 !important;
      padding: 0 !important;
      max-width: none !important;
      gap: 0 !important;
    }}

    .sheet {{
      box-shadow: none !important;
      border: none !important;
    }}

    .sheet-portrait {{
      page: portrait-page;
      page-break-after: always;
      break-after: page;
      width: 100% !important;
      height: 100% !important;
      max-height: 297mm;
      padding: 0 !important;
    }}

    .sheet-landscape {{
      page: landscape-page;
      page-break-after: always;
      break-after: page;
      width: 100% !important;
      height: 100% !important;
      max-height: 210mm;
      padding: 0 !important;
    }}

    /* Controls to print single only or roster only */
    body.print-single-only .sheet-landscape {{
      display: none !important;
    }}
    body.print-roster-only .sheet-portrait {{
      display: none !important;
    }}
  }}
</style>
</head>
<body class="theme-color">

<!-- SCREEN ACTION TOOLBAR (Hidden when printed) -->
<header class="toolbar no-print">
  <div class="toolbar-brand">
    <img src="data:image/png;base64,{b64_logo}" alt="Jamia Mosque Logo">
    <div class="toolbar-brand-text">
      <h1>Musabaqa 2026 — Madaris Registration & Intake</h1>
      <p>Jamia Mosque Committee Nairobi • Official Field Intake Pack</p>
    </div>
  </div>

  <div class="toolbar-actions">
    <!-- View Switcher -->
    <div class="btn-group">
      <button class="btn-pill active" onclick="setViewMode('all')">📄 View Both Sheets</button>
      <button class="btn-pill" onclick="setViewMode('single')">📋 Single Profile Form</button>
      <button class="btn-pill" onclick="setViewMode('roster')">📊 Quick Intake Roster</button>
    </div>

    <!-- Theme Switcher -->
    <div class="btn-group">
      <button class="btn-pill active" id="btn-theme-color" onclick="setTheme('color')">🎨 Gold & Emerald</button>
      <button class="btn-pill" id="btn-theme-mono" onclick="setTheme('mono')">🖨️ Laser B&W</button>
    </div>

    <!-- Sample Data Switcher -->
    <button class="btn btn-outline" id="btn-sample" onclick="toggleSample()">
      <span>👁️ Preview Sample Data</span>
    </button>

    <!-- Quick Print Button -->
    <button class="btn btn-gold" onclick="triggerPrint()">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
      <span>Print Form (Ctrl+P)</span>
    </button>
  </div>
</header>

<main class="pages-wrapper">

  <!-- ========================================================================= -->
  <!-- SHEET 1: SINGLE MADRASA REGISTRATION & INTAKE PROFILE (A4 PORTRAIT)      -->
  <!-- ========================================================================= -->
  <section class="sheet sheet-portrait" id="sheet-single">
    <!-- Subtle Background Watermark -->
    <img src="data:image/png;base64,{b64_watermark}" class="watermark-bg" alt="Watermark">

    <div class="sheet-content">
      <div class="frame-border">
        <!-- Corner Gold Brackets -->
        <div class="corner-ornament corner-tl"></div>
        <div class="corner-ornament corner-tr"></div>
        <div class="corner-ornament corner-bl"></div>
        <div class="corner-ornament corner-br"></div>

        <!-- HEADER -->
        <header class="form-header">
          <div class="header-logo">
            <img src="data:image/png;base64,{b64_logo}" alt="Jamia Mosque Committee Nairobi">
          </div>
          <div class="header-titles">
            <div class="bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
            <div class="org-title-en">JAMIA MOSQUE COMMITTEE — NAIROBI</div>
            <div class="org-title-ar">لجنة مسجد جامع نيروبي — الأمانة العامة للمسابقات القرآنية</div>
            <div class="competition-title">ANNUAL QURAN MEMORIZATION & RECITATION COMPETITION 2026</div>
            <span class="doc-badge">MADRASA ACCREDITATION & INTAKE DOSSIER</span>
          </div>
          <div class="header-ref-box">
            <div class="ref-pill">
              <div class="ref-pill-label">Form Reference</div>
              <div class="ref-pill-val sample-hide">JMC/MQ26/______</div>
              <div class="ref-pill-val sample-show" style="display:none; color: #b45309;">JMC/MQ26/NBI-042</div>
            </div>
            <div class="ref-pill">
              <div class="ref-pill-label">Date Issued</div>
              <div class="ref-pill-val sample-hide">____ / ____ / 2026</div>
              <div class="ref-pill-val sample-show" style="display:none; color: #b45309;">05 / 09 / 2026</div>
            </div>
          </div>
        </header>

        <!-- SECTION 1: INSTITUTION IDENTITY -->
        <div class="form-section">
          <div class="section-header">
            <div class="section-header-title">
              <span class="section-num">1</span>
              <span>Institution Identity & Classification</span>
            </div>
            <div class="section-header-ar">بيانات المؤسسة التعليمية والتصنيف</div>
          </div>

          <div class="field-block">
            <div class="field-label">
              <span>Official Institution / Madrasa Name (English) *</span>
              <span class="label-ar">الاسم الرسمي للمدرسة أو المركز بالإنجليزية</span>
            </div>
            <div class="field-input-line">
              <span class="sample-show" style="display:none; color:#0f3b28;">MADRASA DARUL QUR'AN WA SUNNAH — EASTLEIGH</span>
            </div>
          </div>

          <div class="grid-custom-inst">
            <div class="field-block">
              <div class="field-label">
                <span>Official Name in Arabic (if applicable)</span>
                <span class="label-ar">الاسم باللغة العربية</span>
              </div>
              <div class="field-input-line" style="font-family: 'Amiri', serif; font-size: 11px;">
                <span class="sample-show" style="display:none; color:#0f3b28;">مدرسة دار القرآن والسنة — نيروبي</span>
              </div>
            </div>
            <div class="field-block">
              <div class="field-label">
                <span>Year Established / Reg No.</span>
                <span class="label-ar">سنة التأسيس / رقم التسجيل</span>
              </div>
              <div class="field-input-line">
                <span class="sample-show" style="display:none; color:#0f3b28;">Est: 2014 &nbsp;|&nbsp; Reg: CR/NBI/2016/884</span>
              </div>
            </div>
          </div>

          <div class="field-block">
            <div class="field-label">
              <span>Institution Type / Nature *</span>
              <span class="label-ar">نوع المؤسسة</span>
            </div>
            <div class="check-grid">
              <span class="check-item"><span class="check-box sample-check-1"></span> Full-Time Tahfeeth Madrasa (مدرسة تحفيظ متفرغة)</span>
              <span class="check-item"><span class="check-box"></span> Integrated Islamic Academy (مدرسة إسلامية متكاملة)</span>
              <span class="check-item"><span class="check-box"></span> Mosque Quranic Halaqah (حلقة قرآنية بالمسجد)</span>
              <span class="check-item"><span class="check-box"></span> Weekend / Evening Madrasa (مدرسة مسائية / عطلة)</span>
            </div>
          </div>
        </div>

        <!-- SECTION 2: GEOGRAPHIC LOCATION -->
        <div class="form-section">
          <div class="section-header">
            <div class="section-header-title">
              <span class="section-num">2</span>
              <span>Geographical Location & Physical Address</span>
            </div>
            <div class="section-header-ar">الموقع الجغرافي والعنوان الميداني</div>
          </div>

          <div class="grid-3">
            <div class="field-block">
              <div class="field-label">
                <span>County *</span>
                <span class="label-ar">المحافظة</span>
              </div>
              <div class="check-grid" style="padding: 1px 0;">
                <span class="check-item"><span class="check-box sample-check-2"></span> Nairobi</span>
                <span class="check-item"><span class="check-box"></span> Kajiado</span>
                <span class="check-item"><span class="check-box"></span> Other: _____</span>
              </div>
            </div>

            <div class="field-block" style="grid-column: span 2;">
              <div class="field-label">
                <span>Sub-County / Musabaqa Region *</span>
                <span class="label-ar">المنطقة / الدائرة المعتمدة</span>
              </div>
              <div class="check-grid" style="padding: 1px 0; font-size: 8px;">
                <span class="check-item"><span class="check-box sample-check-3"></span> Eastleigh</span>
                <span class="check-item"><span class="check-box"></span> Kasarani</span>
                <span class="check-item"><span class="check-box"></span> South B</span>
                <span class="check-item"><span class="check-box"></span> Langata</span>
                <span class="check-item"><span class="check-box"></span> Embakasi</span>
                <span class="check-item"><span class="check-box"></span> Westlands</span>
                <span class="check-item"><span class="check-box"></span> Pumwani</span>
                <span class="check-item"><span class="check-box"></span> Kitengela / Ngong</span>
              </div>
            </div>
          </div>

          <div class="grid-2" style="margin-top: 2px;">
            <div class="field-block">
              <div class="field-label">
                <span>Physical Estate / Street / Nearest Mosque or Landmark *</span>
                <span class="label-ar">الحي / الشارع / أقرب معلم بارز</span>
              </div>
              <div class="field-input-line">
                <span class="sample-show" style="display:none; color:#0f3b28;">12th Street, Near Masjid Al-Hidaayah, Eastleigh Section 2</span>
              </div>
            </div>
            <div class="field-block">
              <div class="field-label">
                <span>Postal Address / Town</span>
                <span class="label-ar">صندوق البريد والمدينة</span>
              </div>
              <div class="field-input-line">
                <span class="sample-show" style="display:none; color:#0f3b28;">P.O. Box 45910 - 00100, Nairobi, Kenya</span>
              </div>
            </div>
          </div>
        </div>

        <!-- SECTION 3: ADMINISTRATION & CONTACTS (PORTAL ACCESS) -->
        <div class="form-section">
          <div class="section-header">
            <div class="section-header-title">
              <span class="section-num">3</span>
              <span>Administration & Portal Access Credentials</span>
            </div>
            <div class="section-header-ar">بيانات الإدارة والاعتماد لبوابة النظام الإلكتروني</div>
          </div>

          <!-- Important Banner -->
          <div style="background: var(--gold-light); border: 1px solid var(--gold-border); border-radius: 3px; padding: 2px 6px; font-size: 7.5px; color: #78350f; font-weight: 600; margin-bottom: 3px;">
            ⚠️ <strong>CRITICAL FOR SYSTEM ACCESS:</strong> The Email and WhatsApp phone provided below will be used as the official Login & Verification credentials on <code>musabaqa-web</code> and SMS contestant scheduling alerts.
          </div>

          <div class="grid-contact">
            <div class="field-block">
              <div class="field-label">
                <span>Principal / Mudir Full Name *</span>
                <span class="label-ar">اسم مدير المدرسة / المشرف العام</span>
              </div>
              <div class="field-input-line">
                <span class="sample-show" style="display:none; color:#0f3b28;">Sheikh Abdullahi Mohamed Hassan</span>
              </div>
            </div>

            <div class="field-block">
              <div class="field-label">
                <span>Primary Calling Phone *</span>
                <span class="label-ar">رقم الهاتف للاتصال</span>
              </div>
              <div class="field-input-line">
                <span class="sample-show" style="display:none; color:#0f3b28; font-family: 'JetBrains Mono', monospace;">+254 722 849 201</span>
                <span class="sample-hide" style="font-family: 'JetBrains Mono', monospace; font-size: 8.5px; color: #94a3b8;">+254 &nbsp; [ &nbsp; &nbsp; &nbsp; ] &nbsp; — &nbsp; [ &nbsp; &nbsp; &nbsp; ] &nbsp; — &nbsp; [ &nbsp; &nbsp; &nbsp; ]</span>
              </div>
            </div>
          </div>

          <div class="grid-contact">
            <div class="field-block">
              <div class="field-label">
                <span>Official Institution Email Address (For Portal Login & Results) *</span>
                <span class="label-ar">البريد الإلكتروني المعتمد للدخول إلى النظام</span>
              </div>
              <div class="field-input-line" style="letter-spacing: 0.4px;">
                <span class="sample-show" style="display:none; color:#0f3b28; font-weight: 700;">darulquran.eastleigh@gmail.com</span>
                <span class="sample-hide" style="color: #94a3b8; font-size: 8px;">__________________________________________________ @ __________________________</span>
              </div>
            </div>

            <div class="field-block">
              <div class="field-label">
                <span>Official WhatsApp Number (For Musabaqa Bulletins) *</span>
                <span class="label-ar">رقم الواتساب الرسمي للتواصل</span>
              </div>
              <div class="field-input-line">
                <span class="sample-show" style="display:none; color:#0f3b28; font-family: 'JetBrains Mono', monospace;">+254 722 849 201 &nbsp; (Same)</span>
                <span class="sample-hide" style="font-family: 'JetBrains Mono', monospace; font-size: 8.5px; color: #94a3b8;">+254 &nbsp; [ &nbsp; &nbsp; &nbsp; ] &nbsp; — &nbsp; [ &nbsp; &nbsp; &nbsp; ] &nbsp; — &nbsp; [ &nbsp; &nbsp; &nbsp; ]</span>
              </div>
            </div>
          </div>

          <div class="grid-2">
            <div class="field-block">
              <div class="field-label">
                <span>Musabaqa Coordinator / Head Teacher (if different from Mudir)</span>
                <span class="label-ar">مسؤول المسابقة بالمدرسة</span>
              </div>
              <div class="field-input-line">
                <span class="sample-show" style="display:none; color:#0f3b28;">Ustadh Ahmed Nur Ibrahim</span>
              </div>
            </div>
            <div class="field-block">
              <div class="field-label">
                <span>Coordinator Mobile / WhatsApp</span>
                <span class="label-ar">هاتف مسؤول المسابقة</span>
              </div>
              <div class="field-input-line">
                <span class="sample-show" style="display:none; color:#0f3b28; font-family: 'JetBrains Mono', monospace;">+254 733 456 789</span>
                <span class="sample-hide" style="font-family: 'JetBrains Mono', monospace; font-size: 8.5px; color: #94a3b8;">+254 &nbsp; _______________________________</span>
              </div>
            </div>
          </div>
        </div>

        <!-- SECTION 4: TAHFEETH DEMOGRAPHICS & COMPETITION TARGETS -->
        <div class="form-section">
          <div class="section-header">
            <div class="section-header-title">
              <span class="section-num">4</span>
              <span>Quran Demographics & Musabaqa 2026 Categories</span>
            </div>
            <div class="section-header-ar">أعداد الطلاب وفئات المسابقة المستهدفة</div>
          </div>

          <table class="category-table">
            <thead>
              <tr>
                <th style="width: 28%;">Competition Category (الفئة)</th>
                <th style="width: 22%;">Target Scope & Age Bracket</th>
                <th style="width: 25%;">Participation Status</th>
                <th style="width: 25%;">Estimated Contestants</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Category 1: Juz' 1 – 10</strong><br><span style="font-family:'Amiri'; color:var(--muted)">الأجزاء من ١ إلى ١٠</span></td>
                <td>Ages 7 – 12 Years</td>
                <td><span class="check-item"><span class="check-box sample-check-4"></span> Intend to Enter</span></td>
                <td>Approx. <span class="sample-show" style="display:none; font-weight:700; color:#0f3b28;">4</span><span class="sample-hide">_______</span> Students</td>
              </tr>
              <tr>
                <td><strong>Category 2: Juz' 11 – 20</strong><br><span style="font-family:'Amiri'; color:var(--muted)">الأجزاء من ١١ إلى ٢٠</span></td>
                <td>Ages 10 – 15 Years</td>
                <td><span class="check-item"><span class="check-box sample-check-5"></span> Intend to Enter</span></td>
                <td>Approx. <span class="sample-show" style="display:none; font-weight:700; color:#0f3b28;">3</span><span class="sample-hide">_______</span> Students</td>
              </tr>
              <tr>
                <td><strong>Category 3: Juz' 21 – 29</strong><br><span style="font-family:'Amiri'; color:var(--muted)">الأجزاء من ٢١ إلى ٢٩</span></td>
                <td>Ages 13 – 18 Years</td>
                <td><span class="check-item"><span class="check-box sample-check-6"></span> Intend to Enter</span></td>
                <td>Approx. <span class="sample-show" style="display:none; font-weight:700; color:#0f3b28;">2</span><span class="sample-hide">_______</span> Students</td>
              </tr>
              <tr>
                <td><strong>Category 4: Juz' 30 (Complete)</strong><br><span style="font-family:'Amiri'; color:var(--muted)">المصحف كاملاً (حفظ كامل)</span></td>
                <td>Open Age (All Ages)</td>
                <td><span class="check-item"><span class="check-box sample-check-7"></span> Intend to Enter</span></td>
                <td>Approx. <span class="sample-show" style="display:none; font-weight:700; color:#0f3b28;">2</span><span class="sample-hide">_______</span> Students</td>
              </tr>
            </tbody>
          </table>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 2px;">
            <div style="font-size: 8px; font-weight: 600;">
              Total Enrolled Tahfeeth Students at Madrasa:
              <strong class="sample-show" style="display:none; color:#0f3b28; margin-left: 4px;">180 Students</strong>
              <span class="sample-hide" style="display:inline-block; border-bottom: 1px solid var(--border-dark); width: 60px; text-align: center;">&nbsp;</span>
            </div>
            <div style="font-size: 8px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
              <span>Preferred Communication:</span>
              <span class="check-item"><span class="check-box sample-check-8"></span> English</span>
              <span class="check-item"><span class="check-box"></span> Arabic (العربية)</span>
              <span class="check-item"><span class="check-box"></span> Kiswahili</span>
            </div>
          </div>
        </div>

        <!-- SECTION 5: DECLARATION & OFFICIAL STAMP -->
        <div class="form-section">
          <div class="section-header">
            <div class="section-header-title">
              <span class="section-num">5</span>
              <span>Official Endorsement & Stamp</span>
            </div>
            <div class="section-header-ar">الإقرار الرسمي وتصديق المؤسسة</div>
          </div>

          <div class="auth-stamp-block">
            <div style="display: flex; flex-direction: column; justify-content: space-between; height: 72px;">
              <div style="font-size: 7.5px; color: var(--muted); line-height: 1.25;">
                I hereby declare that the information submitted above is true, accurate, and authorized on behalf of this institution for the Musabaqa 2026 Quran competition database.
              </div>
              <div class="grid-2" style="margin-top: 4px;">
                <div class="field-block">
                  <div class="field-label"><span>Authorized Signatory Name</span></div>
                  <div class="field-input-line">
                    <span class="sample-show" style="display:none; color:#0f3b28;">Sh. Abdullahi Mohamed</span>
                  </div>
                </div>
                <div class="field-block">
                  <div class="field-label"><span>Designation / Role</span></div>
                  <div class="field-input-line">
                    <span class="sample-show" style="display:none; color:#0f3b28;">Mudir / Principal</span>
                  </div>
                </div>
              </div>
              <div class="grid-2">
                <div class="field-block">
                  <div class="field-label"><span>Signature:</span></div>
                  <div class="field-input-line" style="border-bottom: 1px solid #475569;"></div>
                </div>
                <div class="field-block">
                  <div class="field-label"><span>Date:</span></div>
                  <div class="field-input-line" style="border-bottom: 1px solid #475569;">
                    <span class="sample-show" style="display:none; color:#0f3b28;">05 / 09 / 2026</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Official Stamp Box -->
            <div class="stamp-box">
              <div class="stamp-box-label">OFFICIAL MADRASA RUBBER STAMP</div>
              <div class="stamp-box-ar">الختم الرسمي للمؤسسة التعليمية</div>
              <div style="font-size: 6.5px; color: #94a3b8; margin-top: 2px;">(Please affix official school stamp here)</div>
            </div>
          </div>
        </div>

        <!-- SECTION 6: OFFICE USE ONLY (MUSABAQA SECRETARIAT) -->
        <div class="office-box">
          <div class="office-header">
            <span class="office-title">🏛️ FOR OFFICIAL MUSABAQA SECRETARIAT DESK USE ONLY</span>
            <span class="office-sub">خاص بالأمانة العامة لمسابقة مسجد جامع نيروبي</span>
          </div>

          <div class="grid-4" style="font-size: 8px; align-items: center;">
            <div>
              <span style="color:var(--muted)">Intake Officer:</span><br>
              <span class="sample-show" style="display:none; font-weight: 700; color:#0f3b28;">Br. Khalfan (JMC Admin)</span>
              <span class="sample-hide">_______________________</span>
            </div>
            <div>
              <span style="color:var(--muted)">Assigned System ID:</span><br>
              <strong style="font-family: 'JetBrains Mono', monospace; color: var(--emerald);">
                <span class="sample-show" style="display:none; color:#b45309;">NBI-EST-042</span>
                <span class="sample-hide">[ &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; ]</span>
              </strong>
            </div>
            <div>
              <span style="color:var(--muted)">Portal Account Provisioned:</span><br>
              <span class="check-item"><span class="check-box"></span> Created in Admin</span>
            </div>
            <div>
              <span style="color:var(--muted)">SMS / Email Dispatched:</span><br>
              <span class="check-item"><span class="check-box"></span> Credentials Sent</span>
            </div>
          </div>
        </div>

        <!-- FOOTER BAR -->
        <div class="footer-copyright">
          <span>Jamia Mosque Committee, P.O. Box 40629-00100 Nairobi, Kenya • Tel: +254 20 2243504 / +254 722 000 000</span>
          <span>Musabaqa Institutional Portal: <strong>musabaqa.jamiamosque.org</strong></span>
          <span>Page 1 of 1</span>
        </div>

      </div><!-- /.frame-border -->
    </div><!-- /.sheet-content -->
  </section>

  <!-- ========================================================================= -->
  <!-- SHEET 2: MULTI-MADARIS QUICK INTAKE FIELD ROSTER (A4 LANDSCAPE)          -->
  <!-- ========================================================================= -->
  <section class="sheet sheet-landscape" id="sheet-roster">
    <!-- Subtle Background Watermark -->
    <img src="data:image/png;base64,{b64_watermark}" class="watermark-bg" alt="Watermark">

    <div class="sheet-content">
      <div class="frame-border" style="padding: 5mm 7mm;">
        <!-- Corner Gold Brackets -->
        <div class="corner-ornament corner-tl"></div>
        <div class="corner-ornament corner-tr"></div>
        <div class="corner-ornament corner-bl"></div>
        <div class="corner-ornament corner-br"></div>

        <!-- ROSTER HEADER -->
        <header class="roster-header">
          <div class="header-logo">
            <img src="data:image/png;base64,{b64_logo}" alt="Jamia Mosque Logo" style="max-height: 65px;">
          </div>
          <div class="header-titles">
            <div class="bismillah" style="font-size: 13px;">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
            <div class="org-title-en" style="font-size: 12px;">JAMIA MOSQUE COMMITTEE NAIROBI — MUSABAQA 2026</div>
            <div class="org-title-ar" style="font-size: 13px;">مسابقة القرآن الكريم السنوية — كشف حصر وتسجيل المدارس والمراكز القرآنية (الميداني)</div>
            <div class="competition-title" style="font-size: 9.5px;">RAPID MADARIS INTAKE & DIRECTORY ROSTER (WEB & ADMIN DEVELOPMENT)</div>
          </div>
          <div class="header-ref-box">
            <div class="ref-pill">
              <div class="ref-pill-label">Roster Sheet No.</div>
              <div class="ref-pill-val">ROSTER-MQ26 / 01</div>
            </div>
            <div class="ref-pill">
              <div class="ref-pill-label">Date of Intake</div>
              <div class="ref-pill-val">____ / ____ / 2026</div>
            </div>
          </div>
        </header>

        <!-- META BAR -->
        <div class="roster-meta-bar">
          <div class="roster-meta-item">
            <span>Event / Meeting:</span>
            <span class="underline">&nbsp;Madaris Leaders Gathering</span>
          </div>
          <div class="roster-meta-item">
            <span>Intake Desk Officer / Recorder:</span>
            <span class="underline">&nbsp;</span>
          </div>
          <div class="roster-meta-item">
            <span>Target County / Area:</span>
            <span class="underline">&nbsp;Nairobi & Environs</span>
          </div>
          <div class="roster-meta-item">
            <span>Target Total Madaris:</span>
            <span class="underline" style="min-width: 40px;">&nbsp;</span>
          </div>
        </div>

        <!-- 12-ROW HIGH DENSITY INTAKE TABLE -->
        <table class="roster-table">
          <thead>
            <tr>
              <th class="col-num">#</th>
              <th class="col-name">Madrasa / Institution Official Name<span class="sub-note">اسم المدرسة / المركز القرآني</span></th>
              <th class="col-loc">County & Area / Estate<span class="sub-note">المحافظة / الحي (e.g. Eastleigh)</span></th>
              <th class="col-head">Headteacher / Mudir<span class="sub-note">اسم المدير / المشرف</span></th>
              <th class="col-phone">Mobile & WhatsApp No.<span class="sub-note">الهاتف والواتساب (+254)</span></th>
              <th class="col-email">Official Email (Portal Login)<span class="sub-note">البريد الإلكتروني لحساب المنصة</span></th>
              <th style="width: 9%;">Est. Students & Cats<span class="sub-note">الأعداد والفئات</span></th>
              <th class="col-check">Entered [✓]<span class="sub-note">في النظام</span></th>
            </tr>
          </thead>
          <tbody>
            <!-- Row 1 (Sample Pre-fill if toggled) -->
            <tr>
              <td class="col-num">1</td>
              <td>
                <span class="sample-show" style="display:none; font-weight:700; color:#0f3b28;">Madrasa Darul Qur'an</span>
                <span class="sample-hide">&nbsp;</span>
              </td>
              <td>
                <span class="sample-show" style="display:none; color:#0f3b28;">Nairobi / Eastleigh</span>
                <span class="sample-hide">&nbsp;</span>
              </td>
              <td>
                <span class="sample-show" style="display:none; color:#0f3b28;">Sh. Abdullahi Mohamed</span>
                <span class="sample-hide">&nbsp;</span>
              </td>
              <td style="font-family: 'JetBrains Mono', monospace; font-size: 7.5px;">
                <span class="sample-show" style="display:none; color:#0f3b28;">0722 849 201</span>
                <span class="sample-hide">&nbsp;</span>
              </td>
              <td style="font-size: 7.5px;">
                <span class="sample-show" style="display:none; color:#0f3b28; font-weight: 600;">darulquran.nbi@gmail.com</span>
                <span class="sample-hide">&nbsp;</span>
              </td>
              <td style="font-size: 7px; text-align: center;">
                <span class="sample-show" style="display:none; color:#0f3b28;">180 sts (All 4 Cats)</span>
                <span class="sample-hide">&nbsp;</span>
              </td>
              <td class="col-check">
                <span class="check-box sample-check-roster"></span>
              </td>
            </tr>

            <!-- Empty Rows 2 to 12 for clean handwriting -->
            <tr><td class="col-num">2</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td class="col-check"><span class="check-box"></span></td></tr>
            <tr><td class="col-num">3</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td class="col-check"><span class="check-box"></span></td></tr>
            <tr><td class="col-num">4</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td class="col-check"><span class="check-box"></span></td></tr>
            <tr><td class="col-num">5</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td class="col-check"><span class="check-box"></span></td></tr>
            <tr><td class="col-num">6</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td class="col-check"><span class="check-box"></span></td></tr>
            <tr><td class="col-num">7</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td class="col-check"><span class="check-box"></span></td></tr>
            <tr><td class="col-num">8</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td class="col-check"><span class="check-box"></span></td></tr>
            <tr><td class="col-num">9</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td class="col-check"><span class="check-box"></span></td></tr>
            <tr><td class="col-num">10</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td class="col-check"><span class="check-box"></span></td></tr>
            <tr><td class="col-num">11</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td class="col-check"><span class="check-box"></span></td></tr>
            <tr><td class="col-num">12</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td class="col-check"><span class="check-box"></span></td></tr>
          </tbody>
        </table>

        <!-- ROSTER FOOTER NOTE -->
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 7.5px; color: var(--muted); border-top: 1px solid var(--border-line); padding-top: 2px;">
          <span>* Note: All verified entries are transferred directly to <strong>musabaqa-admin</strong> database for institution onboarding and portal access creation.</span>
          <span>Verified by Secretariat Lead: __________________________ Signature: __________________________</span>
          <span>Musabaqa 2026 • Page 1 of 1</span>
        </div>

      </div><!-- /.frame-border -->
    </div><!-- /.sheet-content -->
  </section>

</main>

<script>
  let viewMode = 'all';
  let isSample = false;

  function setViewMode(mode) {{
    viewMode = mode;
    const s1 = document.getElementById('sheet-single');
    const s2 = document.getElementById('sheet-roster');
    const buttons = document.querySelectorAll('.toolbar .btn-group:first-child .btn-pill');
    buttons.forEach(b => b.classList.remove('active'));

    document.body.classList.remove('print-single-only', 'print-roster-only');

    if (mode === 'single') {{
      s1.style.display = 'flex';
      s2.style.display = 'none';
      document.body.classList.add('print-single-only');
      buttons[1].classList.add('active');
    }} else if (mode === 'roster') {{
      s1.style.display = 'none';
      s2.style.display = 'flex';
      document.body.classList.add('print-roster-only');
      buttons[2].classList.add('active');
    }} else {{
      s1.style.display = 'flex';
      s2.style.display = 'flex';
      buttons[0].classList.add('active');
    }}
  }}

  function setTheme(theme) {{
    const bColor = document.getElementById('btn-theme-color');
    const bMono = document.getElementById('btn-theme-mono');
    if (theme === 'mono') {{
      document.body.classList.add('theme-monochrome');
      bMono.classList.add('active');
      bColor.classList.remove('active');
    }} else {{
      document.body.classList.remove('theme-monochrome');
      bColor.classList.add('active');
      bMono.classList.remove('active');
    }}
  }}

  function toggleSample() {{
    isSample = !isSample;
    const btn = document.getElementById('btn-sample');
    const sampleShows = document.querySelectorAll('.sample-show');
    const sampleHides = document.querySelectorAll('.sample-hide');
    const checkBoxes = [
      document.querySelector('.sample-check-1'),
      document.querySelector('.sample-check-2'),
      document.querySelector('.sample-check-3'),
      document.querySelector('.sample-check-4'),
      document.querySelector('.sample-check-5'),
      document.querySelector('.sample-check-6'),
      document.querySelector('.sample-check-7'),
      document.querySelector('.sample-check-8'),
      document.querySelector('.sample-check-roster')
    ];

    if (isSample) {{
      btn.innerHTML = '<span>🧹 Clear to Blank Form</span>';
      btn.classList.add('btn-emerald');
      btn.classList.remove('btn-outline');
      sampleShows.forEach(el => el.style.display = 'inline');
      sampleHides.forEach(el => el.style.display = 'none');
      checkBoxes.forEach(cb => cb && cb.classList.add('checked'));
    }} else {{
      btn.innerHTML = '<span>👁️ Preview Sample Data</span>';
      btn.classList.remove('btn-emerald');
      btn.classList.add('btn-outline');
      sampleShows.forEach(el => el.style.display = 'none');
      sampleHides.forEach(el => el.style.display = 'inline');
      checkBoxes.forEach(cb => cb && cb.classList.remove('checked'));
    }}
  }}

  function triggerPrint() {{
    window.print();
  }}
</script>

</body>
</html>
'''

# Save file in multiple strategic locations
paths = [
    '/home/khalfan/Desktop/musabaqa_madaris_form.html',
    '/home/khalfan/Desktop/musabaqa-admin/public/musabaqa_madaris_form.html',
    '/home/khalfan/Desktop/musabaqa-web/public/musabaqa_madaris_form.html',
]

for p in paths:
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w', encoding='utf-8') as f:
        f.write(html_content)
    print(f"Saved: {p}")

print("Now compiling standalone PDF exports via Chromium...")

# 1. Compile Single Form PDF (Portrait)
html_single = html_content.replace('<body>', '<body class="print-single-only">')
with open('/tmp/single_form_tmp.html', 'w', encoding='utf-8') as f:
    f.write(html_single)

cmd_single = [
    'chromium', '--headless', '--disable-gpu', '--no-sandbox',
    '--print-to-pdf=/home/khalfan/Desktop/Madrasa_Single_Registration_Form_A4.pdf',
    '/tmp/single_form_tmp.html'
]
subprocess.run(cmd_single, check=True)
print("Generated: /home/khalfan/Desktop/Madrasa_Single_Registration_Form_A4.pdf")

# 2. Compile Roster Form PDF (Landscape)
html_roster = html_content.replace('<body>', '<body class="print-roster-only">')
with open('/tmp/roster_form_tmp.html', 'w', encoding='utf-8') as f:
    f.write(html_roster)

cmd_roster = [
    'chromium', '--headless', '--disable-gpu', '--no-sandbox',
    '--print-to-pdf=/home/khalfan/Desktop/Madrasa_Multi_Intake_Roster_A4.pdf',
    '/tmp/roster_form_tmp.html'
]
subprocess.run(cmd_roster, check=True)
print("Generated: /home/khalfan/Desktop/Madrasa_Multi_Intake_Roster_A4.pdf")

# 3. Complete Pack PDF
cmd_all = [
    'chromium', '--headless', '--disable-gpu', '--no-sandbox',
    '--print-to-pdf=/home/khalfan/Desktop/Madrasa_Musabaqa_Intake_Complete_Pack.pdf',
    '/home/khalfan/Desktop/musabaqa_madaris_form.html'
]
subprocess.run(cmd_all, check=True)
print("Generated: /home/khalfan/Desktop/Madrasa_Musabaqa_Intake_Complete_Pack.pdf")

print("All printable forms and PDFs generated successfully!")

