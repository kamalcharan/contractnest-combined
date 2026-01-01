# Catalog Studio UI Integration Guide

This guide explains how to integrate the API hooks into the existing Catalog Studio UI pages.

## Files to Copy

### Utilities (NEW)
```
MANUAL_COPY_FILES/ui/catalog-studio/utils/catBlockAdapter.ts
  → contractnest-ui/src/utils/catalog-studio/catBlockAdapter.ts

MANUAL_COPY_FILES/ui/catalog-studio/utils/catTemplateAdapter.ts
  → contractnest-ui/src/utils/catalog-studio/catTemplateAdapter.ts

MANUAL_COPY_FILES/ui/catalog-studio/utils/index.ts
  → contractnest-ui/src/utils/catalog-studio/index.ts
```

---

## Integration Steps

### 1. blocks.tsx Integration

**Current State:** Uses `getAllBlocks()` from utils which returns mock data.

**Changes Required:**

```typescript
// ADD IMPORTS at top of file
import { useCatBlocks, CatBlock } from '@/hooks/queries/useCatBlocks';
import {
  useCreateCatBlock,
  useUpdateCatBlock,
  useDeleteCatBlock
} from '@/hooks/mutations/useCatBlocksMutations';
import { catBlocksToBlocks, blockToCreateData, blockToUpdateData } from '@/utils/catalog-studio';
import { Loader2 } from 'lucide-react';

// REPLACE this line:
const allBlocks = getAllBlocks();

// WITH:
const { data: blocksResponse, isLoading, error, refetch } = useCatBlocks();
const allBlocks = useMemo(() => {
  if (!blocksResponse?.data?.blocks) return [];
  return catBlocksToBlocks(blocksResponse.data.blocks);
}, [blocksResponse]);

// ADD mutation hooks:
const createBlockMutation = useCreateCatBlock();
const updateBlockMutation = useUpdateCatBlock();
const deleteBlockMutation = useDeleteCatBlock();

// REPLACE handleSaveBlock:
const handleSaveBlock = async (blockData: Partial<Block>) => {
  try {
    if (wizardMode === 'create') {
      await createBlockMutation.mutateAsync(blockToCreateData(blockData));
    } else if (editingBlock) {
      await updateBlockMutation.mutateAsync({
        id: editingBlock.id,
        data: blockToUpdateData(blockData),
      });
    }
    closeWizard();
    refetch();
  } catch (error) {
    console.error('Failed to save block:', error);
  }
};

// REPLACE handleBlockDelete:
const handleBlockDelete = async (blockId: string) => {
  try {
    await deleteBlockMutation.mutateAsync(blockId);
    setIsEditorPanelOpen(false);
    setSelectedBlock(null);
    refetch();
  } catch (error) {
    console.error('Failed to delete block:', error);
  }
};

// ADD loading state in render:
if (isLoading) {
  return (
    <div className="h-full flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: colors.brand.primary }} />
    </div>
  );
}

if (error) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: colors.semantic.error }} />
        <p>Failed to load blocks</p>
        <button onClick={() => refetch()}>Retry</button>
      </div>
    </div>
  );
}
```

---

### 2. templates-list.tsx Integration

**Current State:** Uses `MOCK_TEMPLATES` constant array.

**Changes Required:**

```typescript
// ADD IMPORTS at top of file
import {
  useCatTemplates,
  useCatSystemTemplates,
  useCatPublicTemplates
} from '@/hooks/queries/useCatTemplates';
import {
  useDeleteCatTemplate,
  useCopyCatTemplate
} from '@/hooks/mutations/useCatTemplatesMutations';
import { catTemplatesToUITemplates } from '@/utils/catalog-studio';
import { Loader2 } from 'lucide-react';

// REMOVE:
const [templates, setTemplates] = useState<CatalogTemplate[]>(MOCK_TEMPLATES);

// ADD hooks:
const { data: tenantTemplatesRes, isLoading: loadingTenant, refetch: refetchTenant } = useCatTemplates();
const { data: systemTemplatesRes, isLoading: loadingSystem } = useCatSystemTemplates();
const { data: publicTemplatesRes, isLoading: loadingPublic } = useCatPublicTemplates();
const deleteMutation = useDeleteCatTemplate();
const copyMutation = useCopyCatTemplate();

// ADD combined templates memo:
const templates = useMemo(() => {
  const allTemplates: UITemplate[] = [];

  if (tenantTemplatesRes?.data?.templates) {
    allTemplates.push(...catTemplatesToUITemplates(tenantTemplatesRes.data.templates));
  }
  if (systemTemplatesRes?.data?.templates) {
    const systemTemplates = catTemplatesToUITemplates(systemTemplatesRes.data.templates);
    systemTemplates.forEach(t => { t.isGlobal = true; });
    allTemplates.push(...systemTemplates);
  }

  return allTemplates;
}, [tenantTemplatesRes, systemTemplatesRes]);

const isLoading = loadingTenant || loadingSystem || loadingPublic;

// REPLACE handleDelete:
const handleDelete = async (templateId: string) => {
  try {
    await deleteMutation.mutateAsync(templateId);
    refetchTenant();
  } catch (error) {
    console.error('Failed to delete template:', error);
  }
};

// REPLACE handleDuplicate:
const handleDuplicate = async (templateId: string, newName: string) => {
  try {
    await copyMutation.mutateAsync({
      id: templateId,
      data: { name: newName },
    });
    refetchTenant();
    showToast('success', 'Template duplicated', newName);
  } catch (error) {
    console.error('Failed to duplicate template:', error);
  }
};

// ADD loading state in render (before main content):
if (isLoading) {
  return (
    <div className="h-full flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin" />
    </div>
  );
}
```

