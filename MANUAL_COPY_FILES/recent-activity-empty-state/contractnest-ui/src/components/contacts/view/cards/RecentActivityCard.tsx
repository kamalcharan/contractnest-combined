// src/components/contacts/view/cards/RecentActivityCard.tsx - Full Production Version
import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Edit, 
  Phone, 
  Mail, 
  MessageCircle, 
  FileText, 
  Calendar, 
  User,
  UserPlus,
  Archive,
  CheckCircle,
  AlertCircle,
  XCircle,
  Star,
  Tag,
  Shield,
  CreditCard,
  Building,
  MapPin,
  Loader2,
  Activity,
  ChevronRight,
  Filter,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { AUDIT_EVENTS } from '@/utils/constants/contacts';

interface ActivityEvent {
  id: string;
  event_type: string;
  event_description: string;
  performed_by: string;
  performed_at: string;
  metadata?: {
    field?: string;
    old_value?: string;
    new_value?: string;
    channel_type?: string;
    address_type?: string;
    tag_name?: string;
    classification?: string;
    [key: string]: any;
  };
}

interface RecentActivityCardProps {
  contact: {
    id: string;
    audit_trail?: ActivityEvent[];
    created_at: string;
    updated_at: string;
  };
  limit?: number;
  className?: string;
}

