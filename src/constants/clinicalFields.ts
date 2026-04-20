/**
 * Clinical field definitions for SOAP notes.
 *
 * BUILD 2.1 — MSE (Mental Status Exam) structured dropdowns
 * BUILD 2.4 — ABA data field definitions
 * BUILD 2.5 — Risk Assessment field definitions
 *
 * Each field has: key (stored in note_data), label, and options array.
 */

// ─── MSE Fields (13 structured dropdowns) ───────────────────────────────────

export interface ClinicalFieldDef {
    key: string
    label: string
    options: string[]
}

export const MSE_FIELDS: ClinicalFieldDef[] = [
    {
        key: 'mse_appearance',
        label: 'Appearance',
        options: [
            'Within Normal Limits (WNL)',
            'Well-groomed',
            'Disheveled',
            'Appropriate for age/setting',
            'Inappropriate',
            'Bizarre',
            'Malodorous',
            'Casually dressed',
            'Poorly nourished',
            'Other (specify)',
        ],
    },
    {
        key: 'mse_orientation',
        label: 'Orientation',
        options: [
            'Within Normal Limits (WNL)',
            'Oriented x4 (person, place, time, situation)',
            'Oriented x3 (person, place, time)',
            'Oriented x2 (person, place)',
            'Oriented x1 (person only)',
            'Disoriented',
            'Other (specify)',
        ],
    },
    {
        key: 'mse_behavior',
        label: 'Behavior',
        options: [
            'Within Normal Limits (WNL)',
            'Cooperative',
            'Uncooperative',
            'Agitated',
            'Guarded',
            'Hostile',
            'Withdrawn',
            'Psychomotor retardation',
            'Psychomotor agitation',
            'Calm',
            'Other (specify)',
        ],
    },
    {
        key: 'mse_speech',
        label: 'Speech',
        options: [
            'Within Normal Limits (WNL)',
            'Normal rate and rhythm',
            'Pressured',
            'Slow',
            'Loud',
            'Soft/whispered',
            'Monotone',
            'Tangential',
            'Stuttering',
            'Mute',
            'Other (specify)',
        ],
    },
    {
        key: 'mse_affect',
        label: 'Affect',
        options: [
            'Within Normal Limits (WNL)',
            'Appropriate',
            'Flat',
            'Blunted',
            'Labile',
            'Constricted',
            'Broad',
            'Anxious',
            'Tearful',
            'Irritable',
            'Other (specify)',
        ],
    },
    {
        key: 'mse_mood',
        label: 'Mood',
        options: [
            'Within Normal Limits (WNL)',
            'Euthymic',
            'Happy',
            'Content',
            'Hopeful',
            'Calm',
            'Motivated',
            'Depressed',
            'Anxious',
            'Irritable',
            'Euphoric',
            'Angry',
            'Hopeless',
            'Fearful',
            'Apathetic',
            'Other (specify)',
        ],
    },
    {
        key: 'mse_thought_process',
        label: 'Thought Process',
        options: [
            'Within Normal Limits (WNL)',
            'Logical and goal-directed',
            'Tangential',
            'Circumstantial',
            'Loose associations',
            'Flight of ideas',
            'Perseverative',
            'Thought blocking',
            'Disorganized',
            'Other (specify)',
        ],
    },
    {
        key: 'mse_thought_content',
        label: 'Thought Content',
        options: [
            'Within Normal Limits (WNL)',
            'No suicidal or homicidal ideation',
            'Suicidal ideation (passive)',
            'Suicidal ideation (active)',
            'Homicidal ideation',
            'Delusions',
            'Obsessions',
            'Phobias',
            'Paranoia',
            'Other (specify)',
        ],
    },
    {
        key: 'mse_perception',
        label: 'Perception',
        options: [
            'Within Normal Limits (WNL)',
            'No hallucinations',
            'Auditory hallucinations',
            'Visual hallucinations',
            'Tactile hallucinations',
            'Illusions',
            'Derealization',
            'Depersonalization',
            'Other (specify)',
        ],
    },
    {
        key: 'mse_judgement',
        label: 'Judgement',
        options: ['Within Normal Limits (WNL)', 'Good', 'Fair', 'Poor', 'Impaired', 'Other (specify)'],
    },
    {
        key: 'mse_insight',
        label: 'Insight',
        options: ['Within Normal Limits (WNL)', 'Good', 'Fair', 'Poor', 'Limited', 'Absent', 'Other (specify)'],
    },
    {
        key: 'mse_appetite',
        label: 'Appetite',
        options: ['Within Normal Limits (WNL)', 'Normal', 'Increased', 'Decreased', 'Poor', 'Binge eating', 'Other (specify)'],
    },
    {
        key: 'mse_sleep',
        label: 'Sleep',
        options: [
            'Within Normal Limits (WNL)',
            'Normal',
            'Insomnia (initial)',
            'Insomnia (middle)',
            'Insomnia (terminal)',
            'Hypersomnia',
            'Disrupted',
            'Nightmares',
            'Other (specify)',
        ],
    },
]

