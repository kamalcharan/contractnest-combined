//src/utils/constants/channels.ts

import { countries, getPhoneLengthForCountry } from './countries';
import {
    validateChannelValue as validateChannelValueUtil,
    validatePhoneByCountry,
    getPhonePlaceholder,
    type ChannelType
} from '../validation/contactValidation';

export type ChannelValidationType = 'phone' | 'email' | 'url' | 'text' | 'social';

export interface ChannelValidation {
    type: ChannelValidationType;
    pattern?: RegExp;
    requiresCountryCode?: boolean;
    maxLength?: number;
    customValidation?: (value: string) => boolean;
}

export interface Channel {
    code: string;
    displayName: string;
    icon?: string;  // lucide icon name
    order: number;
    placeholder: string;
    validation: ChannelValidation;
}

export const CHANNELS: Channel[] = [
    {
        code: 'mobile',
        displayName: 'Mobile',
        icon: 'phone',
        order: 1,
        placeholder: 'Enter mobile number',
        validation: {
            type: 'phone',
            requiresCountryCode: true,
            maxLength: 15
        }
    },
    {
        code: 'phone',
        displayName: 'Phone',
        icon: 'phone',
        order: 2,
        placeholder: 'Enter phone number',
        validation: {
            type: 'phone',
            requiresCountryCode: true,
            maxLength: 15
        }
    },
    {
        code: 'email',
        displayName: 'Email',
        icon: 'mail',
        order: 3,
        placeholder: 'Enter email address',
        validation: {
            type: 'email',
            pattern: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
        }
    },
    {
        code: 'whatsapp',
        displayName: 'WhatsApp',
        icon: 'message-circle',
        order: 4,
        placeholder: 'Enter WhatsApp number',
        validation: {
            type: 'phone',
            requiresCountryCode: true,
            maxLength: 15
        }
    },
    {
        code: 'linkedin',
        displayName: 'LinkedIn',
        icon: 'linkedin',
        order: 5,
        placeholder: 'Enter LinkedIn profile URL',
        validation: {
            type: 'url',
            customValidation: (url: string) => url.includes('linkedin.com') || /^[a-zA-Z0-9\-]{3,100}$/.test(url)
        }
    },
    {
        code: 'twitter',
        displayName: 'Twitter',
        icon: 'twitter',
        order: 6,
        placeholder: '@username',
        validation: {
            type: 'social',
            pattern: /^@?[a-zA-Z0-9_]{1,15}$/,
            maxLength: 15
        }
    },
    {
        code: 'facebook',
        displayName: 'Facebook',
        icon: 'facebook',
        order: 7,
        placeholder: 'Enter Facebook profile URL or username',
        validation: {
            type: 'social',
            pattern: /^(?:https:\/\/(?:www\.)?facebook\.com\/|@?)[a-zA-Z0-9.]{1,50}$/
        }
    },
    {
        code: 'instagram',
        displayName: 'Instagram',
        icon: 'instagram',
        order: 8,
        placeholder: '@username',
        validation: {
            type: 'social',
            pattern: /^@?[a-zA-Z0-9_.]{1,30}$/,
            maxLength: 30
        }
    },
    {
        code: 'telegram',
        displayName: 'Telegram',
        icon: 'send',
        order: 9,
        placeholder: '@username',
        validation: {
            type: 'social',
            pattern: /^@?[a-zA-Z0-9_]{3,50}$/,
            maxLength: 50
        }
    },
    {
        code: 'skype',
        displayName: 'Skype',
        icon: 'video',
        order: 10,
        placeholder: 'Enter Skype username',
        validation: {
            type: 'social',
            pattern: /^[a-zA-Z0-9_.]{3,50}$/,
            maxLength: 50
        }
    },
    {
        code: 'website',
        displayName: 'Website',
        icon: 'globe',
        order: 11,
        placeholder: 'https://example.com',
        validation: {
            type: 'url'
        }
    }
];

// Helper functions
export const getChannelByCode = (code: string): Channel | undefined => {
    return CHANNELS.find(c => c.code === code);
};

/**
 * Validates a channel value using the centralized validation utility
 * Returns { isValid: boolean, error?: string }
 */
export const validateChannelValueWithError = (
    channelCode: string,
    value: string,
    countryCode?: string
): { isValid: boolean; error?: string } => {
    return validateChannelValueUtil(channelCode as ChannelType, value, countryCode);
};

/**
 * Legacy validation function - returns boolean only
 * @deprecated Use validateChannelValueWithError for better error messages
 */
export const validateChannelValue = (
    channel: Channel,
    value: string,
    countryCode?: string
): boolean => {
    const result = validateChannelValueUtil(channel.code as ChannelType, value, countryCode);
    return result.isValid;
};

/**
 * Gets dynamic placeholder based on country for phone channels
 */
export const getChannelPlaceholder = (channel: Channel, countryCode?: string): string => {
    if (channel.validation.type === 'phone' && countryCode) {
        return getPhonePlaceholder(countryCode);
    }
    return channel.placeholder;
};

/**
 * Format channel value for storage/display
 */
export const formatChannelValue = (
    channel: Channel,
    value: string,
    countryCode?: string
): string => {
    if (channel.validation.type === 'phone' && countryCode) {
        const country = countries.find(c => c.code === countryCode);
        if (country) {
            // Remove any existing country code and format
            const cleanValue = value.replace(/^\+\d+/, '').replace(/\D/g, '');
            return `+${country.phoneCode}${cleanValue}`;
        }
    }

    if (channel.validation.type === 'social' && !value.startsWith('@') && value.length > 0) {
        return `@${value}`;
    }

    return value;
};

/**
 * Check if a channel type requires country code selection
 */
export const channelRequiresCountryCode = (channelCode: string): boolean => {
    const channel = getChannelByCode(channelCode);
    return channel?.validation.requiresCountryCode === true;
};