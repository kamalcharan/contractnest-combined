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

export default function AgreementLabels({ items, selectedId, selectedName, selectedGroup, onSelect, children }: {
  items: AgreementLabel[]; selectedId: string | null; selectedName: string | null;
  selectedGroup: string | null;
  children: (selector: React.ReactNode) => React.ReactNode;
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
  const selected = items.find(item => item.id === selectedId);
  const suggested = context.data?.length === 1 ? context.data[0] : null;
  const group = selected?.form_settings?.group || selectedGroup || suggested;
  const groups = [...new Set(items.map(item => item.form_settings?.group).filter(Boolean))] as string[];
  const groupName = (key: string) => items.find(item => item.form_settings?.group === key)?.form_settings?.group_label || key;
  const options = items.filter(item => item.form_settings?.group === group);
  const choose = (item: AgreementLabel | undefined) => onSelect(item?.id || null, item ? item.form_settings?.short_name || item.display_name || item.detail_name : null, item?.form_settings?.group || group);
  const selector = <label>Agreement label <small>· optional</small><select aria-label="Agreement label" value={selectedId || ''} onChange={e => choose(items.find(item => item.id === e.target.value))}>
    <option value="">No label</option>
    {selectedId && !selected && <option value={selectedId}>{selectedName} · saved label unavailable</option>}
    {options.map(item => <option key={item.id} value={item.id}>{item.form_settings?.short_name || item.display_name}</option>)}
  </select>{!group && <small>Choose a category above to see its labels.</small>}</label>;
  return <>
    <div className="ag-category-strip"><div><strong>{group ? groupName(group) : 'Choose a contract category'}</strong><small>{selectedName ? selectedName + ' · ' : ''}{selectedGroup || selected ? 'Selected for this agreement' : suggested ? 'Suggested from workspace profile' : context.isLoading ? 'Checking workspace profile…' : 'No category selected'}</small></div><button type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>{expanded ? 'Close' : 'Change'}</button></div>
    {context.isError && <p role="alert">Workspace recommendations could not load. You can choose a category using Change. <button type="button" onClick={() => void context.refetch()}>Retry</button></p>}
    {expanded && <div className="ag-category-browser"><label>Find a category or label<input aria-label="Search agreement categories" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search categories, AMC, CMC…"/></label>
      {groups.filter(key => items.some(item => item.form_settings?.group === key && `${groupName(key)} ${item.display_name} ${item.form_settings?.short_name}`.toLowerCase().includes(search.toLowerCase()))).map(key => <section key={key} className="ag-category-group"><h3><button type="button" aria-pressed={group === key} onClick={() => { if (key !== group) onSelect(null, null, key); else if (!selectedGroup) onSelect(selectedId, selectedName, key); setExpanded(false); setSearch(''); }}>{groupName(key)}{group === key ? ' ✓' : ''}</button></h3><p>{items.filter(item => item.form_settings?.group === key).map(item => item.form_settings?.short_name || item.display_name).join(' · ')}</p></section>)}
      {!groups.some(key => items.some(item => item.form_settings?.group === key && `${groupName(key)} ${item.display_name} ${item.form_settings?.short_name}`.toLowerCase().includes(search.toLowerCase()))) && <p>No matching categories or labels.</p>}
    </div>}
    {children(selector)}
  </>;
}
