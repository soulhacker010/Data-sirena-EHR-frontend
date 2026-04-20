/**
 * Premium PDF export for Session Notes.
 * Opens a formatted print window — browser "Save as PDF" produces a
 * real text-based vector PDF, not a screenshot.
 */

export interface NotePrintData {
    id: string
    client_name?: string
    provider_name?: string
    session_date?: string
    service_code?: string
    status: string
    signed_at?: string
    note_data: Record<string, unknown>
    organization_name?: string
    mrn?: string
}

function val(data: Record<string, unknown>, key: string): string {
    const v = data[key]
    if (!v) return ''
    if (typeof v === 'string') return v
    return String(v)
}

function block(label: string, value: string): string {
    if (!value.trim()) return ''
    return `
        <div class="note-block">
            <div class="note-block-label">${label}</div>
            <div class="note-block-body">${value.replace(/\n/g, '<br>')}</div>
        </div>`
}

function mseSection(data: Record<string, unknown>): string {
    const MSE_KEYS = [
        { key: 'mse_appearance', label: 'Appearance' },
        { key: 'mse_orientation', label: 'Orientation' },
        { key: 'mse_behavior', label: 'Behavior' },
        { key: 'mse_speech', label: 'Speech' },
        { key: 'mse_affect', label: 'Affect' },
        { key: 'mse_mood', label: 'Mood' },
        { key: 'mse_thought_process', label: 'Thought Process' },
        { key: 'mse_thought_content', label: 'Thought Content' },
        { key: 'mse_perception', label: 'Perception' },
        { key: 'mse_judgement', label: 'Judgement' },
        { key: 'mse_insight', label: 'Insight' },
        { key: 'mse_appetite', label: 'Appetite' },
        { key: 'mse_sleep', label: 'Sleep' },
    ]
    const rows = MSE_KEYS.map(f => {
        const v = val(data, f.key)
        if (!v) return ''
        return `<div class="mse-item"><span class="mse-label">${f.label}</span><span class="mse-val">${v}</span></div>`
    }).join('')
    if (!rows) return ''
    return `
        <div class="section">
            <div class="section-header"><span class="section-num">MSE</span><span class="section-title">Mental Status Exam</span></div>
            <div class="section-body"><div class="mse-grid">${rows}</div></div>
        </div>`
}

function riskSection(data: Record<string, unknown>): string {
    const level = val(data, 'risk_level') || val(data, 'overall_risk_level')
    const factors = (data.risk_factors as string[] | undefined) || []
    const protective = (data.protective_factors as string[] | undefined) || []
    const actions = (data.actions_taken as string[] | undefined) || []
    const notes = val(data, 'risk_notes')
    if (!level && !factors.length && !notes) return ''
    const riskClass = level ? `risk-${level.toLowerCase()}` : ''
    return `
        <div class="section">
            <div class="section-header"><span class="section-num">RISK</span><span class="section-title">Risk Assessment</span></div>
            <div class="section-body">
                ${level ? `<div class="field-row"><span class="field-label">Overall Risk</span><span class="field-value ${riskClass}">${level}</span></div>` : ''}
                ${factors.length ? `<div class="field-row"><span class="field-label">Risk Factors</span><span class="field-value">${factors.join(' · ')}</span></div>` : ''}
                ${protective.length ? `<div class="field-row"><span class="field-label">Protective Factors</span><span class="field-value">${protective.join(' · ')}</span></div>` : ''}
                ${actions.length ? `<div class="field-row"><span class="field-label">Actions Taken</span><span class="field-value">${actions.join(' · ')}</span></div>` : ''}
                ${notes ? `<div class="field-row"><span class="field-label">Risk Notes</span><span class="field-value">${notes}</span></div>` : ''}
            </div>
        </div>`
}

