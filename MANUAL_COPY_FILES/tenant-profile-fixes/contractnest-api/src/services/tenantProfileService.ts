// backend/src/services/tenantProfileService.ts
// UPDATED: Logo upload now uses Firebase Storage directly (same pattern as storageService.ts)
import axios from 'axios';
import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  FirebaseStorage
} from 'firebase/storage';
import { getAuth, signInAnonymously, Auth, User, onAuthStateChanged } from 'firebase/auth';
import { v4 as uuidv4 } from 'uuid';
import { captureException } from '../utils/sentry';
import { SUPABASE_URL } from '../utils/supabaseConfig';

export interface TenantProfile {
  id: string;
  tenant_id: string;
  business_type_id: string;
  industry_id: string;
  business_name: string;
  logo_url: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state_code: string | null;
  country_code: string | null;
  postal_code: string | null;
  business_phone_country_code: string | null;
  business_phone: string | null;
  business_email: string | null;
  website_url: string | null;
  // WhatsApp fields for BBB integration
  business_whatsapp_country_code: string | null;
  business_whatsapp: string | null;
  // Contact person and booking fields
  booking_url: string | null;
  contact_first_name: string | null;
  contact_last_name: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  created_at: string;
  updated_at: string;
}

export interface TenantProfileCreate extends Omit<TenantProfile, 'id' | 'created_at' | 'updated_at'> {}

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// Firebase instances (shared with storageService pattern)
let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let firebaseStorage: FirebaseStorage | null = null;
let authInitializationPromise: Promise<User> | null = null;

// Initialize Firebase with better error handling (same pattern as storageService.ts)
const initializeFirebase = async (): Promise<{ app: FirebaseApp; auth: Auth; storage: FirebaseStorage; user: User }> => {
  if (authInitializationPromise && firebaseApp && firebaseAuth && firebaseStorage) {
    const user = await authInitializationPromise;
    return { app: firebaseApp, auth: firebaseAuth, storage: firebaseStorage, user };
  }

  try {
    if (!firebaseApp) {
      firebaseApp = initializeApp(firebaseConfig, 'tenant-profile-service');
      console.log("✓ Firebase app initialized for tenant-profile");
    }

    if (!firebaseAuth) {
      firebaseAuth = getAuth(firebaseApp);
      console.log("✓ Firebase Auth initialized");
    }

    if (!firebaseStorage) {
      firebaseStorage = getStorage(firebaseApp);
      console.log("✓ Firebase Storage initialized");
    }

    if (!authInitializationPromise) {
      authInitializationPromise = new Promise<User>(async (resolve, reject) => {
        try {
          const unsubscribe = onAuthStateChanged(firebaseAuth!, (user) => {
            if (user) {
              unsubscribe();
              resolve(user);
            }
          });

          await signInAnonymously(firebaseAuth!);
          console.log("✓ Firebase authenticated");

        } catch (authError: any) {
          console.error("Firebase authentication error:", authError);
          reject(authError);
        }
      });
    }

    const user = await authInitializationPromise;
    return { app: firebaseApp, auth: firebaseAuth, storage: firebaseStorage, user };
  } catch (error: any) {
    console.error('Firebase initialization failed:', error);
    authInitializationPromise = null;
    throw error;
  }
};

