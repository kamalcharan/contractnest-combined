import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import resourcesService from '@/services/resourcesService';

export interface AgreementLabel {
  id: string;
  display_name: string;
  detail_name: string;
  form_settings?: { group?: string; group_label?: string; short_name?: string };
}

export default function AgreementLabels({ items, selectedId, selectedName, onSelect }: {
  items: AgreementLabel[]; selectedId: string | null; selectedName: string | null;
  onSelect: (id: string | null, name: string | null, group?: string | null) => void;
}) {
  const { currentTenant, isLive, perspective } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState('');
  const context = useQuery({
    queryKey: ['agreement-label-priority', currentTenant?.id, isLive, perspective],
    enabled: !!currentTenant?.id, retry: false,
    queryFn: async () => {
      // Read the existing ICP signal directly: do not turn request errors into
      // a fabricated empty ranking or infer an offering from an industry name.
      const [ranking, templates] = await Promise.all([
        api.get('/api/onboarding/resource-ranking'),
        resourcesService.getResourceTemplates({ limit: 100 }),
      ]);
      if (!ranking.data?.success || !ranking.data?.data || !templates?.data) throw new Error('Incomplete ICP context');
      const groups = new Set<string>();
      for (const resource of templates.data) {
        if (ranking.data.data[resource.id]?.forYou !== true) continue;
        if (resource.resource_type_id === 'equipment') groups.add('equipment_maintenance');
        if (resource.resource_type_id === 'asset') groups.add('facility_property');
        if (resource.resource_type_id === 'team_staff') groups.add('service_delivery');
      }
      // Never claim an exhaustive category priority from a truncated catalogue.
      return templates.pagination?.has_more ? [] : [...groups];
    },
  });
  const priority = items.filter(item => context.data?.includes(item.form_settings?.group || ''));
  const selected = items.find(item => item.id === selectedId);
  const visible = (expanded || !priority.length ? items : priority).filter(item =>
    `${item.display_name} ${item.detail_name} ${item.form_settings?.short_name} ${item.form_settings?.group_label}`.toLowerCase().includes(search.toLowerCase()));
  const choose = (item: AgreementLabel) => { onSelect(item.id, item.form_settings?.short_name || item.display_name || item.detail_name, item.form_settings?.group); setExpanded(false); setSearch(''); };
  return <section className="ag-label-picker" aria-label="Agreement label">
    <div className="ag-label-title"><strong>Agreement label <small>Optional</small></strong>{selectedId && <button type="button" onClick={() => onSelect(null, null, null)}>Clear</button>}</div>
    {selectedId && !expanded ? <div className="ag-label-selected"><div><strong>{selectedName}</strong><small>{selected?.display_name || 'Saved label is not in the current list. You can keep or change it.'}</small></div><button type="button" onClick={() => setExpanded(true)}>Change label</button></div> : <>
      <p>{context.isLoading ? 'Checking your business context…' : context.isError ? 'Business context could not load. All labels are available; no recommendation has been assumed.' : priority.length ? 'Prioritised from your existing ICP recommendations. Choose what fits this agreement.' : 'Choose what fits this agreement. No category priority is available from your current ICP context.'}</p>
      {context.isError && <button type="button" onClick={() => void context.refetch()}>Retry business context</button>}
      {(expanded || !priority.length) && <input aria-label="Search agreement labels" value={search} placeholder="Search labels or contract types" onChange={e => setSearch(e.target.value)}/>}
      <div className="ag-label-grid" role="group" aria-label="Available agreement labels">{visible.map(item => <button type="button" aria-pressed={selectedId === item.id} key={item.id} onClick={() => choose(item)}><strong>{item.form_settings?.short_name || item.display_name}</strong><span>{item.display_name}</span><small>{item.form_settings?.group_label}</small>{selectedId === item.id && <span aria-label="Selected">✓</span>}</button>)}</div>
      {!visible.length && <p>No matching labels. Try another search.</p>}
      {!!priority.length && !expanded && <button type="button" onClick={() => setExpanded(true)}>Explore other agreement types</button>}
    </>}
  </section>;
}
