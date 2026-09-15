import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import resourcesService from '@/services/resourcesService';
import { useCatBlocksTest } from '@/hooks/queries/useCatBlocksTest';
import type { ResourceIdentity } from './serviceCatalogModel';

export function useServiceCatalog(enabled = true) {
  const {currentTenant,isLive} = useAuth();
  const blocks = useCatBlocksTest({strict:true,enabled});
  const identities = useQuery({
    queryKey:['experience-service-resources',currentTenant?.id,isLive], enabled:enabled && !!currentTenant?.id, retry:false,
    queryFn:async () => {
      const response = await api.get('/api/resources');
      const resources = response.data?.success === true ? response.data.data : null;
      if (!Array.isArray(resources) || resources.some(r => !r.id || !r.name || !r.resource_type_id)) throw new Error('Workspace resource catalogue is incomplete.');
      const templates: ResourceIdentity[] = [];
      for (let page=0;page<100;page++) {
        const result = await resourcesService.getResourceTemplates({limit:100,offset:templates.length});
        if (result?.success !== true || !Array.isArray(result.data) || typeof result.pagination?.has_more !== 'boolean') throw new Error('Resource dependency catalogue is incomplete.');
        if (result.data.some(t => !t.id || !t.name || !t.resource_type_id || templates.some(existing => existing.id === t.id))) throw new Error('Resource dependency pagination did not advance.');
        templates.push(...result.data);
        if (!result.pagination.has_more) return {resources:resources as ResourceIdentity[],templates};
        if (!result.data.length) throw new Error('Resource dependency pagination did not advance.');
      }
      throw new Error('Resource dependencies could not load completely.');
    }
  });
  return {
    raw:blocks.data?.data?.blocks || [], resources:identities.data?.resources || [], templates:identities.data?.templates || [],
    loading:blocks.isLoading || identities.isLoading, ready:blocks.isSuccess && identities.isSuccess,
    error:blocks.error || identities.error, retry:() => {void blocks.refetch();void identities.refetch();}
  };
}