// Service implementation
export const tenantProfileService = {
  /**
   * Get tenant profile for a specific tenant
   */
  async getTenantProfile(authToken: string, tenantId: string): Promise<TenantProfile | null> {
    try {
      if (!SUPABASE_URL) {
        throw new Error('Missing SUPABASE_URL configuration');
      }

      const response = await axios.get(
        `${SUPABASE_URL}/functions/v1/tenant-profile`,
        {
          headers: {
            Authorization: authToken,
            'x-tenant-id': tenantId,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error in getTenantProfile service:', error);
      captureException(error instanceof Error ? error : new Error(String(error)), {
        tags: { source: 'service_tenant_profile', action: 'getTenantProfile' },
        tenantId
      });
      throw error;
    }
  },

  /**
   * Create a new tenant profile
   */
  async createTenantProfile(
    authToken: string,
    tenantId: string,
    profileData: TenantProfileCreate
  ): Promise<TenantProfile> {
    try {
      if (!SUPABASE_URL) {
        throw new Error('Missing SUPABASE_URL configuration');
      }

      // Basic validation of inputs
      if (!profileData.business_name) {
        throw new Error('business_name is required');
      }

      const response = await axios.post(
        `${SUPABASE_URL}/functions/v1/tenant-profile`,
        profileData,
        {
          headers: {
            Authorization: authToken,
            'x-tenant-id': tenantId,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error in createTenantProfile service:', error);
      captureException(error instanceof Error ? error : new Error(String(error)), {
        tags: { source: 'service_tenant_profile', action: 'createTenantProfile' },
        tenantId
      });
      throw error;
    }
  },

  /**
   * Update an existing tenant profile
   */
  async updateTenantProfile(
    authToken: string,
    tenantId: string,
    profileData: Partial<TenantProfileCreate> & { tenant_id: string }
  ): Promise<TenantProfile> {
    try {
      if (!SUPABASE_URL) {
        throw new Error('Missing SUPABASE_URL configuration');
      }

      if (!profileData.business_name) {
        throw new Error('business_name is required');
      }

      const response = await axios.put(
        `${SUPABASE_URL}/functions/v1/tenant-profile`,
        profileData,
        {
          headers: {
            Authorization: authToken,
            'x-tenant-id': tenantId,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error in updateTenantProfile service:', error);
      captureException(error instanceof Error ? error : new Error(String(error)), {
        tags: { source: 'service_tenant_profile', action: 'updateTenantProfile' },
        tenantId
      });
      throw error;
    }
  },

  /**
   * Upload a logo for the tenant profile
   * ✅ FIXED: Now uploads directly to Firebase Storage (same pattern as storageService.ts)
   */
  async uploadLogo(authToken: string, tenantId: string, file: Express.Multer.File): Promise<string> {
    try {
      if (!SUPABASE_URL) {
        throw new Error('Missing SUPABASE_URL configuration');
      }

      // Validate file
      if (!file || !file.buffer) {
        throw new Error('No file provided');
      }

      // Validate file type
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
      if (!allowedTypes.includes(file.mimetype)) {
        throw new Error('Invalid file type. Allowed: PNG, JPG, SVG');
      }

      // Validate file size (5MB max)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error('File size exceeds 5MB limit');
      }

      console.log(`Uploading logo for tenant ${tenantId}, file: ${file.originalname}, size: ${file.size}`);

      // ✅ Initialize Firebase and upload directly
      const { storage } = await initializeFirebase();

      // Generate unique file path
      const fileId = uuidv4();
      const fileExtension = file.originalname.split('.').pop() || 'png';
      const sanitizedFileName = `logo_${fileId}.${fileExtension}`;
      const filePath = `tenant_logos/${tenantId}/${sanitizedFileName}`;

      console.log(`Firebase storage path: ${filePath}`);

      // Create storage reference and upload
      const storageRef = ref(storage, filePath);
      await uploadBytes(storageRef, file.buffer, {
        contentType: file.mimetype,
        customMetadata: {
          tenantId,
          originalName: file.originalname,
          uploadedAt: new Date().toISOString()
        }
      });

      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef);
      console.log(`Logo uploaded successfully: ${downloadURL}`);

      // ✅ Update the profile with the new logo URL via Edge function
      await axios.post(
        `${SUPABASE_URL}/functions/v1/tenant-profile/logo`,
        { logo_url: downloadURL },
        {
          headers: {
            Authorization: authToken,
            'x-tenant-id': tenantId,
            'Content-Type': 'application/json'
          }
        }
      );

      return downloadURL;
    } catch (error) {
      console.error('Error in uploadLogo service:', error);
      captureException(error instanceof Error ? error : new Error(String(error)), {
        tags: { source: 'service_tenant_profile', action: 'uploadLogo' },
        tenantId
      });
      throw error;
    }
  }
};
