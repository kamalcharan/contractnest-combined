// src/pages/public/resources.tsx
//
// TODO [PUBLIC DEPLOYMENT]: This page imports from '@/services/public-resources.service'
// which needs to be created before making this page publicly accessible.
// The service should provide: getPublicResources(), trackResourceView(), ResourceCardData type
// Follow the pattern in '@/services/public-leads.service.ts' for unauthenticated Supabase access.
//
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Filter, X, ExternalLink, Clock } from 'lucide-react';
import { analyticsService } from '@/services/analytics.service';
import { captureError } from '@/config/sentry.config';
import { getPublicResources, trackResourceView, ResourceCardData } from '@/services/public-resources.service';

const ResourcesPage: React.FC = () => {
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedContentTypes, setSelectedContentTypes] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [resources, setResources] = useState<ResourceCardData[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [availableContentTypes, setAvailableContentTypes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Theme
  const themeContext = useTheme();
  const theme = themeContext?.theme || { mode: 'light' };
  const { currentTheme } = themeContext || {};

  // Load resources from the database
  useEffect(() => {
    let isMounted = true;
    
    const loadResources = async () => {
      try {
        setIsLoading(true);
        
        const data = await getPublicResources();
        
        if (isMounted) {
          setResources(data);
          
          // Extract unique tags and content types
          const allTags = data.flatMap(resource => resource.tags);
          const uniqueTags = [...new Set(allTags)].sort();
          setAvailableTags(uniqueTags);
          
          const allContentTypes = data.map(resource => resource.content_type);
          const uniqueContentTypes = [...new Set(allContentTypes)].sort();
          setAvailableContentTypes(uniqueContentTypes);
          
          setError(null);
        }
      } catch (err) {
        console.error('Error loading resources:', err);
        if (isMounted) {
          setError('Failed to load resources. Please try again later.');
          
          try {
            captureError(err as Error, {
              tags: { component: 'ResourcesPage', action: 'loadResources' }
            });
          } catch (sentryError) {
            console.error("Error logging to Sentry:", sentryError);
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    loadResources();
    
    // Track page view
    try {
      analyticsService.trackWorkspaceEvent('resources_page_viewed', {
        theme: theme.mode,
        locale: navigator.language,
        referrer: document.referrer || 'direct'
      });
    } catch (analyticsError) {
      console.error('Analytics error:', analyticsError);
    }
    
    return () => {
      isMounted = false;
    };
  }, [theme.mode]);
  
  // Filter resources based on search term and selected tags/content types
  const filteredResources = resources.filter(resource => {
    // Search filter
    const matchesSearch = 
      searchTerm === '' || 
      resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Tags filter
    const matchesTags = 
      selectedTags.length === 0 || 
      selectedTags.some(tag => resource.tags.includes(tag));
    
    // Content type filter
    const matchesContentType = 
      selectedContentTypes.length === 0 || 
      selectedContentTypes.includes(resource.content_type);
    
    return matchesSearch && matchesTags && matchesContentType;
  });

  // Handle tag selection
  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag) 
        : [...prev, tag]
    );
  };

  // Handle content type selection
  const toggleContentType = (type: string) => {
    setSelectedContentTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type) 
        : [...prev, type]
    );
  };

  // Track resource click
  const handleResourceClick = (resourceId: string, resourceType: string) => {
    trackResourceView(resourceId, resourceType)
      .catch(error => console.error('Error tracking resource view:', error));
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedTags([]);
    setSelectedContentTypes([]);
  };

  // Format date helper
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }).format(date);
    } catch (e) {
      return dateString;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`min-h-screen ${theme.mode === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-12">
            <h1 className={`text-3xl font-bold mb-2 ${theme.mode === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Resources & Tools
            </h1>
            <p className={`text-lg ${theme.mode === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Explore our collection of digital transformation resources and tools
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, index) => (
              <Card key={index} className={`${theme.mode === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white'}`}>
                <CardContent className="p-0">
                  <Skeleton className="h-48 w-full rounded-t-lg" />
                  <div className="p-5">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-4 w-2/3 mb-4" />
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-6 w-24" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                    <Skeleton className="h-10 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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

  return (
    <div className={`min-h-screen ${theme.mode === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className={`text-3xl font-bold mb-2 ${theme.mode === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Resources & Tools
          </h1>
          <p className={`text-lg ${theme.mode === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
            Explore our collection of digital transformation resources and tools
          </p>
        </div>
        
        {/* Search and filter */}
        <div className="mb-8">
          <div className="relative flex items-center mb-4">
            <Search className={`absolute left-3 ${theme.mode === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} size={18} />
            <Input
              type="text"
              placeholder="Search resources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`pl-10 ${theme.mode === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white'}`}
            />
            <Button
              variant="ghost"
              onClick={() => setShowFilters(!showFilters)}
              className={`ml-2 ${theme.mode === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              <Filter size={18} className="mr-1" />
              Filters
            </Button>
            {(selectedTags.length > 0 || selectedContentTypes.length > 0) && (
              <Button
                variant="ghost"
                onClick={clearFilters}
                className="ml-2 text-red-500 hover:text-red-600"
              >
                <X size={18} className="mr-1" />
                Clear
              </Button>
            )}
          </div>
          
          {showFilters && (
            <div className={`p-5 rounded-lg mb-6 ${theme.mode === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
              {/* Content type filter */}
              {availableContentTypes.length > 0 && (
                <div className="mb-4">
                  <h3 className={`font-medium mb-2 ${theme.mode === 'dark' ? 'text-white' : 'text-gray-900'}`}>Content Type</h3>
                  <div className="flex flex-wrap gap-2">
                    {availableContentTypes.map((type) => (
                      <Badge
                        key={type}
                        variant={selectedContentTypes.includes(type) ? "default" : "outline"}
                        className={`cursor-pointer ${
                          selectedContentTypes.includes(type) 
                            ? currentTheme?.colors?.brand?.primary ? `bg-[${currentTheme.colors.brand.primary}] hover:bg-[${currentTheme.colors.brand.primary}]/80` : '' 
                            : theme.mode === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-200'
                        }`}
                        style={selectedContentTypes.includes(type) ? {
                          backgroundColor: currentTheme?.colors?.brand?.primary || undefined
                        } : undefined}
                        onClick={() => toggleContentType(type)}
                      >
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Tags filter */}
              {availableTags.length > 0 && (
                <div>
                  <h3 className={`font-medium mb-2 ${theme.mode === 'dark' ? 'text-white' : 'text-gray-900'}`}>Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map((tag) => (
                      <Badge
                        key={tag}
                        variant={selectedTags.includes(tag) ? "default" : "outline"}
                        className={`cursor-pointer ${
                          selectedTags.includes(tag) 
                            ? currentTheme?.colors?.brand?.primary ? `bg-[${currentTheme.colors.brand.primary}] hover:bg-[${currentTheme.colors.brand.primary}]/80` : '' 
                            : theme.mode === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-200'
                        }`}
                        style={selectedTags.includes(tag) ? {
                          backgroundColor: currentTheme?.colors?.brand?.primary || undefined
                        } : undefined}
                        onClick={() => toggleTag(tag)}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Results count */}
          <div className={`text-sm ${theme.mode === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            Showing {filteredResources.length} of {resources.length} resources
          </div>
        </div>
        
        {/* Results */}
        {filteredResources.length === 0 ? (
          <div className={`text-center py-12 ${theme.mode === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
            <p className="text-lg mb-2">No resources found matching your criteria</p>
            <Button 
              variant="outline" 
              onClick={clearFilters}
              className="mt-2"
              style={{ 
                borderColor: currentTheme?.colors?.brand?.primary,
                color: currentTheme?.colors?.brand?.primary
              }}
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResources.map((resource) => (
              <Card 
                key={resource.id}
                className={`overflow-hidden hover:shadow-lg transition-shadow ${theme.mode === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white'}`}
              >
                <CardContent className="p-0">
                  <div 
                    className="h-48 bg-gray-300 bg-center bg-cover"
                    style={{ backgroundImage: `url(${resource.image_url || '/images/resources/placeholder.png'})` }}
                  />
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-2">
                      <Badge 
                        className="mb-2"
                        style={{
                          backgroundColor: currentTheme?.colors?.brand?.primary || undefined
                        }}
                      >
                        {resource.content_type}
                      </Badge>
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock size={14} className="mr-1" />
                        {formatDate(resource.published_date)}
                      </div>
                    </div>
                    <h3 className={`text-xl font-semibold mb-2 ${theme.mode === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {resource.title}
                    </h3>
                    <p className={`mb-3 line-clamp-2 ${theme.mode === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      {resource.description}
                    </p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {resource.tags.slice(0, 3).map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className={`cursor-pointer ${theme.mode === 'dark' ? 'border-gray-500 text-gray-300' : 'border-gray-300'}`}
                          onClick={() => {
                            if (!selectedTags.includes(tag)) {
                              toggleTag(tag);
                            }
                          }}
                        >
                          {tag}
                        </Badge>
                      ))}
                      {resource.tags.length > 3 && (
                        <Badge
                          variant="outline"
                          className={theme.mode === 'dark' ? 'border-gray-500 text-gray-300' : 'border-gray-300'}
                        >
                          +{resource.tags.length - 3} more
                        </Badge>
                      )}
                    </div>
                    <Link 
                      to={resource.path} 
                      onClick={() => handleResourceClick(resource.id, resource.content_type)}
                    >
                      <Button 
                        className="w-full"
                        style={{ 
                          backgroundColor: currentTheme?.colors?.brand?.primary || undefined,
                          opacity: 1
                        }}
                      >
                        Access Resource
                        <ExternalLink size={16} className="ml-2" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        {/* Items count */}
        <div className={`mt-8 text-sm text-center ${theme.mode === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
          Showing {filteredResources.length} items (1-{Math.min(filteredResources.length, resources.length)})
        </div>
      </div>
    </div>
  );
};

export default ResourcesPage;