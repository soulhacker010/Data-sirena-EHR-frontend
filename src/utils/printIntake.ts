import type { IntakeAssessment } from '../api/intakes'
import { MSE_FIELDS } from '../constants/clinicalFields'

interface ClientInfo {
    full_name: string
    date_of_birth?: string
    mrn?: string
}

interface ProviderInfo {
    first_name?: string
    last_name?: string
}

function val(data: Record<string, unknown>, key: string): string {
    const v = data[key]
    if (!v) return ''
    if (typeof v === 'string') return v
    return String(v)
}

function row(label: string, value: string, fullWidth = false): string {
    if (!value) return ''
    return `
        <div class="field-row${fullWidth ? ' full' : ''}">
            <span class="field-label">${label}</span>
            <span class="field-value">${value.replace(/\n/g, '<br>')}</span>
        </div>`
}

function section(num: number, title: string, content: string): string {
    if (!content.trim()) return ''
    return `
        <div class="section">
            <div class="section-header">
                <span class="section-num">${num}</span>
                <span class="section-title">${title}</span>
            </div>
            <div class="section-body">
                ${content}
            </div>
        </div>`
}

export function printIntake(
    intake: IntakeAssessment,
    client: ClientInfo | undefined,
    provider: ProviderInfo | undefined,
    orgName?: string,
): void {
    const d = intake.intake_data as Record<string, unknown>
    const providerName = provider
        ? `${provider.first_name || ''} ${provider.last_name || ''}`.trim()
        : val(d, 'provider_name')
    const assessmentDate = intake.assessment_date
        ? new Date(intake.assessment_date + 'T12:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : ''
    const dob = client?.date_of_birth
        ? new Date(client.date_of_birth + 'T12:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : ''
    const logoUrl = `${window.location.origin}/images/EHRlogo.png`
    const displayOrg = orgName || 'Mental Health Services'

    // ── Section 1: Client & Provider ────────────────────────────────────────
    const s1 = `
        <div class="info-grid">
            <div class="info-cell">
                <span class="info-label">Client Name</span>
                <span class="info-val">${client?.full_name || '—'}</span>
            </div>
            <div class="info-cell">
                <span class="info-label">Date of Birth</span>
                <span class="info-val">${dob || '—'}</span>
            </div>
            <div class="info-cell">
                <span class="info-label">MRN / Chart #</span>
                <span class="info-val">${client?.mrn || '—'}</span>
            </div>
            <div class="info-cell">
                <span class="info-label">Assessment Date</span>
                <span class="info-val">${assessmentDate || '—'}</span>
            </div>
            <div class="info-cell">
                <span class="info-label">Provider</span>
                <span class="info-val">${providerName || '—'}</span>
            </div>
            <div class="info-cell">
                <span class="info-label">NPI</span>
                <span class="info-val">${val(d, 'provider_npi') || '—'}</span>
            </div>
            ${val(d, 'referral_source') ? `
            <div class="info-cell full-span">
                <span class="info-label">Referral Source</span>
                <span class="info-val">${val(d, 'referral_source')}</span>
            </div>` : ''}
        </div>`

    // ── Section 2: Presenting Problem ────────────────────────────────────────
    const s2 = row('Chief Complaint', val(d, 'presenting_problem'), true)

    // ── Section 3: Diagnosis ─────────────────────────────────────────────────
    const secDx = (d.secondary_diagnoses as Array<{ code: string; label: string }> | undefined) || []
    const s3 = `
        ${row('Primary Diagnosis', val(d, 'primary_diagnosis'), true)}
        ${secDx.length > 0 ? `
        <div class="field-row full">
            <span class="field-label">Secondary Diagnoses</span>
            <span class="field-value">${secDx.map(dx => `${dx.code}${dx.label ? ' — ' + dx.label : ''}`).join('<br>')}</span>
        </div>` : ''}`

    // ── Section 4: Pertinent History ─────────────────────────────────────────
    const s4 = [
        { key: 'psychiatric_history', label: 'Psychiatric History' },
        { key: 'medical_history', label: 'Medical History' },
        { key: 'developmental_history', label: 'Developmental History' },
        { key: 'trauma_history', label: 'Trauma History' },
        { key: 'substance_use_history', label: 'Substance Use History' },
    ].map(f => row(f.label, val(d, f.key), true)).join('')

    // ── Section 5: MSE ───────────────────────────────────────────────────────
    const mseRows = MSE_FIELDS.map(f => {
        const raw = val(d, f.key)
        if (!raw) return ''
        return `<div class="mse-item"><span class="mse-label">${f.label}</span><span class="mse-val">${raw}</span></div>`
    }).join('')
    const s5 = mseRows ? `<div class="mse-grid">${mseRows}</div>` : ''

    // ── Section 6: Family / Psychosocial ────────────────────────────────────
    const s6 = [
        { key: 'family_composition', label: 'Family Composition / Living Situation' },
        { key: 'family_relationships', label: 'Family Relationships' },
        { key: 'social_functioning', label: 'Social Functioning' },
        { key: 'education_employment', label: 'Education / Employment' },
        { key: 'cultural_considerations', label: 'Cultural / Religious Considerations' },
    ].map(f => row(f.label, val(d, f.key), true)).join('')

    // ── Section 7: Risk Factors ──────────────────────────────────────────────
    const riskFactors = (d.intake_risk_factors as string[] | undefined) || []
    const riskLevel = val(d, 'risk_level') || val(d, 'overall_risk_level')
    const s7 = `
        ${riskLevel ? `<div class="field-row"><span class="field-label">Overall Risk Level</span><span class="field-value risk-${riskLevel.toLowerCase()}">${riskLevel}</span></div>` : ''}
        ${riskFactors.length > 0
            ? `<div class="field-row full"><span class="field-label">Risk Factors Present</span><span class="field-value">${riskFactors.join(' · ')}</span></div>`
            : '<div class="field-row full"><span class="field-label">Risk Factors</span><span class="field-value">None identified</span></div>'}
        ${row('Risk Explanation', val(d, 'risk_explanation'), true)}`

    // ── Section 8: Safety Plan ───────────────────────────────────────────────
    const spStatus = val(d, 'safety_plan_in_place')
    const spLabel = spStatus === 'yes' ? 'Yes — Safety plan in place' : spStatus === 'no' ? 'No — Not applicable' : spStatus === 'na' ? 'N/A' : ''
    const s8 = `
        ${spLabel ? `<div class="field-row full"><span class="field-label">Safety Plan Status</span><span class="field-value">${spLabel}</span></div>` : ''}
        ${row('Safety Plan Details', val(d, 'safety_plan_details'), true)}
        ${row('Explanation', val(d, 'safety_plan_explanation'), true)}`

    // ── Section 9: Strengths & Supports ─────────────────────────────────────
    const s9 = `
        ${row('Client Strengths', val(d, 'client_strengths'), true)}
        ${row('Support Systems', val(d, 'support_systems'), true)}
        ${row('Tentative Treatment Goals', val(d, 'tentative_goals'), true)}`

    // ── Section 10: Treatment Length & Frequency ─────────────────────────────
    const s10 = `
        ${row('Session Frequency', val(d, 'treatment_frequency'))}
        ${row('Session Duration', val(d, 'session_duration'))}
        ${row('Estimated Treatment Duration', val(d, 'treatment_duration'), true)}`

    // ── Section 11: Special Needs ────────────────────────────────────────────
    const s11 = row('Special Needs / Accommodations', val(d, 'special_needs'), true)

    // ── Section 12: Medical Necessity & Signatures ───────────────────────────
    const signedAt = intake.signed_at
        ? new Date(intake.signed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : null
    const clientSignedAt = intake.client_signed_at
        ? new Date(intake.client_signed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : null
    const s12 = `
        <div class="field-row full">
            <span class="field-label">Medical Necessity Statement</span>
            <span class="field-value">${(val(d, 'medical_necessity') || '').replace(/\n/g, '<br>')}</span>
        </div>
        <div class="signature-block">
            <div class="sig-col">
                <div class="sig-line"></div>
                <div class="sig-meta">
                    <strong>Provider Signature</strong><br>
                    ${intake.provider_name || providerName || ''}
                    ${signedAt ? `<br><span class="sig-date">Signed ${signedAt}</span>` : '<br><span class="sig-date sig-unsigned">Not yet signed</span>'}
                </div>
            </div>
            <div class="sig-col">
                <div class="sig-line"></div>
                <div class="sig-meta">
                    <strong>Client / Guardian Signature</strong><br>
                    ${client?.full_name || ''}
                    ${clientSignedAt ? `<br><span class="sig-date">Signed ${clientSignedAt}</span>` : '<br><span class="sig-date sig-unsigned">Not yet signed</span>'}
                </div>
            </div>
        </div>`

    const allSections = [
        section(1, 'Client &amp; Provider Information', s1),
        section(2, 'Presenting Problem / Chief Complaint', s2),
        section(3, 'Diagnosis', s3),
        section(4, 'Pertinent History', s4),
        section(5, 'Mental Status Exam', s5),
        section(6, 'Family / Psychosocial Assessment', s6),
        section(7, 'Risk Factors', s7),
        section(8, 'Safety Plan', s8),
        section(9, 'Strengths, Supports &amp; Treatment Goals', s9),
        section(10, 'Treatment Length &amp; Frequency', s10),
        section(11, 'Special Needs / Accommodations', s11),
        section(12, 'Medical Necessity &amp; Signatures', s12),
    ].join('')

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Intake Assessment — ${client?.full_name || ''}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10pt;
    line-height: 1.5;
    color: #0F172A;
    background: #fff;
  }
  .page { max-width: 780px; margin: 0 auto; padding: 0.5in 0.75in 0.75in; }

  /* ── Header ──────────────────────────────────────────── */
  .doc-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 14px;
    margin-bottom: 18px;
    border-bottom: 3px solid #0D9488;
  }
  .doc-header-left { display: flex; align-items: center; gap: 12px; }
  .doc-logo { height: 48px; width: auto; object-fit: contain; }
  .doc-org-text { }
  .doc-org {
    font-size: 12pt;
    font-weight: 700;
    color: #0F172A;
    letter-spacing: -0.3px;
  }
  .doc-subtitle {
    font-size: 8.5pt;
    color: #0D9488;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    margin-top: 1px;
  }
  .doc-header-right {
    text-align: right;
    font-size: 8.5pt;
    color: #475569;
    line-height: 1.8;
  }
  .doc-header-right strong { color: #0F172A; font-size: 10pt; }

  /* ── Sections ────────────────────────────────────────── */
  .section { margin-bottom: 12px; page-break-inside: avoid; }
  .section-header {
    display: flex;
    align-items: center;
    background: linear-gradient(135deg, #0D9488, #06B6D4);
    color: #fff;
    padding: 5px 10px;
    border-radius: 3px 3px 0 0;
  }
  .section-num {
    font-size: 7.5pt;
    font-weight: 700;
    background: rgba(255,255,255,0.2);
    border-radius: 3px;
    padding: 1px 6px;
    margin-right: 8px;
    min-width: 22px;
    text-align: center;
    letter-spacing: 0.3px;
  }
  .section-title { font-size: 9.5pt; font-weight: 600; letter-spacing: 0.2px; }
  .section-body {
    border: 1px solid #E2E8F0;
    border-top: none;
    border-radius: 0 0 3px 3px;
    padding: 10px 12px;
    background: #fff;
  }

  /* ── Field Rows ──────────────────────────────────────── */
  .field-row {
    display: grid;
    grid-template-columns: 175px 1fr;
    gap: 6px;
    padding: 4px 0;
    border-bottom: 1px solid #F1F5F9;
  }
  .field-row:last-child { border-bottom: none; }
  .field-label { font-size: 8.5pt; font-weight: 600; color: #475569; padding-top: 1px; }
  .field-value { font-size: 9.5pt; color: #0F172A; }

  /* ── Client Info Grid ────────────────────────────────── */
  .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; }
  .info-cell {
    padding: 7px 10px;
    border-right: 1px solid #E2E8F0;
    border-bottom: 1px solid #E2E8F0;
  }
  .info-cell:nth-child(3n) { border-right: none; }
  .info-cell.full-span { grid-column: 1 / -1; border-right: none; }
  .info-cell:last-child { border-bottom: none; }
  .info-label {
    display: block;
    font-size: 7pt;
    font-weight: 700;
    color: #94A3B8;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    margin-bottom: 2px;
  }
  .info-val { display: block; font-size: 10pt; color: #0F172A; font-weight: 500; }

  /* ── MSE Grid ────────────────────────────────────────── */
  .mse-grid { display: grid; grid-template-columns: 1fr 1fr; }
  .mse-item {
    display: flex;
    gap: 6px;
    padding: 4px 6px;
    border-bottom: 1px solid #F1F5F9;
    border-right: 1px solid #F1F5F9;
  }
  .mse-item:nth-child(2n) { border-right: none; }
  .mse-label { font-size: 8pt; font-weight: 600; color: #475569; min-width: 108px; }
  .mse-val { font-size: 9pt; color: #0F172A; }

  /* ── Risk ────────────────────────────────────────────── */
  .risk-none, .risk-low { color: #0F766E; font-weight: 700; }
  .risk-moderate { color: #B45309; font-weight: 700; }
  .risk-high, .risk-imminent { color: #B91C1C; font-weight: 700; }

  /* ── Signatures ──────────────────────────────────────── */
  .signature-block {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 32px;
    margin-top: 24px;
    padding-top: 14px;
    border-top: 1px solid #E2E8F0;
  }
  .sig-line { height: 44px; border-bottom: 1.5px solid #0D9488; margin-bottom: 6px; }
  .sig-meta { font-size: 8.5pt; color: #374151; line-height: 1.7; }
  .sig-date { color: #94A3B8; font-size: 7.5pt; }
  .sig-unsigned { color: #F59E0B; }

  /* ── Footer ──────────────────────────────────────────── */
  .doc-footer {
    margin-top: 18px;
    padding-top: 8px;
    border-top: 1px solid #E2E8F0;
    display: flex;
    justify-content: space-between;
    font-size: 7.5pt;
    color: #94A3B8;
  }
  .doc-footer span:first-child { color: #0D9488; font-weight: 600; }

  /* ── Print ───────────────────────────────────────────── */
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
      <div class="doc-org-text">
        <div class="doc-org">${displayOrg}</div>
        <div class="doc-subtitle">Intake Assessment</div>
      </div>
    </div>
    <div class="doc-header-right">
      <strong>${client?.full_name || '—'}</strong><br>
      DOB: ${dob || '—'}&nbsp;&nbsp;·&nbsp;&nbsp;MRN: ${client?.mrn || '—'}<br>
      Date: ${assessmentDate || '—'}
    </div>
  </div>

  ${allSections}

  <div class="doc-footer">
    <span>${displayOrg} — Confidential Clinical Record</span>
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