// ─── ABA Session Fields (BUILD 2.4) ─────────────────────────────────────────

export const ABA_CPT_CODES = ['97151', '97152', '97153', '97154', '97155', '97156', '97157', '97158']

export const ABA_FIELDS: ClinicalFieldDef[] = [
    {
        key: 'aba_goals_targeted',
        label: 'Goals Targeted',
        options: [],
    },
    {
        key: 'aba_prompt_level',
        label: 'Prompt Level',
        options: [
            'Independent',
            'Gestural',
            'Verbal',
            'Model',
            'Partial physical',
            'Full physical',
        ],
    },
]

// ─── Risk Assessment Fields (BUILD 2.5) ──────────────────────────────────────

export const RISK_LEVEL_OPTIONS = ['None', 'Low', 'Moderate', 'High', 'Imminent']

export const RISK_FACTOR_OPTIONS = [
    'History of suicide attempts',
    'Family history of suicide',
    'Access to lethal means',
    'Recent loss or stressor',
    'Chronic pain or illness',
    'Substance abuse',
    'Social isolation',
    'History of trauma/abuse',
    'Command hallucinations',
    'Non-adherence to treatment',
    'Recent discharge from inpatient',
    'Impulsivity',
]

export const RISK_PROTECTIVE_FACTORS = [
    'Strong social support',
    'Engaged in treatment',
    'Future-oriented thinking',
    'Religious/spiritual beliefs',
    'Responsibility to children/family',
    'Fear of death',
    'Positive therapeutic alliance',
    'Stable housing',
    'Employment/school engagement',
]

export const RISK_ACTIONS_TAKEN = [
    'Safety plan reviewed/updated',
    'Means restriction counseling',
    'Emergency contacts reviewed',
    'Crisis hotline numbers provided',
    'Increased session frequency',
    'Referred to higher level of care',
    'Family/support person contacted',
    'Consulted with supervisor',
    'No action needed at this time',
]

// ─── Interventions Multi-Select (BUILD 2.9) ─────────────────────────────────

export const INTERVENTION_OPTIONS = [
    'Cognitive Behavioral Therapy (CBT)',
    'Dialectical Behavior Therapy (DBT)',
    'Motivational Interviewing',
    'Psychoeducation',
    'Behavioral Activation',
    'Exposure Therapy',
    'Mindfulness/Relaxation Training',
    'Crisis Intervention',
    'Supportive Counseling',
    'Solution-Focused Therapy',
    'Play Therapy',
    'Parent Training',
    'Social Skills Training',
    'Applied Behavior Analysis (ABA)',
    'Discrete Trial Training (DTT)',
    'Natural Environment Teaching (NET)',
    'Functional Communication Training',
    'Token Economy/Reinforcement',
    'Prompting/Fading',
    'Task Analysis',
]
