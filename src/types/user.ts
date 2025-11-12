// User and Technician type definitions for ThankATech

export interface BaseUser {
  id: string;
  email: string;
  name?: string;
  displayName?: string;
  photoURL?: string | null;
  uid?: string;
  authUid?: string;
  uniqueId?: string;
  createdAt?: Date | string;
}

export interface Client extends BaseUser {
  userType: 'client' | 'customer';
  phone?: string;
  location?: string;
  totalThankYousSent?: number;
  totalTipsSent?: number;
  points?: number;
  profileImage?: string | null;
}

export interface Technician extends BaseUser {
  userType: 'technician';
  username: string;
  businessName: string;
  title: string;
  category: string;
  subcategory?: string;
  about?: string;
  description?: string;
  
  // Contact info
  phone?: string;
  businessPhone?: string;
  businessEmail?: string;
  businessAddress?: string;
  website?: string;
  
  // Service details
  experience?: string;
  certifications?: string;
  serviceArea?: string;
  hourlyRate?: string;
  availability?: string;
  
  // Location
  location?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  distance?: number;
  isNearby?: boolean;
  
  // Profile
  image?: string;
  
  // Stats
  points: number;
  totalThankYous?: number;
  totalTips?: number;
  totalTipAmount?: number;
  totalEarnings?: number;
  lastTipDate?: string;
  
  // Status
  isActive: boolean;
  isClaimed?: boolean;
  claimedBy?: string;
  claimedAt?: Date | string;
  claimId?: string;
  isSample?: boolean;
  
  // Google integration
  googleLinked?: boolean;
  googleLinkedAt?: string;
  lastUpdated?: string;
  photoUpdatedAt?: Date;
}

export interface TipTransaction {
  id: string;
  technicianId: string;
  technicianEmail?: string;
  technicianName?: string;
  technicianUniqueId?: string;
  customerId?: string;
  customerEmail?: string;
  customerName?: string;
  customerUniqueId?: string;
  amount: number;
  technicianPayout?: number;
  platformFee?: number;
  message?: string;
  timestamp?: Date | any;
  createdAt?: Date | string | any;
  status: string;
  paymentIntent?: string;
  paymentIntentId?: string;
  points?: number;
}

export type User = Client | Technician;

export interface UserProfile extends BaseUser {
  userType?: 'client' | 'customer' | 'technician';
  businessName?: string;
  username?: string;
  [key: string]: any; // For flexibility with existing code
}
