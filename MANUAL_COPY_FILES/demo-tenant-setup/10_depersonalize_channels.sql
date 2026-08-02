-- ============================================================
-- 10_depersonalize_channels.sql
-- Demo tenant setup — depersonalize contact emails/phones (applied live 2026-08-02)
--
-- WHY: seeded demo contacts carried realistic-looking Indian mobile numbers
-- and plausible email addresses. If any notification/VaNi/campaign flow
-- fires on demo data, real people could receive messages. Per owner
-- instruction: append '0' to every phone (11 digits -> invalid, send fails)
-- and 'm' to every email (.comm/.inm -> invalid TLD, send fails).
--
-- ⚠️ RUN ONCE ONLY — re-running double-appends the suffixes.
-- Login emails (auth.users / t_user_profiles.email: trinity@t.com,
-- value@v.com, freedom@f.com, hygene@h.com, pulse@p.com, complex@c.com,
-- gold@g.com) are deliberately NOT touched — they are needed to sign in.
-- ============================================================

BEGIN;

-- 1) Contact channels (139 emails + 139 mobiles at time of run)
UPDATE t_contact_channels cc
SET value = cc.value || CASE WHEN cc.channel_type = 'email' THEN 'm' ELSE '0' END,
    updated_at = now()
FROM t_contacts c
WHERE c.id = cc.contact_id
  AND c.tenant_id::text LIKE 'c0000000-0000-4000-8000-%'
  AND cc.channel_type IN ('email','mobile','phone','whatsapp');

-- 2) Tenant business profile display fields (all 7 demo tenants)
UPDATE t_tenant_profiles
SET business_email    = CASE WHEN business_email    IS NOT NULL THEN business_email    || 'm' END,
    business_phone    = CASE WHEN business_phone    IS NOT NULL THEN business_phone    || '0' END,
    business_whatsapp = CASE WHEN business_whatsapp IS NOT NULL THEN business_whatsapp || '0' END,
    updated_at = now()
WHERE tenant_id::text LIKE 'c0000000-0000-4000-8000-%';

-- 3) Demo user profile mobile numbers (login emails NOT touched)
UPDATE t_user_profiles
SET mobile_number = mobile_number || '0', updated_at = now()
WHERE id::text LIKE 'b0000000-%' AND mobile_number IS NOT NULL;

COMMIT;

-- Checked and clean (no action needed): t_contracts.buyer_email/buyer_phone,
-- t_contract_vendors.vendor_email, t_contract_access.accessor_email,
-- t_contract_invoice.customer_email/phone, t_contacts.external_data,
-- t_campaign_leads — all empty for demo tenants at time of run.
