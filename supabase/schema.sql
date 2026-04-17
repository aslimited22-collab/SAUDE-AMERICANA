-- ============================================================================
-- SlimRx Database Schema — HIPAA-compliant GLP-1 telehealth platform
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";     -- gen_random_uuid(), encryption
CREATE EXTENSION IF NOT EXISTS "pg_trgm";      -- fuzzy text search on names
CREATE EXTENSION IF NOT EXISTS "btree_gin";    -- composite GIN indexes

-- ─── LEADS ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name          text NOT NULL,
  email               text UNIQUE NOT NULL,
  phone               text,                        -- E.164 format (+1XXXXXXXXXX)
  quiz_answers        jsonb,
  qualification_score integer,                     -- 0-100 from AI agent
  qualification_notes text,                        -- AI reasoning
  qualified_at        timestamptz,
  disqualified_reason text,
  utm_source          text,
  utm_medium          text,
  utm_campaign        text,
  utm_content         text,
  referrer_url        text,
  converted           boolean DEFAULT false,
  stripe_customer_id  text,
  plan                text CHECK (plan IN ('starter', 'popular', 'premium')),
  subscription_id     text,
  subscription_status text DEFAULT 'pending',     -- pending|active|paused|canceled
  current_month       integer DEFAULT 1,           -- 1-9 treatment month
  last_followup_at    timestamptz,
  next_followup_at    timestamptz,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- ─── MEDICAL INTAKES ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS medical_intakes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id             uuid REFERENCES leads(id) ON DELETE RESTRICT,
  personal_info       jsonb NOT NULL,              -- name, DOB, address, phone
  medications         jsonb,                       -- [{name, dose, frequency}]
  allergies           text,
  medical_conditions  jsonb,                       -- [{condition, diagnosed_at}]
  vitals              jsonb,                       -- {weight_kg, height_cm, bmi, bp_systolic, bp_diastolic, heart_rate}
  weight_loss_history jsonb,                       -- previous GLP-1 use
  consent_signed      boolean NOT NULL DEFAULT false,
  signature_name      text,
  consent_ip          text,                        -- IP at time of consent (HIPAA)
  consent_user_agent  text,                        -- Browser UA at consent
  submitted_at        timestamptz DEFAULT now(),
  reviewed            boolean DEFAULT false,
  reviewed_at         timestamptz,
  reviewed_by         text,                        -- Provider ID
  provider_notes      text,
  ai_risk_score       integer,                     -- 0-100 from qualification agent
  ai_flags            jsonb,                       -- [{flag, severity, reason}]
  prescription_sent   boolean DEFAULT false,
  prescription_sent_at timestamptz,
  updated_at          timestamptz DEFAULT now()
);

-- ─── SUBSCRIPTIONS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id             uuid REFERENCES leads(id) ON DELETE RESTRICT,
  stripe_subscription_id text UNIQUE,
  stripe_customer_id  text,
  plan                text NOT NULL,
  status              text NOT NULL DEFAULT 'active',
  -- active | past_due | paused | canceled | incomplete | trialing
  current_period_start timestamptz,
  current_period_end  timestamptz,
  cancel_at           timestamptz,
  canceled_at         timestamptz,
  pause_start         timestamptz,
  pause_end           timestamptz,
  retry_count         integer DEFAULT 0,
  last_payment_at     timestamptz,
  last_payment_amount integer,                     -- cents
  retention_message_sent boolean DEFAULT false,
  cancellation_reason text,                        -- captured by billing agent
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- ─── PRESCRIPTIONS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prescriptions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id               uuid REFERENCES leads(id) ON DELETE RESTRICT,
  intake_id             uuid REFERENCES medical_intakes(id),
  medication_name       text NOT NULL,             -- semaglutide, tirzepatide
  dose_mg               numeric NOT NULL,
  frequency             text NOT NULL,             -- weekly
  quantity              integer NOT NULL,
  refills               integer DEFAULT 0,
  prescriber_id         text,                      -- NPI number
  prescriber_name       text,
  pharmacy_name         text,
  pharmacy_npi          text,
  pharmacy_dea          text,
  sent_to_pharmacy      boolean DEFAULT false,
  sent_at               timestamptz,
  pharmacy_confirmation text,
  shipped               boolean DEFAULT false,
  shipped_at            timestamptz,
  tracking_number       text,
  carrier               text,
  delivered             boolean DEFAULT false,
  delivered_at          timestamptz,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