const RecentActivityCard: React.FC<RecentActivityCardProps> = ({ 
  contact, 
  limit = 10,
  className = '' 
}) => {
  const { toast } = useToast();
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [showAll, setShowAll] = useState<boolean>(false);
  const [filterType, setFilterType] = useState<string>('all');

  // Initialize activities from contact data
  useEffect(() => {
    if (contact.audit_trail && contact.audit_trail.length > 0) {
      setActivities(contact.audit_trail);
    } else {
      // No audit trail - show empty state
      setActivities([]);
    }
  }, [contact]);

  // Generate mock activities for demonstration
  const generateMockActivities = () => {
    const mockActivities: ActivityEvent[] = [
      {
        id: '1',
        event_type: AUDIT_EVENTS.CONTACT_UPDATED,
        event_description: 'Contact information updated',
        performed_by: 'System Admin',
        performed_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        metadata: { field: 'phone', old_value: '+91 9999888777', new_value: '+91 9999888888' }
      },
      {
        id: '2',
        event_type: 'phone_call',
        event_description: 'Phone call completed (15 minutes)',
        performed_by: 'John Smith',
        performed_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        metadata: { duration: '15 minutes', outcome: 'successful' }
      },
      {
        id: '3',
        event_type: 'email_sent',
        event_description: 'Proposal email sent',
        performed_by: 'Sarah Wilson',
        performed_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
        metadata: { subject: 'Business Proposal - Q1 2024', template: 'proposal' }
      },
      {
        id: '4',
        event_type: 'meeting_scheduled',
        event_description: 'Follow-up meeting scheduled',
        performed_by: 'Mike Johnson',
        performed_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week ago
        metadata: { meeting_date: '2024-02-15', meeting_type: 'follow_up' }
      },
      {
        id: '5',
        event_type: AUDIT_EVENTS.TAG_ADDED,
        event_description: 'Tag added to contact',
        performed_by: 'Emma Davis',
        performed_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
        metadata: { tag_name: 'Priority Client' }
      },
      {
        id: '6',
        event_type: AUDIT_EVENTS.CONTACT_CREATED,
        event_description: 'Contact added to system',
        performed_by: 'System',
        performed_at: contact.created_at
      }
    ];

    setActivities(mockActivities);
  };

  // Get activity icon based on event type
  const getActivityIcon = (eventType: string) => {
    switch (eventType) {
      case AUDIT_EVENTS.CONTACT_CREATED:
        return { icon: UserPlus, color: 'text-green-600' };
      case AUDIT_EVENTS.CONTACT_UPDATED:
        return { icon: Edit, color: 'text-blue-600' };
      case AUDIT_EVENTS.CONTACT_DELETED:
      case AUDIT_EVENTS.CONTACT_ARCHIVED:
        return { icon: Archive, color: 'text-red-600' };
      case AUDIT_EVENTS.CONTACT_ACTIVATED:
        return { icon: CheckCircle, color: 'text-green-600' };
      case AUDIT_EVENTS.CONTACT_DEACTIVATED:
        return { icon: XCircle, color: 'text-yellow-600' };
      case AUDIT_EVENTS.CHANNEL_ADDED:
      case AUDIT_EVENTS.CHANNEL_UPDATED:
        return { icon: Phone, color: 'text-purple-600' };
      case AUDIT_EVENTS.ADDRESS_ADDED:
      case AUDIT_EVENTS.ADDRESS_UPDATED:
        return { icon: MapPin, color: 'text-indigo-600' };
      case AUDIT_EVENTS.TAG_ADDED:
        return { icon: Tag, color: 'text-pink-600' };
      case AUDIT_EVENTS.CLASSIFICATION_ADDED:
        return { icon: Shield, color: 'text-orange-600' };
      case AUDIT_EVENTS.INVITATION_SENT:
        return { icon: Mail, color: 'text-cyan-600' };
      case 'phone_call':
        return { icon: Phone, color: 'text-green-600' };
      case 'email_sent':
        return { icon: Mail, color: 'text-blue-600' };
      case 'meeting_scheduled':
        return { icon: Calendar, color: 'text-purple-600' };
      case 'document_uploaded':
        return { icon: FileText, color: 'text-indigo-600' };
      case 'payment_received':
        return { icon: CreditCard, color: 'text-green-600' };
      default:
        return { icon: Activity, color: 'text-gray-600' };
    }
  };

  // Format relative time
  const formatRelativeTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)}w ago`;
    
    return date.toLocaleDateString();
  };

  // Get activity description with metadata
  const getEnhancedDescription = (activity: ActivityEvent): string => {
    let description = activity.event_description;
    
    if (activity.metadata) {
      switch (activity.event_type) {
        case AUDIT_EVENTS.CONTACT_UPDATED:
          if (activity.metadata.field) {
            description += ` (${activity.metadata.field}: ${activity.metadata.old_value} → ${activity.metadata.new_value})`;
          }
          break;
        case AUDIT_EVENTS.TAG_ADDED:
          if (activity.metadata.tag_name) {
            description = `Added tag "${activity.metadata.tag_name}"`;
          }
          break;
        case AUDIT_EVENTS.CHANNEL_ADDED:
          if (activity.metadata.channel_type) {
            description = `Added ${activity.metadata.channel_type} contact channel`;
          }
          break;
        case 'phone_call':
          if (activity.metadata.duration) {
            description = `Phone call completed (${activity.metadata.duration})`;
          }
          break;
        case 'email_sent':
          if (activity.metadata.subject) {
            description = `Email sent: "${activity.metadata.subject}"`;
          }
          break;
      }
    }
    
    return description;
  };

  // Filter activities by type
  const getFilteredActivities = (): ActivityEvent[] => {
    let filtered = activities;
    
    if (filterType !== 'all') {
      filtered = activities.filter(activity => {
        switch (filterType) {
          case 'updates':
            return activity.event_type.includes('updated') || activity.event_type.includes('added');
          case 'communications':
            return ['phone_call', 'email_sent', 'meeting_scheduled'].includes(activity.event_type);
          case 'system':
            return activity.performed_by === 'System';
          default:
            return true;
        }
      });
    }
    
    return showAll ? filtered : filtered.slice(0, limit);
  };

  // Refresh activities
  const refreshActivities = async () => {
    setLoading(true);
    try {
      // In production, this would call an API
      await new Promise(resolve => setTimeout(resolve, 1000));
      generateMockActivities();
      toast({
        title: "Activities refreshed",
        description: "Recent activity has been updated"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to refresh",
        description: "Could not refresh activity data"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredActivities = getFilteredActivities();

  return (
    <div className={`bg-card rounded-lg shadow-sm border border-border p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Filter dropdown */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs border border-border rounded px-2 py-1 bg-background text-foreground"
          >
            <option value="all">All Activity</option>
            <option value="updates">Updates</option>
            <option value="communications">Communications</option>
            <option value="system">System Events</option>
          </select>
          
          {/* Refresh button */}
          <button
            onClick={refreshActivities}
            disabled={loading}
            className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
            title="Refresh activity"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
      
      {/* Activity List */}
      {filteredActivities.length === 0 ? (
        // Empty state - Coming Soon
        <div className="text-center py-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Activity className="h-8 w-8 text-primary" />
          </div>
          <p className="text-lg font-semibold text-foreground mb-1">Coming Soon</p>
          <p className="text-sm text-muted-foreground">
            Activity tracking will be available shortly
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredActivities.map((activity, index) => {
            const { icon: IconComponent, color } = getActivityIcon(activity.event_type);
            const enhancedDescription = getEnhancedDescription(activity);
            
            return (
              <div key={activity.id} className="flex items-start gap-3 group">
                {/* Timeline indicator */}
                <div className="relative">
                  <div className={`p-2 rounded-full bg-muted/50 ${color} group-hover:bg-muted`}>
                    <IconComponent className="h-4 w-4" />
                  </div>
                  {/* Timeline line */}
                  {index < filteredActivities.length - 1 && (
                    <div className="absolute top-10 left-1/2 transform -translate-x-1/2 w-px h-8 bg-border" />
                  )}
                </div>
                
                {/* Activity content */}
                <div className="flex-1 min-w-0 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground leading-snug">
                        {enhancedDescription}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {activity.performed_by}
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(activity.performed_at)}
                        </span>
                      </div>
                    </div>
                    
                    {/* Timestamp */}
                    <div className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      {new Date(activity.performed_at).toLocaleTimeString()}
                    </div>
                  </div>
                  
                  {/* Additional metadata */}
                  {activity.metadata && (
                    <div className="mt-2 p-2 bg-muted/30 rounded text-xs text-muted-foreground">
                      {activity.event_type === 'phone_call' && activity.metadata.outcome && (
                        <div>Outcome: {activity.metadata.outcome}</div>
                      )}
                      {activity.event_type === 'email_sent' && activity.metadata.template && (
                        <div>Template: {activity.metadata.template}</div>
                      )}
                      {activity.event_type === 'meeting_scheduled' && activity.metadata.meeting_date && (
                        <div>Scheduled for: {new Date(activity.metadata.meeting_date).toLocaleDateString()}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Show more/less button */}
      {activities.length > limit && (
        <div className="mt-4 pt-4 border-t border-border text-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-primary hover:underline flex items-center gap-1 mx-auto"
          >
            {showAll ? 'Show less' : `Show all ${activities.length} activities`}
            <ChevronRight className={`h-3 w-3 transition-transform ${showAll ? 'rotate-90' : ''}`} />
          </button>
        </div>
      )}
      
      {/* Activity summary */}
      {activities.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{activities.length} total activities</span>
            <span>Last updated: {formatRelativeTime(contact.updated_at)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecentActivityCard;