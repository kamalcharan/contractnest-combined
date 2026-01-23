// src/components/common/cards/index.ts
// Shared card components for consistent UX across the application

export { ViewCard } from './ViewCard';
export type { ViewCardProps } from './ViewCard';

export { PersonListItem } from './PersonListItem';
export type { PersonListItemProps, ContactPerson, ContactChannel } from './PersonListItem';

// Re-export helpers from PersonListItem
export {
  getPersonPrimaryChannel,
  getPersonChannelDisplay,
  getChannelIcon,
  getPersonInitials,
  formatPhoneDisplay,
  CHANNEL_ICONS
} from './PersonListItem';