export function printNote(note: NotePrintData): void {
    const d = note.note_data
    const logoUrl = `${window.location.origin}/images/EHRlogo.png`
    const orgName = note.organization_name || 'Mental Health Services'
    const sessionDate = note.session_date
        ? new Date(note.session_date + 'T12:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : ''
    const signedDate = note.signed_at
        ? new Date(note.signed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : null

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Session Note — ${note.client_name || ''} ${sessionDate}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; line-height: 1.5; color: #0F172A; background: #fff; }
  .page { max-width: 780px; margin: 0 auto; padding: 0.5in 0.75in 0.75in; }

  .doc-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 14px; margin-bottom: 18px; border-bottom: 3px solid #0D9488; }
  .doc-header-left { display: flex; align-items: center; gap: 12px; }
  .doc-logo { height: 44px; width: auto; }
  .doc-org { font-size: 12pt; font-weight: 700; color: #0F172A; }
  .doc-subtitle { font-size: 8.5pt; color: #0D9488; font-weight: 600; text-transform: uppercase; letter-spacing: 1.2px; margin-top: 1px; }
  .doc-header-right { text-align: right; font-size: 8.5pt; color: #475569; line-height: 1.8; }
  .doc-header-right strong { color: #0F172A; font-size: 10pt; }

  .meta-bar { display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid #E2E8F0; border-radius: 4px; margin-bottom: 16px; }
  .meta-cell { padding: 7px 10px; border-right: 1px solid #E2E8F0; }
  .meta-cell:last-child { border-right: none; }
  .meta-label { display: block; font-size: 7pt; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 2px; }
  .meta-val { display: block; font-size: 9.5pt; font-weight: 600; color: #0F172A; }

  .section { margin-bottom: 12px; page-break-inside: avoid; }
  .section-header { display: flex; align-items: center; background: linear-gradient(135deg, #0D9488, #06B6D4); color: #fff; padding: 5px 10px; border-radius: 3px 3px 0 0; }
  .section-num { font-size: 7.5pt; font-weight: 700; background: rgba(255,255,255,0.2); border-radius: 3px; padding: 1px 6px; margin-right: 8px; }
  .section-title { font-size: 9.5pt; font-weight: 600; }
  .section-body { border: 1px solid #E2E8F0; border-top: none; border-radius: 0 0 3px 3px; padding: 10px 12px; }

  .note-block { padding: 6px 0; border-bottom: 1px solid #F1F5F9; }
  .note-block:last-child { border-bottom: none; }
  .note-block-label { font-size: 8pt; font-weight: 700; color: #0D9488; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
  .note-block-body { font-size: 9.5pt; color: #0F172A; line-height: 1.6; }

  .field-row { display: grid; grid-template-columns: 160px 1fr; gap: 6px; padding: 4px 0; border-bottom: 1px solid #F1F5F9; }
  .field-row:last-child { border-bottom: none; }
  .field-label { font-size: 8.5pt; font-weight: 600; color: #475569; }
  .field-value { font-size: 9.5pt; color: #0F172A; }

  .mse-grid { display: grid; grid-template-columns: 1fr 1fr; }
  .mse-item { display: flex; gap: 6px; padding: 4px 6px; border-bottom: 1px solid #F1F5F9; border-right: 1px solid #F1F5F9; }
  .mse-item:nth-child(2n) { border-right: none; }
  .mse-label { font-size: 8pt; font-weight: 600; color: #475569; min-width: 108px; }
  .mse-val { font-size: 9pt; color: #0F172A; }

  .risk-none, .risk-low { color: #0F766E; font-weight: 700; }
  .risk-moderate { color: #B45309; font-weight: 700; }
  .risk-high, .risk-imminent { color: #B91C1C; font-weight: 700; }

  .signature-block { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 24px; padding-top: 14px; border-top: 1px solid #E2E8F0; }
  .sig-line { height: 44px; border-bottom: 1.5px solid #0D9488; margin-bottom: 6px; }
  .sig-meta { font-size: 8.5pt; color: #374151; line-height: 1.7; }
  .sig-date { color: #94A3B8; font-size: 7.5pt; }
  .sig-unsigned { color: #F59E0B; }

  .doc-footer { margin-top: 18px; padding-top: 8px; border-top: 1px solid #E2E8F0; display: flex; justify-content: space-between; font-size: 7.5pt; color: #94A3B8; }
  .doc-footer span:first-child { color: #0D9488; font-weight: 600; }

  @media print {
    body { font-size: 9.5pt; }
    .page { padding: 0; max-width: 100%; }
    .section { page-break-inside: avoid; }
    @page { size: letter; margin: 0.75in 0.75in 0.85in; }
  }
</style>
</head>
<body>
<div class="page">

  <div class="doc-header">
    <div class="doc-header-left">
      <img src="${logoUrl}" alt="Sirena Health EHR" class="doc-logo" />
      <div>
        <div class="doc-org">${orgName}</div>
        <div class="doc-subtitle">Session Note</div>
      </div>
    </div>
    <div class="doc-header-right">
      <strong>${note.client_name || '—'}</strong><br>
      ${note.mrn ? `MRN: ${note.mrn}&nbsp;&nbsp;·&nbsp;&nbsp;` : ''}Date: ${sessionDate || '—'}
    </div>
  </div>

  <div class="meta-bar">
    <div class="meta-cell"><span class="meta-label">Provider</span><span class="meta-val">${note.provider_name || '—'}</span></div>
    <div class="meta-cell"><span class="meta-label">Service Code</span><span class="meta-val">${note.service_code || '—'}</span></div>
    <div class="meta-cell"><span class="meta-label">Session Date</span><span class="meta-val">${sessionDate || '—'}</span></div>
    <div class="meta-cell"><span class="meta-label">Status</span><span class="meta-val">${note.status.charAt(0).toUpperCase() + note.status.slice(1)}</span></div>
  </div>

  <div class="section">
    <div class="section-header"><span class="section-num">S</span><span class="section-title">Subjective / Presenting Concerns</span></div>
    <div class="section-body">
      ${block('Objectives / Presenting Concerns', val(d, 'objectives'))}
      ${!val(d, 'objectives') ? '<p style="color:#94A3B8;font-size:9pt">No subjective content recorded.</p>' : ''}
    </div>
  </div>

  <div class="section">
    <div class="section-header"><span class="section-num">O</span><span class="section-title">Interventions Used</span></div>
    <div class="section-body">
      ${block('Interventions', val(d, 'interventions'))}
      ${!val(d, 'interventions') ? '<p style="color:#94A3B8;font-size:9pt">No interventions recorded.</p>' : ''}
    </div>
  </div>

  ${mseSection(d)}
  ${riskSection(d)}

  <div class="section">
    <div class="section-header"><span class="section-num">A</span><span class="section-title">Assessment / Client Response</span></div>
    <div class="section-body">
      ${block('Client Response', val(d, 'client_response'))}
      ${block('Clinical Notes', val(d, 'notes'))}
      ${(!val(d, 'client_response') && !val(d, 'notes')) ? '<p style="color:#94A3B8;font-size:9pt">No assessment content recorded.</p>' : ''}
    </div>
  </div>

  <div class="section">
    <div class="section-header"><span class="section-num">P</span><span class="section-title">Plan / Next Session</span></div>
    <div class="section-body">
      ${block('Plan for Next Session', val(d, 'plan_next_session'))}
      ${!val(d, 'plan_next_session') ? '<p style="color:#94A3B8;font-size:9pt">No plan recorded.</p>' : ''}
    </div>
  </div>

  <div class="section">
    <div class="section-header"><span class="section-num">SIG</span><span class="section-title">Provider Signature</span></div>
    <div class="section-body">
      <div class="signature-block">
        <div>
          <div class="sig-line"></div>
          <div class="sig-meta">
            <strong>Provider Signature</strong><br>
            ${note.provider_name || ''}
            ${signedDate ? `<br><span class="sig-date">Signed ${signedDate}</span>` : '<br><span class="sig-unsigned sig-date">Not yet signed</span>'}
          </div>
        </div>
        <div>
          <div class="sig-line"></div>
          <div class="sig-meta">
            <strong>Supervisor / Co-Signer</strong><br>
            &nbsp;<br>
            <span class="sig-date">Date: _______________</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="doc-footer">
    <span>${orgName} — Confidential Clinical Record</span>
    <span>Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
  </div>

</div>
<script>window.onload = function() { window.print(); };</script>
</body>
</html>`

    const win = window.open('', '_blank', 'width=900,height=700')
    if (!win) {
        alert('Pop-up blocked. Please allow pop-ups for this site to export PDFs.')
        return
    }
    win.document.write(html)
    win.document.close()
}
