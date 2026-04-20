/**
 * Premium PDF export for Treatment Plans.
 * Opens a formatted print window — browser "Save as PDF" produces a real
 * text-based vector PDF, not a screenshot.
 */

import type { TreatmentPlan, TreatmentPlanGoal } from '../api/treatmentPlans'

const GOAL_STATUS_LABELS: Record<string, string> = {
    new: 'New',
    continued: 'Continued',
    modified: 'Modified',
    met: 'Met',
    discontinued: 'Discontinued',
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

function goalCard(goal: TreatmentPlanGoal, index: number): string {
    const statusLabel = GOAL_STATUS_LABELS[goal.status] || goal.status
    const statusClass = goal.status === 'met' ? 'status-met'
        : goal.status === 'discontinued' ? 'status-disc'
        : 'status-active'
    return `
        <div class="goal-card">
            <div class="goal-card-header">
                <span class="goal-num">Goal ${index + 1}</span>
                <span class="goal-type">${goal.goal_type || ''}</span>
                <span class="goal-status ${statusClass}">${statusLabel}</span>
                ${goal.target_date ? `<span class="goal-target">Target: ${goal.target_date}</span>` : ''}
            </div>
            ${goal.problem ? `<div class="goal-row"><span class="goal-label">Problem</span><span class="goal-val">${goal.problem.replace(/\n/g, '<br>')}</span></div>` : ''}
            ${goal.long_term_goal ? `<div class="goal-row"><span class="goal-label">Long-Term Goal</span><span class="goal-val">${goal.long_term_goal.replace(/\n/g, '<br>')}</span></div>` : ''}
            ${goal.objectives ? `<div class="goal-row"><span class="goal-label">Objectives</span><span class="goal-val">${goal.objectives.replace(/\n/g, '<br>')}</span></div>` : ''}
            ${goal.progress ? `<div class="goal-row"><span class="goal-label">Progress</span><span class="goal-val">${goal.progress.replace(/\n/g, '<br>')}</span></div>` : ''}
            ${goal.notes ? `<div class="goal-row"><span class="goal-label">Notes</span><span class="goal-val">${goal.notes.replace(/\n/g, '<br>')}</span></div>` : ''}
        </div>`
}

function secondaryDxRow(data: Record<string, unknown>): string {
    const dx = data.secondary_diagnoses as Array<{ code: string; label: string }> | undefined
    if (!dx?.length) return ''
    return `<div class="field-row"><span class="field-label">Secondary Diagnoses</span><span class="field-value">${dx.map(d => `${d.code} — ${d.label}`).join('<br>')}</span></div>`
}

export function printTreatmentPlan(plan: TreatmentPlan, organizationName?: string): void {
    const d = plan.plan_data || {}
    const logoUrl = `${window.location.origin}/images/EHRlogo.png`
    const orgName = organizationName || 'Mental Health Services'

    const fmt = (dateStr: string | null | undefined) =>
        dateStr ? new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'

    const startDate = fmt(plan.start_date)
    const reviewDate = plan.review_date ? fmt(plan.review_date) : '—'
    const signedDate = plan.signed_at ? new Date(plan.signed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : null

    const interventions = (d.interventions_checklist as string[] | undefined) || []

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Treatment Plan — ${plan.client_name || ''} ${startDate}</title>
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

  /* Goal cards */
  .goal-card { border: 1px solid #E2E8F0; border-radius: 4px; margin-bottom: 10px; page-break-inside: avoid; }
  .goal-card:last-child { margin-bottom: 0; }
  .goal-card-header { display: flex; align-items: center; gap: 8px; background: #F8FAFC; padding: 6px 10px; border-bottom: 1px solid #E2E8F0; border-radius: 3px 3px 0 0; flex-wrap: wrap; }
  .goal-num { font-size: 8pt; font-weight: 700; color: #0D9488; }
  .goal-type { font-size: 7.5pt; color: #475569; background: #E2E8F0; padding: 1px 6px; border-radius: 10px; }
  .goal-status { font-size: 7.5pt; font-weight: 700; padding: 1px 6px; border-radius: 10px; }
  .goal-target { font-size: 7.5pt; color: #64748B; margin-left: auto; }
  .status-active { background: #DCFCE7; color: #166534; }
  .status-met { background: #DBEAFE; color: #1E40AF; }
  .status-disc { background: #FEE2E2; color: #991B1B; }
  .goal-row { display: grid; grid-template-columns: 130px 1fr; gap: 6px; padding: 4px 10px; border-bottom: 1px solid #F8FAFC; }
  .goal-row:last-child { border-bottom: none; }
  .goal-label { font-size: 8pt; font-weight: 600; color: #475569; }
  .goal-val { font-size: 9pt; color: #0F172A; line-height: 1.5; }

  /* Interventions chips */
  .chip-list { display: flex; flex-wrap: wrap; gap: 4px; }
  .chip { font-size: 8pt; background: #F0FDFA; color: #0F766E; border: 1px solid #99F6E4; border-radius: 12px; padding: 2px 8px; }

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
    .section, .goal-card { page-break-inside: avoid; }
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
        <div class="doc-subtitle">Treatment Plan</div>
      </div>
    </div>
    <div class="doc-header-right">
      <strong>${plan.client_name || '—'}</strong><br>
      Start: ${startDate}&nbsp;&nbsp;·&nbsp;&nbsp;Review: ${reviewDate}
    </div>
  </div>

  <div class="meta-bar">
    <div class="meta-cell"><span class="meta-label">Provider</span><span class="meta-val">${plan.provider_name || '—'}</span></div>
    <div class="meta-cell"><span class="meta-label">Start Date</span><span class="meta-val">${startDate}</span></div>
    <div class="meta-cell"><span class="meta-label">Review Date</span><span class="meta-val">${reviewDate}</span></div>
    <div class="meta-cell"><span class="meta-label">Status</span><span class="meta-val">${plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}</span></div>
  </div>

  <!-- Diagnosis -->
  <div class="section">
    <div class="section-header"><span class="section-num">DX</span><span class="section-title">Diagnosis</span></div>
    <div class="section-body">
      ${val(d, 'primary_diagnosis') ? `<div class="field-row"><span class="field-label">Primary Diagnosis</span><span class="field-value">${val(d, 'primary_diagnosis')}</span></div>` : ''}
      ${secondaryDxRow(d)}
      ${val(d, 'authorization_number') ? `<div class="field-row"><span class="field-label">Authorization #</span><span class="field-value">${val(d, 'authorization_number')}</span></div>` : ''}
      ${!val(d, 'primary_diagnosis') && !secondaryDxRow(d) ? '<p style="color:#94A3B8;font-size:9pt">No diagnosis recorded.</p>' : ''}
    </div>
  </div>

  <!-- Treatment Goals -->
  <div class="section">
    <div class="section-header"><span class="section-num">GOALS</span><span class="section-title">Treatment Goals & Objectives</span></div>
    <div class="section-body">
      ${plan.goals && plan.goals.length > 0
        ? plan.goals.map((g, i) => goalCard(g, i)).join('')
        : '<p style="color:#94A3B8;font-size:9pt">No goals recorded.</p>'}
    </div>
  </div>

  <!-- Interventions -->
  ${interventions.length ? `
  <div class="section">
    <div class="section-header"><span class="section-num">INT</span><span class="section-title">Interventions / Modalities</span></div>
    <div class="section-body">
      <div class="chip-list">${interventions.map(i => `<span class="chip">${i}</span>`).join('')}</div>
    </div>
  </div>` : ''}

  <!-- Frequency & Duration -->
  ${val(d, 'frequency') || val(d, 'session_duration') || val(d, 'duration') ? `
  <div class="section">
    <div class="section-header"><span class="section-num">FREQ</span><span class="section-title">Frequency & Duration of Services</span></div>
    <div class="section-body">
      ${val(d, 'frequency') ? `<div class="field-row"><span class="field-label">Frequency</span><span class="field-value">${val(d, 'frequency')}</span></div>` : ''}
      ${val(d, 'session_duration') ? `<div class="field-row"><span class="field-label">Session Duration</span><span class="field-value">${val(d, 'session_duration')}</span></div>` : ''}
      ${val(d, 'duration') ? `<div class="field-row"><span class="field-label">Treatment Duration</span><span class="field-value">${val(d, 'duration')}</span></div>` : ''}
    </div>
  </div>` : ''}

  <!-- Involvement -->
  ${val(d, 'family_involvement') || val(d, 'school_iep_involvement') || val(d, 'other_provider_involvement') ? `
  <div class="section">
    <div class="section-header"><span class="section-num">INV</span><span class="section-title">Involvement of Others</span></div>
    <div class="section-body">
      ${block('Family Involvement', val(d, 'family_involvement'))}
      ${block('School / IEP Coordination', val(d, 'school_iep_involvement'))}
      ${block('Other Providers', val(d, 'other_provider_involvement'))}
    </div>
  </div>` : ''}

  <!-- Special Needs -->
  ${val(d, 'special_needs') ? `
  <div class="section">
    <div class="section-header"><span class="section-num">SN</span><span class="section-title">Special Needs & Accommodations</span></div>
    <div class="section-body">
      ${block('Special Needs', val(d, 'special_needs'))}
    </div>
  </div>` : ''}

  <!-- Strengths & Support -->
  ${val(d, 'client_strengths') || val(d, 'support_systems') || val(d, 'tentative_goals') ? `
  <div class="section">
    <div class="section-header"><span class="section-num">STR</span><span class="section-title">Strengths & Support Systems</span></div>
    <div class="section-body">
      ${block('Client Strengths', val(d, 'client_strengths'))}
      ${block('Support Systems', val(d, 'support_systems'))}
      ${block('Tentative Goals', val(d, 'tentative_goals'))}
    </div>
  </div>` : ''}

  <!-- Medical Necessity -->
  <div class="section">
    <div class="section-header"><span class="section-num">MN</span><span class="section-title">Medical Necessity Statement</span></div>
    <div class="section-body">
      ${block('Medical Necessity', val(d, 'medical_necessity') || 'The services outlined in this treatment plan are medically necessary to address the client\'s presenting diagnosis and functional impairments.')}
    </div>
  </div>

  <!-- Signature Block -->
  <div class="section">
    <div class="section-header"><span class="section-num">SIG</span><span class="section-title">Signatures</span></div>
    <div class="section-body">
      <div class="signature-block">
        <div>
          <div class="sig-line"></div>
          <div class="sig-meta">
            <strong>Clinician / Provider</strong><br>
            ${plan.provider_name || ''}
            ${signedDate ? `<br><span class="sig-date">Signed ${signedDate}</span>` : '<br><span class="sig-unsigned sig-date">Not yet signed</span>'}
          </div>
        </div>
        <div>
          <div class="sig-line"></div>
          <div class="sig-meta">
            <strong>Supervisor / Co-Signer</strong><br>
            ${plan.co_signer_name || '&nbsp;'}<br>
            ${plan.co_signed_at ? `<span class="sig-date">Signed ${new Date(plan.co_signed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>` : '<span class="sig-date">Date: _______________</span>'}
          </div>
        </div>
      </div>
      <div style="margin-top:18px;">
        <div class="sig-line"></div>
        <div class="sig-meta" style="margin-top:4px;">
          <strong>Client / Guardian Signature</strong>&nbsp;&nbsp;&nbsp;
          <span class="sig-date">Date: _______________</span>
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
