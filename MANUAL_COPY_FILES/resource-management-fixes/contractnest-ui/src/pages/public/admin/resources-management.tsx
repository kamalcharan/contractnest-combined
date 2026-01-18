// src/pages/public/admin/resources-management.tsx
//
// TODO [PUBLIC DEPLOYMENT]: This page imports from '@/services/public-resources.service'
// which needs to be created before making this page publicly accessible.
// Required exports: ResourceCardData, getPublicResources(), createResource(token, data),
// updateResource(token, id, data), deleteResource(token, id), getResourceStats(token)
// Follow the pattern in '@/services/public-leads.service.ts' for implementation.
//
import React, { useState, useEffect } from 'react';
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Star,
  Calendar,
  Tag,
  ImageIcon,
  Link as LinkIcon,
  ChevronUp,
  ChevronDown,
  X,
  Check,
  Loader2
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { captureError } from '@/config/sentry.config';
import {
  ResourceCardData,
  getPublicResources,
  createResource,
  updateResource,
  deleteResource,
  getResourceStats
} from '@/services/public-resources.service';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/config/supabase';
import { useAuth } from '@/context/AuthContext';
import { analyticsService } from '@/services/analytics.service';
import { toast } from '@/components/ui/use-toast';
import AIMaturityCard from '@/components/Leads/AIMaturityAssessment/AIMaturityCard';