---

### 3. template.tsx Integration (Template Builder)

**Current State:** Uses `getAllBlocks()` and local state for template blocks.

**Changes Required:**

```typescript
// ADD IMPORTS at top of file
import { useCatBlocks } from '@/hooks/queries/useCatBlocks';
import { useCatTemplate } from '@/hooks/queries/useCatTemplates';
import { useSaveTemplate } from '@/hooks/mutations/useCatTemplatesMutations';
import { catBlocksToBlocks, createTemplateBlock } from '@/utils/catalog-studio';
import { useSearchParams } from 'react-router-dom';

// ADD template ID from URL:
const [searchParams] = useSearchParams();
const templateId = searchParams.get('templateId');
const isEditMode = searchParams.get('edit') === 'true';

// REPLACE getAllBlocks() with hook:
const { data: blocksResponse, isLoading: loadingBlocks } = useCatBlocks();
const allBlocks = useMemo(() => {
  if (!blocksResponse?.data?.blocks) return [];
  return catBlocksToBlocks(blocksResponse.data.blocks);
}, [blocksResponse]);

// ADD template loading for edit mode:
const { data: templateResponse, isLoading: loadingTemplate } = useCatTemplate(
  isEditMode ? templateId : undefined
);

// ADD save mutation:
const saveTemplateMutation = useSaveTemplate();

// REPLACE handleSaveTemplate:
const handleSaveTemplate = async () => {
  if (templateBlocks.length === 0) {
    showToast('warning', 'Cannot save empty template', 'Add at least one block');
    return;
  }

  setIsSaving(true);
  try {
    // Convert UI blocks to API format
    const apiBlocks = templateBlocks.map((tb, index) =>
      createTemplateBlock(tb.blockId, index, tb.config)
    );

    await saveTemplateMutation.mutateAsync({
      templateId: isEditMode ? templateId : undefined,
      data: {
        name: templateName,
        description: templateDescription,
        blocks: apiBlocks,
      },
    });

    showToast('success', 'Template saved', `"${templateName}" has been saved successfully`);
  } catch (error) {
    showToast('error', 'Save failed', 'An error occurred while saving');
    console.error('Failed to save template:', error);
  } finally {
    setIsSaving(false);
  }
};

// ADD effect to load template data in edit mode:
useEffect(() => {
  if (templateResponse?.data && isEditMode) {
    const template = templateResponse.data;
    setTemplateName(template.name);
    setTemplateDescription(template.description || '');

    // Convert API blocks to UI format
    if (template.blocks) {
      const uiBlocks = template.blocks.map((apiBlock, index) => {
        const block = allBlocks.find(b => b.id === apiBlock.block_id);
        if (!block) return null;

        return {
          id: `tb-${apiBlock.block_id}-${index}`,
          blockId: apiBlock.block_id,
          block,
          order: apiBlock.order,
          config: apiBlock.config || {},
        };
      }).filter(Boolean);

      setTemplateBlocks(uiBlocks);
    }
  }
}, [templateResponse, isEditMode, allBlocks]);

// ADD loading state:
if (loadingBlocks || (isEditMode && loadingTemplate)) {
  return (
    <div className="h-full flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin" />
    </div>
  );
}
```

---

## Type Updates

You may need to update or extend the existing Block type to include API-specific fields:

```typescript
// In src/types/catalogStudio.ts, add:

export interface Block {
  id: string;
  categoryId: string;
  name: string;
  icon: string;
  description: string;
  price?: number;
  currency?: string;
  duration?: number;
  durationUnit?: string;
  tags: string[];
  evidenceTags?: string[];
  usage: { templates: number; contracts: number };
  meta?: Record<string, string | number>;
  // ADD these for API compatibility:
  updatedAt?: string;
  createdAt?: string;
  isActive?: boolean;
  isAdmin?: boolean;
}
```

---

## Notes

1. **Master Data IDs**: The adapters reference block_type_id, status_id, etc. These need to match the actual UUIDs from your `m_category_details` table. Update the mapping objects in the adapter files.

2. **Error Handling**: Add proper error handling UI for API failures.

3. **Loading States**: Use skeleton loaders for better UX (existing pattern in codebase).

4. **Cache Invalidation**: The mutations already handle cache invalidation via queryClient.invalidateQueries().

5. **Testing**: Test each integration step incrementally.
