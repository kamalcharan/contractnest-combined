-- Migration: Add product_code to pricing plans
-- This links pricing plans to specific products (ContractNest, FamilyKnows, etc.)

-- Step 1: Add product_code column to t_bm_pricing_plan
ALTER TABLE "public"."t_bm_pricing_plan"
ADD COLUMN IF NOT EXISTS "product_code" VARCHAR(50);

-- Step 2: Set default value for existing plans (assign to contractnest)
UPDATE "public"."t_bm_pricing_plan"
SET "product_code" = 'contractnest'
WHERE "product_code" IS NULL;

-- Step 3: Make column NOT NULL after setting defaults
ALTER TABLE "public"."t_bm_pricing_plan"
ALTER COLUMN "product_code" SET NOT NULL;

-- Step 4: Add foreign key constraint to m_products
ALTER TABLE "public"."t_bm_pricing_plan"
ADD CONSTRAINT "t_bm_pricing_plan_product_code_fkey"
FOREIGN KEY ("product_code") REFERENCES "public"."m_products"("code")
ON UPDATE CASCADE ON DELETE RESTRICT;

-- Step 5: Create index for faster product-based queries
CREATE INDEX IF NOT EXISTS "idx_pricing_plan_product_code"
ON "public"."t_bm_pricing_plan" ("product_code");

-- Step 6: Create composite index for common query pattern
CREATE INDEX IF NOT EXISTS "idx_pricing_plan_product_visible"
ON "public"."t_bm_pricing_plan" ("product_code", "is_visible")
WHERE "is_archived" = false;

-- Step 7: Update RLS policy to include product filtering (optional - for multi-tenant security)
-- Note: This policy allows users to only see plans for their product
-- Uncomment if you want to enforce product-level access control

-- DROP POLICY IF EXISTS "authenticated_view_visible_plans" ON "public"."t_bm_pricing_plan";
-- CREATE POLICY "authenticated_view_visible_plans" ON "public"."t_bm_pricing_plan"
-- FOR SELECT TO "authenticated"
-- USING (
--     "is_visible" = true
--     AND "is_archived" = false
--     -- Add product filtering based on request context if needed
-- );

COMMENT ON COLUMN "public"."t_bm_pricing_plan"."product_code" IS 'Product this plan belongs to (contractnest, familyknows, etc.)';
