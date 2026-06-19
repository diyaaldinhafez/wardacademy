-- 0031_lead_payment
--
-- Minimal manual payment tracking for the registration pipeline (a real
-- gateway is a separate later feature). The pipeline stepper uses this.

alter table public.leads
  add column if not exists payment_status text not null default 'pending'
    check (payment_status in ('pending', 'link_sent', 'paid')),
  add column if not exists paid_at timestamptz;