-- ─── PATIENT MESSAGES ────────────────────────────────────────────────────────
-- Stores all inbound/outbound SMS/WhatsApp messages
CREATE TABLE IF NOT EXISTS patient_messages (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id             uuid REFERENCES leads(id) ON DELETE SET NULL,
  direction           text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  channel             text NOT NULL CHECK (channel IN ('sms', 'whatsapp', 'email')),
  from_number         text,
  to_number           text,
  body                text NOT NULL,
  media_urls          jsonb,                       -- [{url, content_type}]
  twilio_sid          text UNIQUE,
  status              text,                        -- sent|delivered|failed|received
  -- Classification by support agent
  intent              text,                        -- tracking|side_effects|dose_question|cancel|billing|other
  intent_confidence   numeric,                     -- 0.0-1.0
  escalated           boolean DEFAULT false,
  escalated_at        timestamptz,
  escalation_reason   text,
  ai_response         text,                        -- what agent replied
  agent_id            text,                        -- which agent handled it
  created_at          timestamptz DEFAULT now()
);

-- ─── PATIENT NOTIFICATIONS ───────────────────────────────────────────────────
-- Scheduled follow-up touchpoints managed by followup agent
CREATE TABLE IF NOT EXISTS patient_notifications (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id             uuid REFERENCES leads(id) ON DELETE CASCADE,
  notification_type   text NOT NULL,
  -- week_1_checkin | week_2_checkin | month_1_review | month_2_dose_increase
  -- month_3_midpoint | month_6_halfway | month_9_completion | missed_dose
  -- refill_reminder | side_effect_followup | win_back
  channel             text NOT NULL CHECK (channel IN ('sms', 'whatsapp', 'email')),
  scheduled_for       timestamptz NOT NULL,
  sent                boolean DEFAULT false,
  sent_at             timestamptz,
  message_id          uuid REFERENCES patient_messages(id),
  response_received   boolean DEFAULT false,
  response_at         timestamptz,
  notes               text,
  created_at          timestamptz DEFAULT now()
);

-- ─── AGENT TASKS ─────────────────────────────────────────────────────────────
-- Task queue for async agent operations
CREATE TABLE IF NOT EXISTS agent_tasks (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type          text NOT NULL,
  -- qualification | prescription | billing | support | followup
  task_type           text NOT NULL,               -- specific task within agent
  payload             jsonb NOT NULL,              -- input data
  status              text NOT NULL DEFAULT 'pending',
  -- pending | processing | completed | failed | escalated
  priority            integer DEFAULT 5,           -- 1=highest, 10=lowest
  attempt_count       integer DEFAULT 0,
  max_attempts        integer DEFAULT 3,
  last_error          text,
  result              jsonb,                       -- output from agent
  lead_id             uuid REFERENCES leads(id) ON DELETE SET NULL,
  scheduled_for       timestamptz DEFAULT now(),   -- when to process
  started_at          timestamptz,
  completed_at        timestamptz,
  escalated           boolean DEFAULT false,
  escalated_at        timestamptz,
  escalation_reason   text,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- ─── AUDIT LOGS ──────────────────────────────────────────────────────────────
-- HIPAA-required: immutable audit trail for all PHI access and agent actions
CREATE TABLE IF NOT EXISTS audit_logs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Who performed the action
  actor_type          text NOT NULL CHECK (actor_type IN ('agent', 'admin', 'system', 'patient', 'provider')),
  actor_id            text,                        -- agent name, user ID, etc.
  actor_ip            text,
  actor_user_agent    text,
  -- What happened
  action              text NOT NULL,               -- qualify_lead, send_prescription, charge_patient, etc.
  resource_type       text,                        -- lead, subscription, message, prescription
  resource_id         text,                        -- UUID of affected resource
  -- Details
  details             jsonb,                       -- action-specific metadata (no PHI in this field)
  phi_accessed        boolean DEFAULT false,       -- did this action access PHI?
  -- Outcome
  success             boolean NOT NULL DEFAULT true,
  error_message       text,
  -- HIPAA fields
  patient_id          uuid REFERENCES leads(id) ON DELETE SET NULL,
  -- Timing
  created_at          timestamptz DEFAULT now()
  -- NOTE: No UPDATE/DELETE allowed on audit_logs — enforced by RLS policy
);

-- ─── ADMIN SESSIONS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_sessions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email         text NOT NULL,
  token_hash          text NOT NULL UNIQUE,        -- bcrypt hash of session token
  ip_address          text,
  user_agent          text,
  expires_at          timestamptz NOT NULL,
  revoked             boolean DEFAULT false,
  created_at          timestamptz DEFAULT now()
);

