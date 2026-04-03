-- =============================================================
-- R1 Task 1.6: ALTER m_cat_blocks
-- Add form_template_id and knowledge_tree_ref columns.
-- m_cat_blocks exists (43 rows, uses uuid_generate_v4()).
-- =============================================================

-- Link block to auto-generated form template
ALTER TABLE public.m_cat_blocks
  ADD COLUMN IF NOT EXISTS form_template_id UUID REFERENCES public.m_form_templates(id);

-- Knowledge tree reference: which resource template + variant this block was generated from
ALTER TABLE public.m_cat_blocks
  ADD COLUMN IF NOT EXISTS knowledge_tree_ref JSONB DEFAULT NULL;
  -- Structure: { "resource_template_id": "uuid", "variant_id": "uuid" }

COMMENT ON COLUMN public.m_cat_blocks.form_template_id IS 'Links to auto-generated smart form for this block (checklist blocks).';
COMMENT ON COLUMN public.m_cat_blocks.knowledge_tree_ref IS 'Knowledge tree source: { resource_template_id, variant_id }';

CREATE INDEX IF NOT EXISTS idx_cat_blocks_form_template ON public.m_cat_blocks(form_template_id);