const ResourcesManagementPage: React.FC = () => {
  // Theme context
  const themeContext = useTheme();
  const theme = themeContext?.theme || { mode: 'light' };
  const { currentTheme } = themeContext || {};
  
  // Auth context
  const auth = useAuth();
  const userSession = auth?.session;
  const isAdmin = userSession?.user?.user_metadata?.isAdmin || false;
  const isLive = userSession?.user?.user_metadata?.isLive || false;
  const tenantId = userSession?.user?.user_metadata?.tenantId;
  
  // Resources state
  const [resources, setResources] = useState<ResourceCardData[]>([]);
  const [filteredResources, setFilteredResources] = useState<ResourceCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof ResourceCardData>('published_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [stats, setStats] = useState<any>(null);
  
  // Resource form state
  const [selectedResource, setSelectedResource] = useState<ResourceCardData | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // New resource form state
  const [formData, setFormData] = useState<Partial<ResourceCardData>>({
    title: '',
    description: '',
    tags: [],
    image_url: '',
    path: '',
    content_type: '',
    published_date: new Date().toISOString().split('T')[0],
    is_featured: false,
    is_active: true,
    is_test: false
  });
  
  // Tags input state
  const [tagInput, setTagInput] = useState('');
  
  // Validation state
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // Load resources on component mount
  useEffect(() => {
    const loadResources = async () => {
      if (!userSession) return;
      
      try {
        setIsLoading(true);
        const token = userSession.access_token;
        
        // Make API call to fetch resources
        const resourcesData = await getPublicResources();
        setResources(resourcesData);
        setFilteredResources(resourcesData);
        
        // Fetch resource statistics if admin
        if (isAdmin) {
          const statsData = await getResourceStats(token);
          setStats(statsData);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error loading resources:', err);
        setError('Failed to load resources. Please try again later.');
        
        try {
          captureError(err as Error, {
            tags: { component: 'ResourcesManagementPage', action: 'loadResources' }
          });
        } catch (sentryError) {
          console.error("Error logging to Sentry:", sentryError);
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    loadResources();
    
    // Track page view
    try {
      analyticsService.trackWorkspaceEvent('resources_management_page_viewed', {
        theme: theme.mode,
        isAdmin: isAdmin,
        isLive: isLive
      });
    } catch (analyticsError) {
      console.error('Analytics error:', analyticsError);
    }
  }, [userSession, isAdmin, isLive, theme.mode]);
  
  // Filter resources when search term changes
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredResources(resources);
    } else {
      const lowercaseSearch = searchTerm.toLowerCase();
      const filtered = resources.filter(resource => 
        resource.title.toLowerCase().includes(lowercaseSearch) ||
        resource.description.toLowerCase().includes(lowercaseSearch) ||
        resource.content_type.toLowerCase().includes(lowercaseSearch) ||
        resource.tags.some(tag => tag.toLowerCase().includes(lowercaseSearch))
      );
      setFilteredResources(filtered);
    }
  }, [searchTerm, resources]);
  
  // Sort resources
  useEffect(() => {
    const sorted = [...filteredResources].sort((a, b) => {
      let valueA = a[sortField];
      let valueB = b[sortField];
      
      // Handle different types
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        if (sortField === 'published_date') {
          valueA = new Date(valueA).getTime();
          valueB = new Date(valueB).getTime();
        } else {
          valueA = valueA.toLowerCase();
          valueB = valueB.toLowerCase();
        }
      } else if (typeof valueA === 'boolean' && typeof valueB === 'boolean') {
        valueA = valueA ? 1 : 0;
        valueB = valueB ? 1 : 0;
      }
      
      if (valueA === valueB) return 0;
      
      const sortResult = valueA < valueB ? -1 : 1;
      return sortDirection === 'asc' ? sortResult : -sortResult;
    });
    
    setFilteredResources(sorted);
  }, [sortField, sortDirection]);
  
  // Handle sort click
  const handleSortClick = (field: keyof ResourceCardData) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  // Reset form data
  const resetFormData = () => {
    setFormData({
      title: '',
      description: '',
      tags: [],
      image_url: '',
      path: '',
      content_type: '',
      published_date: new Date().toISOString().split('T')[0],
      is_featured: false,
      is_active: true,
      is_test: false
    });
    setTagInput('');
    setFormErrors({});
  };
  
  // Open dialog to add new resource
  const handleAddResourceClick = () => {
    resetFormData();
    setSelectedResource(null);
    setIsDialogOpen(true);
  };
  
  // Open dialog to edit resource
  const handleEditResourceClick = (resource: ResourceCardData) => {
    setSelectedResource(resource);
    setFormData({
      ...resource,
      published_date: new Date(resource.published_date).toISOString().split('T')[0]
    });
    setIsDialogOpen(true);
  };
  
  // Open dialog to confirm delete
  const handleDeleteResourceClick = (resource: ResourceCardData) => {
    setSelectedResource(resource);
    setDeleteConfirmText('');
    setIsDeleteDialogOpen(true);
  };
  
  // Handle form input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear validation error when field is edited
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };
  
  // Handle checkbox/switch change
  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }));
  };
  
  // Handle tag input change
  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTagInput(e.target.value);
  };
  
  // Handle tag input keydown (add tag on Enter)
  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      addTag();
    }
  };
  
  // Add tag to form data
  const addTag = () => {
    if (!tagInput.trim()) return;
    
    const newTag = tagInput.trim();
    const currentTags = formData.tags || [];
    
    if (!currentTags.includes(newTag)) {
      setFormData(prev => ({ 
        ...prev, 
        tags: [...currentTags, newTag] 
      }));
    }
    
    setTagInput('');
  };
  
  // Remove tag from form data
  const removeTag = (tagToRemove: string) => {
    const currentTags = formData.tags || [];
    setFormData(prev => ({ 
      ...prev, 
      tags: currentTags.filter(tag => tag !== tagToRemove) 
    }));
  };
  
  // Validate form data
  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.title?.trim()) {
      errors.title = 'Title is required';
    }
    
    if (!formData.description?.trim()) {
      errors.description = 'Description is required';
    }
    
    if (!formData.path?.trim()) {
      errors.path = 'Path is required';
    } else if (!formData.path.startsWith('/')) {
      errors.path = 'Path must start with /';
    }
    
    if (!formData.content_type?.trim()) {
      errors.content_type = 'Content type is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userSession) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to perform this action.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate form data
    if (!validateForm()) return;
    
    try {
      setIsSubmitting(true);
      const token = userSession.access_token;
      
      if (selectedResource) {
        // Update existing resource
        const updatedResource = await updateResource(token, selectedResource.id, {
          ...formData,
          tenant_id: tenantId || null,
          created_by: userSession.user.id
        });
        
        // Update local state
        setResources(prev => 
          prev.map(resource => 
            resource.id === updatedResource.id ? updatedResource : resource
          )
        );
        
        toast({
          title: "Resource Updated",
          description: "The resource has been updated successfully.",
          variant: "default",
        });
      } else {
        // Create new resource
        const newResource = await createResource(token, {
          ...formData as Omit<ResourceCardData, 'id' | 'created_at'>,
          tenant_id: tenantId || null,
          created_by: userSession.user.id,
          is_test: !isLive
        });
        
        // Update local state
        setResources(prev => [...prev, newResource]);
        
        toast({
          title: "Resource Created",
          description: "The resource has been created successfully.",
          variant: "default",
        });
      }
      
      // Close dialog and reset form
      setIsDialogOpen(false);
      resetFormData();
      
    } catch (error) {
      console.error('Error saving resource:', error);
      
      toast({
        title: "Error",
        description: selectedResource 
          ? "Failed to update resource. Please try again." 
          : "Failed to create resource. Please try again.",
        variant: "destructive",
      });
      
      try {
        captureError(error as Error, {
          tags: { 
            component: 'ResourcesManagementPage', 
            action: selectedResource ? 'updateResource' : 'createResource' 
          }
        });
      } catch (sentryError) {
        console.error("Error logging to Sentry:", sentryError);
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle resource deletion
  const handleDeleteConfirm = async () => {
    if (!selectedResource || !userSession) return;
    
    try {
      setIsSubmitting(true);
      const token = userSession.access_token;
      
      await deleteResource(token, selectedResource.id);
      
      // Update local state
      setResources(prev => 
        prev.filter(resource => resource.id !== selectedResource.id)
      );
      
      setIsDeleteDialogOpen(false);
      setSelectedResource(null);
      
      toast({
        title: "Resource Deleted",
        description: "The resource has been deleted successfully.",
        variant: "default",
      });
      
    } catch (error) {
      console.error('Error deleting resource:', error);
      
      toast({
        title: "Error",
        description: "Failed to delete resource. Please try again.",
        variant: "destructive",
      });
      
      try {
        captureError(error as Error, {
          tags: { component: 'ResourcesManagementPage', action: 'deleteResource' }
        });
      } catch (sentryError) {
        console.error("Error logging to Sentry:", sentryError);
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Toggle resource active status
  const handleToggleActive = async (resource: ResourceCardData) => {
    if (!userSession) return;
    
    try {
      const token = userSession.access_token;
      
      const updatedResource = await updateResource(token, resource.id, {
        is_active: !resource.is_active
      });
      
      // Update local state
      setResources(prev => 
        prev.map(r => r.id === updatedResource.id ? updatedResource : r)
      );
      
      toast({
        title: `Resource ${updatedResource.is_active ? 'Activated' : 'Deactivated'}`,
        description: `The resource has been ${updatedResource.is_active ? 'activated' : 'deactivated'}.`,
        variant: "default",
      });
      
    } catch (error) {
      console.error('Error toggling resource active status:', error);
      
      toast({
        title: "Error",
        description: "Failed to update resource status. Please try again.",
        variant: "destructive",
      });
      
      try {
        captureError(error as Error, {
          tags: { component: 'ResourcesManagementPage', action: 'toggleResourceActive' }
        });
      } catch (sentryError) {
        console.error("Error logging to Sentry:", sentryError);
      }
    }
  };
  
  // Toggle resource featured status
  const handleToggleFeatured = async (resource: ResourceCardData) => {
    if (!userSession) return;
    
    try {
      const token = userSession.access_token;
      
      const updatedResource = await updateResource(token, resource.id, {
        is_featured: !resource.is_featured
      });
      
      // Update local state
      setResources(prev => 
        prev.map(r => r.id === updatedResource.id ? updatedResource : r)
      );
      
      toast({
        title: `Resource ${updatedResource.is_featured ? 'Featured' : 'Unfeatured'}`,
        description: `The resource is now ${updatedResource.is_featured ? 'featured' : 'no longer featured'}.`,
        variant: "default",
      });
      
    } catch (error) {
      console.error('Error toggling resource featured status:', error);
      
      toast({
        title: "Error",
        description: "Failed to update resource featured status. Please try again.",
        variant: "destructive",
      });
      
      try {
        captureError(error as Error, {
          tags: { component: 'ResourcesManagementPage', action: 'toggleResourceFeatured' }
        });
      } catch (sentryError) {
        console.error("Error logging to Sentry:", sentryError);
      }
    }
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme.mode === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
        <div className="text-center">
          <Loader2 className={`h-12 w-12 animate-spin mx-auto mb-4 ${theme.mode === 'dark' ? 'text-white' : 'text-gray-800'}`} />
          <p className={`text-lg ${theme.mode === 'dark' ? 'text-white' : 'text-gray-800'}`}>
            Loading resources...
          </p>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme.mode === 'dark' ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-800'}`}>
        <div className="text-center">
          <div className="text-red-500 text-5xl mb-4">
            <X size={64} className="mx-auto" />
          </div>
          <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
          <p className="mb-6 max-w-lg mx-auto">
            {error}
          </p>
          <Button 
            onClick={() => window.location.reload()}
            style={{ 
              backgroundColor: currentTheme?.colors?.brand?.primary || '#3b82f6',
              color: 'white'
            }}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }
  
  // Access denied state
  if (!isAdmin) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme.mode === 'dark' ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-800'}`}>
        <div className="text-center">
          <div className="text-yellow-500 text-5xl mb-4">
            <X size={64} className="mx-auto" />
          </div>
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="mb-6 max-w-lg mx-auto">
            You don't have permission to access this page. Only administrators can manage resources.
          </p>
          <Button 
            onClick={() => window.history.back()}
            style={{ 
              backgroundColor: currentTheme?.colors?.brand?.primary || '#3b82f6',
              color: 'white'
            }}
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }
  
  // Main content
  return (
    <div className={`min-h-screen p-6 ${theme.mode === 'dark' ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-800'}`}>
      <div className="container mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-2">Resource Management</h1>
            <p className={`text-sm ${theme.mode === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Manage digital transformation resources and tools
            </p>
          </div>
          <Button
            onClick={handleAddResourceClick}
            className="mt-4 sm:mt-0"
            style={{ 
              backgroundColor: currentTheme?.colors?.brand?.primary || '#3b82f6'
            }}
          >
            <Plus size={18} className="mr-2" />
            Add Resource
          </Button>
        </div>
        
        {/* Search */}
        <div className="mb-6 relative">
          <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${theme.mode === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} size={18} />
          <Input
            type="text"
            placeholder="Search resources..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`pl-10 ${theme.mode === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white'}`}
          />
        </div>
        
        {/* Stats */}
        {stats && (
          <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 mb-6`}>
            <div className={`p-4 rounded-lg ${theme.mode === 'dark' ? 'bg-gray-700' : 'bg-white'} shadow`}>
              <h3 className="text-sm font-medium mb-1">Total Resources</h3>
              <p className="text-2xl font-bold">{stats.total_resources || 0}</p>
            </div>
            <div className={`p-4 rounded-lg ${theme.mode === 'dark' ? 'bg-gray-700' : 'bg-white'} shadow`}>
              <h3 className="text-sm font-medium mb-1">Active Resources</h3>
              <p className="text-2xl font-bold">{stats.active_resources || 0}</p>
            </div>
            <div className={`p-4 rounded-lg ${theme.mode === 'dark' ? 'bg-gray-700' : 'bg-white'} shadow`}>
              <h3 className="text-sm font-medium mb-1">Featured Resources</h3>
              <p className="text-2xl font-bold">{stats.featured_resources || 0}</p>
            </div>
            <div className={`p-4 rounded-lg ${theme.mode === 'dark' ? 'bg-gray-700' : 'bg-white'} shadow`}>
              <h3 className="text-sm font-medium mb-1">Total Views</h3>
              <p className="text-2xl font-bold">{stats.total_views || 0}</p>
            </div>
          </div>
        )}
        
        {/* Resources Table */}
        <div className={`rounded-lg overflow-hidden border ${theme.mode === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
          <Table>
            <TableHeader>
              <TableRow className={theme.mode === 'dark' ? 'border-gray-600 hover:bg-gray-600' : 'hover:bg-gray-50'}>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSortClick('title')}
                >
                  <div className="flex items-center">
                    Title
                    {sortField === 'title' && (
                      sortDirection === 'asc' ? 
                        <ChevronUp size={16} className="ml-1" /> : 
                        <ChevronDown size={16} className="ml-1" />
                    )}
                  </div>
                </TableHead>
                <TableHead className="hidden md:table-cell">Type</TableHead>
                <TableHead 
                  className="hidden lg:table-cell cursor-pointer"
                  onClick={() => handleSortClick('published_date')}
                >
                  <div className="flex items-center">
                    Published
                    {sortField === 'published_date' && (
                      sortDirection === 'asc' ? 
                        <ChevronUp size={16} className="ml-1" /> : 
                        <ChevronDown size={16} className="ml-1" />
                    )}
                  </div>
                </TableHead>
                <TableHead className="hidden lg:table-cell">Tags</TableHead>
                <TableHead className="text-center">Featured</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResources.length === 0 ? (
                <TableRow className={theme.mode === 'dark' ? 'border-gray-600 hover:bg-gray-600' : 'hover:bg-gray-50'}>
                  <TableCell colSpan={7} className="text-center py-8">
                    No resources found. 
                    {searchTerm && (
                      <Button 
                        variant="link" 
                        onClick={() => setSearchTerm('')}
                        className={theme.mode === 'dark' ? 'text-blue-400' : 'text-blue-600'}
                      >
                        Clear search
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filteredResources.map((resource) => (
                  <TableRow key={resource.id} className={theme.mode === 'dark' ? 'border-gray-600 hover:bg-gray-600' : 'hover:bg-gray-50'}>
                    <TableCell>
                      <div className="font-medium max-w-xs truncate">{resource.title}</div>
                      <div className={`text-xs truncate ${theme.mode === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {resource.path}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline">{resource.content_type}</Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell whitespace-nowrap">
                      <div className="flex items-center">
                        <Calendar size={14} className="mr-1" />
                        {new Date(resource.published_date).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {resource.tags.slice(0, 2).map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                        {resource.tags.length > 2 && (
                          <Badge
                            variant="outline"
                            className="text-xs"
                          >
                            +{resource.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleFeatured(resource)}
                        className={resource.is_featured ? 'text-yellow-500' : theme.mode === 'dark' ? 'text-gray-400' : 'text-gray-500'}
                        title={resource.is_featured ? "Remove from featured" : "Add to featured"}
                      >
                        <Star size={18} className={resource.is_featured ? 'fill-yellow-500' : ''} />
                      </Button>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleActive(resource)}
                        className={resource.is_active ? 'text-green-500' : 'text-red-500'}
                        title={resource.is_active ? "Deactivate resource" : "Activate resource"}
                      >
                        {resource.is_active ? <Eye size={18} /> : <EyeOff size={18} />}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditResourceClick(resource)}
                        className={`${theme.mode === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-100'}`}
                        title="Edit resource"
                      >
                        <Edit2 size={18} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteResourceClick(resource)}
                        className={`text-red-500 ${theme.mode === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-100'}`}
                        title="Delete resource"
                      >
                        <Trash2 size={18} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination/count */}
        <div className={`mt-4 text-sm ${theme.mode === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
          Showing {filteredResources.length} of {resources.length} resources
        </div>
      </div>
      
      {/* Resource Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className={`${theme.mode === 'dark' ? 'bg-gray-800 text-white' : 'bg-white'} max-w-2xl`}>
          <DialogHeader>
            <DialogTitle>{selectedResource ? 'Edit Resource' : 'Add New Resource'}</DialogTitle>
            <DialogDescription className={theme.mode === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
              {selectedResource 
                ? 'Update the resource details below.' 
                : 'Fill out the form below to add a new resource.'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="grid grid-cols-1 gap-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title <span className="text-red-500">*</span></Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title || ''}
                  onChange={handleInputChange}
                  className={`${theme.mode === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white'} ${formErrors.title ? 'border-red-500' : ''}`}
                  placeholder="Resource title"
                />
                {formErrors.title && (
                  <p className="text-sm text-red-500">{formErrors.title}</p>
                )}
              </div>
              
              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description <span className="text-red-500">*</span></Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description || ''}
                  onChange={handleInputChange}
                  className={`${theme.mode === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white'} min-h-20 ${formErrors.description ? 'border-red-500' : ''}`}
                  placeholder="Resource description"
                />
                {formErrors.description && (
                  <p className="text-sm text-red-500">{formErrors.description}</p>
                )}
              </div>
              
              {/* Content Type */}
              <div className="space-y-2">
                <Label htmlFor="content_type">Content Type <span className="text-red-500">*</span></Label>
                <Input
                  id="content_type"
                  name="content_type"
                  value={formData.content_type || ''}
                  onChange={handleInputChange}
                  className={`${theme.mode === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white'} ${formErrors.content_type ? 'border-red-500' : ''}`}
                  placeholder="E.g., Assessment, Calculator, Guide"
                />
                {formErrors.content_type && (
                  <p className="text-sm text-red-500">{formErrors.content_type}</p>
                )}
              </div>
              
              {/* Path */}
              <div className="space-y-2">
                <Label htmlFor="path">Path <span className="text-red-500">*</span></Label>
                <div className="flex items-center">
                  <LinkIcon size={16} className={`mr-2 ${theme.mode === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                  <Input
                    id="path"
                    name="path"
                    value={formData.path || ''}
                    onChange={handleInputChange}
                    className={`${theme.mode === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white'} ${formErrors.path ? 'border-red-500' : ''}`}
                    placeholder="/public/resource-path"
                  />
                </div>
                {formErrors.path && (
                  <p className="text-sm text-red-500">{formErrors.path}</p>
                )}
              </div>
              
              {/* Image URL */}
              <div className="space-y-2">
                <Label htmlFor="image_url">Image URL</Label>
                <div className="flex items-center">
                  <ImageIcon size={16} className={`mr-2 ${theme.mode === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                  <Input
                    id="image_url"
                    name="image_url"
                    value={formData.image_url || ''}
                    onChange={handleInputChange}
                    className={`${theme.mode === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white'}`}
                    placeholder="/images/resources/image.png"
                  />
                </div>
              </div>
              
              {/* Published Date */}
              <div className="space-y-2">
                <Label htmlFor="published_date">Published Date</Label>
                <Input
                  id="published_date"
                  name="published_date"
                  type="date"
                  value={formData.published_date || ''}
                  onChange={handleInputChange}
                  className={`${theme.mode === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white'}`}
                />
              </div>
              
              {/* Tags */}
              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Input
                      id="tagInput"
                      value={tagInput}
                      onChange={handleTagInputChange}
                      onKeyDown={handleTagInputKeyDown}
                      className={`${theme.mode === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white'}`}
                      placeholder="Add a tag and press Enter"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={addTag} 
                      className="ml-2"
                      disabled={!tagInput.trim()}
                    >
                      <Tag size={16} className="mr-2" />
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.tags?.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className={`${theme.mode === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}
                      >
                        {tag}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeTag(tag)}
                          className="h-4 w-4 ml-1 rounded-full"
                        >
                          <X size={12} />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Options */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="is_active" className="cursor-pointer">
                    Active
                  </Label>
                  <Switch
                    id="is_active"
                    checked={formData.is_active === true}
                    onCheckedChange={(checked) => handleSwitchChange('is_active', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="is_featured" className="cursor-pointer">
                    Featured
                  </Label>
                  <Switch
                    id="is_featured"
                    checked={formData.is_featured === true}
                    onCheckedChange={(checked) => handleSwitchChange('is_featured', checked)}
                  />
                </div>
                
                {isAdmin && (
                  <div className="flex items-center justify-between">
                    <Label htmlFor="is_test" className="cursor-pointer">
                      Test Resource
                    </Label>
                    <Switch
                      id="is_test"
                      checked={formData.is_test === true}
                      onCheckedChange={(checked) => handleSwitchChange('is_test', checked)}
                    />
                  </div>
                )}
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)}
                disabled={isSubmitting}
                className={theme.mode === 'dark' ? 'border-gray-600 text-white' : ''}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={isSubmitting}
                style={{ 
                  backgroundColor: currentTheme?.colors?.brand?.primary || '#3b82f6'
                }}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {selectedResource ? 'Update Resource' : 'Create Resource'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className={theme.mode === 'dark' ? 'bg-gray-800 text-white' : 'bg-white'}>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this resource?</AlertDialogTitle>
            <AlertDialogDescription className={theme.mode === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
              This action cannot be undone. The resource will be permanently deleted from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-2 my-4">
            <Label htmlFor="confirmDelete" className="text-sm font-medium">
              Type <span className="font-bold">delete</span> to confirm
            </Label>
            <Input
              id="confirmDelete"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className={`${theme.mode === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white'}`}
              placeholder="delete"
            />
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel 
              className={theme.mode === 'dark' ? 'border-gray-600 text-white hover:bg-gray-700' : ''}
              disabled={isSubmitting}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (deleteConfirmText.toLowerCase() === 'delete') {
                  handleDeleteConfirm();
                }
              }}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              disabled={deleteConfirmText.toLowerCase() !== 'delete' || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>Delete</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ResourcesManagementPage;