-- ─── TIMESTAMPS TRIGGER ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['leads', 'medical_intakes', 'subscriptions', 'prescriptions', 'agent_tasks']
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_updated_at ON %I;
       CREATE TRIGGER trg_updated_at BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION update_updated_at();',
      t, t
    );
  END LOOP;
END;
$$;

-- ─── INDEXES ─────────────────────────────────────────────────────────────────
-- leads
CREATE INDEX IF NOT EXISTS idx_leads_email         ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_phone         ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_converted     ON leads(converted);
CREATE INDEX IF NOT EXISTS idx_leads_sub_status    ON leads(subscription_status);
CREATE INDEX IF NOT EXISTS idx_leads_next_followup ON leads(next_followup_at) WHERE next_followup_at IS NOT NULL;

-- medical_intakes
CREATE INDEX IF NOT EXISTS idx_intakes_lead_id     ON medical_intakes(lead_id);
CREATE INDEX IF NOT EXISTS idx_intakes_reviewed    ON medical_intakes(reviewed);
CREATE INDEX IF NOT EXISTS idx_intakes_rx_sent     ON medical_intakes(prescription_sent);

-- subscriptions
CREATE INDEX IF NOT EXISTS idx_subs_lead_id        ON subscriptions(lead_id);
CREATE INDEX IF NOT EXISTS idx_subs_status         ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subs_stripe_id      ON subscriptions(stripe_subscription_id);

-- prescriptions
CREATE INDEX IF NOT EXISTS idx_rx_lead_id          ON prescriptions(lead_id);
CREATE INDEX IF NOT EXISTS idx_rx_shipped          ON prescriptions(shipped);

-- patient_messages
CREATE INDEX IF NOT EXISTS idx_msgs_lead_id        ON patient_messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_msgs_channel        ON patient_messages(channel);
CREATE INDEX IF NOT EXISTS idx_msgs_escalated      ON patient_messages(escalated) WHERE escalated = true;
CREATE INDEX IF NOT EXISTS idx_msgs_twilio_sid     ON patient_messages(twilio_sid);

-- patient_notifications
CREATE INDEX IF NOT EXISTS idx_notifs_lead_id      ON patient_notifications(lead_id);
CREATE INDEX IF NOT EXISTS idx_notifs_scheduled    ON patient_notifications(scheduled_for) WHERE sent = false;
CREATE INDEX IF NOT EXISTS idx_notifs_type         ON patient_notifications(notification_type);

-- agent_tasks
CREATE INDEX IF NOT EXISTS idx_tasks_status        ON agent_tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled     ON agent_tasks(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_tasks_agent_type    ON agent_tasks(agent_type);
CREATE INDEX IF NOT EXISTS idx_tasks_lead_id       ON agent_tasks(lead_id);

-- audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_patient       ON audit_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_audit_action        ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_created       ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_actor         ON audit_logs(actor_type, actor_id);

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────────
-- Enable RLS on all tables
ALTER TABLE leads                ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_intakes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_messages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tasks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions       ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS (used by server-side agents)
-- Anon key cannot access any PHI tables

-- Public reads blocked by default — service role only
-- (Supabase service_role bypasses RLS automatically)

-- Audit logs: append-only for service role — no updates or deletes
CREATE POLICY audit_insert_only ON audit_logs
  FOR INSERT TO service_role WITH CHECK (true);
-- Block updates and deletes even from service role
CREATE POLICY audit_no_update ON audit_logs
  FOR UPDATE USING (false);
CREATE POLICY audit_no_delete ON audit_logs
  FOR DELETE USING (false);

-- ─── VIEWS ───────────────────────────────────────────────────────────────────
-- Safe view for admin dashboard (no raw PHI columns exposed)
CREATE OR REPLACE VIEW admin_patient_summary AS
SELECT
  l.id,
  l.email,
  l.first_name,
  l.plan,
  l.subscription_status,
  l.current_month,
  l.converted,
  l.qualified_at,
  l.created_at,
  mi.reviewed,
  mi.ai_risk_score,
  mi.prescription_sent,
  s.status AS stripe_status,
  s.last_payment_at,
  (SELECT count(*) FROM patient_messages pm WHERE pm.lead_id = l.id) AS message_count,
  (SELECT count(*) FROM patient_messages pm WHERE pm.lead_id = l.id AND pm.escalated = true) AS escalation_count
FROM leads l
LEFT JOIN medical_intakes mi ON mi.lead_id = l.id
LEFT JOIN subscriptions s ON s.lead_id = l.id;
