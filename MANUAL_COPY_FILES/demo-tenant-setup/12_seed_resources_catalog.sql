-- ============================================================
-- 12_seed_resources_catalog.sql
-- Demo tenant setup — seed Settings→Resources catalog (applied live 2026-08-02)
--
-- SYMPTOM: buyers could not build an RFQ — the "What it covers" step
-- showed no equipment/facility types.
-- ROOT CAUSE: the RFQ builder (and contract-wizard coverage) lists the
-- tenant's resource types from t_category_resources_master via
-- GET /api/resources. Real tenants get these seeded during onboarding;
-- the demo seed populated the asset REGISTRY (t_client_asset_registry)
-- but never this catalog, so all 7 demo tenants had zero rows.
--
-- FIX: 31 resources across the 7 tenants, mirroring each tenant's
-- registry/industry (buyers: DG Set, AHU, Chiller, UPS, etc. matching
-- their seeded assets; sellers: the equipment/facility types they
-- service). Row shape copied from real tenants (is_live=true,
-- is_active=true, is_deletable=true). Deterministic ids
-- de000000-0N00-4000-8000-0000000000nn (N = tenant 1..7). Idempotent.
-- ============================================================

INSERT INTO t_category_resources_master
  (id, tenant_id, resource_type_id, name, display_name, description, sequence_no, is_active, is_deletable, is_live, created_at, updated_at, sub_category)
SELECT v.id::uuid, v.tid::uuid, v.rt, v.nm, v.nm, v.descr, v.seq, true, true, true, now(), now(), v.subcat
FROM (VALUES
 ('de000000-0100-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','equipment','Elevator / Lift','Passenger or freight elevator system',1,'Vertical Transport'),
 ('de000000-0100-4000-8000-000000000002','c0000000-0000-4000-8000-000000000001','equipment','HVAC System','Central air conditioning / ventilation unit',2,'HVAC Systems'),
 ('de000000-0100-4000-8000-000000000003','c0000000-0000-4000-8000-000000000001','equipment','DG Set','Diesel generator backup power',3,'Power Backup'),
 ('de000000-0100-4000-8000-000000000004','c0000000-0000-4000-8000-000000000001','equipment','UPS System','Uninterruptible power supply',4,'Power Backup'),
 ('de000000-0200-4000-8000-000000000001','c0000000-0000-4000-8000-000000000002','equipment','Elevator / Lift','Passenger or freight elevator system',1,'Vertical Transport'),
 ('de000000-0200-4000-8000-000000000002','c0000000-0000-4000-8000-000000000002','equipment','Escalator','Escalator / moving walkway',2,'Vertical Transport'),
 ('de000000-0300-4000-8000-000000000001','c0000000-0000-4000-8000-000000000003','asset','Commercial Building','Client commercial premises',1,'Facilities'),
 ('de000000-0400-4000-8000-000000000001','c0000000-0000-4000-8000-000000000004','asset','Office Building','Client office premises',1,'Facilities'),
 ('de000000-0400-4000-8000-000000000002','c0000000-0000-4000-8000-000000000004','asset','IT Park Floor','Leased floor in IT park',2,'Facilities'),
 ('de000000-0500-4000-8000-000000000001','c0000000-0000-4000-8000-000000000005','equipment','DG Set','Diesel generator backup power',1,'Power Backup'),
 ('de000000-0500-4000-8000-000000000002','c0000000-0000-4000-8000-000000000005','equipment','AHU','Air handling unit',2,'HVAC Systems'),
 ('de000000-0500-4000-8000-000000000003','c0000000-0000-4000-8000-000000000005','equipment','Chiller Plant','Central chiller plant',3,'HVAC Systems'),
 ('de000000-0500-4000-8000-000000000004','c0000000-0000-4000-8000-000000000005','equipment','Elevator / Lift','Bed lift / passenger lift',4,'Vertical Transport'),
 ('de000000-0500-4000-8000-000000000005','c0000000-0000-4000-8000-000000000005','equipment','UPS System','Uninterruptible power supply',5,'Power Backup'),
 ('de000000-0500-4000-8000-000000000006','c0000000-0000-4000-8000-000000000005','equipment','Medical Ventilator','ICU / emergency ventilator',6,'Medical Equipment'),
 ('de000000-0500-4000-8000-000000000007','c0000000-0000-4000-8000-000000000005','equipment','STP Plant','Sewage treatment plant',7,'Water & Waste'),
 ('de000000-0500-4000-8000-000000000008','c0000000-0000-4000-8000-000000000005','asset','Hospital Building','Hospital campus block',8,'Facilities'),
 ('de000000-0600-4000-8000-000000000001','c0000000-0000-4000-8000-000000000006','equipment','DG Set','Diesel generator backup power',1,'Power Backup'),
 ('de000000-0600-4000-8000-000000000002','c0000000-0000-4000-8000-000000000006','equipment','AHU','Air handling unit (GMP graded)',2,'HVAC Systems'),
 ('de000000-0600-4000-8000-000000000003','c0000000-0000-4000-8000-000000000006','equipment','Chiller','Utility chiller',3,'HVAC Systems'),
 ('de000000-0600-4000-8000-000000000004','c0000000-0000-4000-8000-000000000006','equipment','UPS System','Uninterruptible power supply',4,'Power Backup'),
 ('de000000-0600-4000-8000-000000000005','c0000000-0000-4000-8000-000000000006','equipment','Purified Water System','PW generation & distribution',5,'Water & Waste'),
 ('de000000-0600-4000-8000-000000000006','c0000000-0000-4000-8000-000000000006','asset','Plant Building','Manufacturing plant block',6,'Facilities'),
 ('de000000-0700-4000-8000-000000000001','c0000000-0000-4000-8000-000000000007','equipment','DG Set','Diesel generator backup power',1,'Power Backup'),
 ('de000000-0700-4000-8000-000000000002','c0000000-0000-4000-8000-000000000007','equipment','Air Compressor','Screw / backup compressor',2,'Utilities'),
 ('de000000-0700-4000-8000-000000000003','c0000000-0000-4000-8000-000000000007','equipment','Transformer','Distribution transformer',3,'Electrical'),
 ('de000000-0700-4000-8000-000000000004','c0000000-0000-4000-8000-000000000007','equipment','VRF System','VRF air conditioning',4,'HVAC Systems'),
 ('de000000-0700-4000-8000-000000000005','c0000000-0000-4000-8000-000000000007','equipment','ETP Plant','Effluent treatment plant',5,'Water & Waste'),
 ('de000000-0700-4000-8000-000000000006','c0000000-0000-4000-8000-000000000007','equipment','AHU','Air handling unit',6,'HVAC Systems'),
 ('de000000-0700-4000-8000-000000000007','c0000000-0000-4000-8000-000000000007','asset','Factory Shed','Plant shed / works building',7,'Facilities')
) AS v(id, tid, rt, nm, descr, seq, subcat)
WHERE NOT EXISTS (SELECT 1 FROM t_category_resources_master e WHERE e.id = v.id::uuid);
