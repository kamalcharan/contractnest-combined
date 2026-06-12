-- Layer 2 pricing (founder decision 2026-06-12): per-variant price MULTIPLIERS.
-- ALREADY APPLIED to the Supabase project (uwyqhzotluikawcboldr) via MCP on
-- 2026-06-12 as migration 'kt_variant_price_multipliers'. Idempotent.
--
-- Currency-neutral: variant price = median(currency/geo) × multiplier, so every
-- currency in m_kt_prices gets variant differentiation from ONE number per
-- (service cycle, variant). Absolute override_min/max on m_checkpoint_variant_map
-- (hand-curated era) keep precedence when present.
create table if not exists m_kt_variant_price_multipliers (
  id               uuid primary key default gen_random_uuid(),
  service_cycle_id uuid not null references m_service_cycles(id) on delete cascade,
  variant_id       uuid not null references m_equipment_variants(id) on delete cascade,
  multiplier       numeric not null check (multiplier > 0 and multiplier <= 20),
  source           text not null default 'generated',
  updated_at       timestamptz not null default now(),
  unique (service_cycle_id, variant_id)
);

comment on table m_kt_variant_price_multipliers is
  'KT Layer-2 pricing: currency-neutral per-variant multipliers relative to the cycle median. Written by knowledge-tree edge save-pricing; read by ktCatBlockMapperService.';

alter table m_kt_variant_price_multipliers enable row level security;

drop policy if exists kt_vpm_read_authenticated on m_kt_variant_price_multipliers;
create policy kt_vpm_read_authenticated
  on m_kt_variant_price_multipliers for select
  to authenticated using (true);

create index if not exists ix_kt_vpm_cycle on m_kt_variant_price_multipliers (service_cycle_id);
