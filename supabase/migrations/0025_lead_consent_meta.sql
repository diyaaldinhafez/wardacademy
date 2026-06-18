-- 0025_lead_consent_meta
--
-- Privacy consent (important for EU/GDPR families), referral source (marketing),
-- online-session readiness (operational), and the guardian's relationship.

alter table public.leads
  add column if not exists consent_accepted  boolean not null default false,
  add column if not exists consent_at        timestamptz,
  add column if not exists referral_source   text,
  add column if not exists online_ready      text,
  add column if not exists guardian_relation text;
