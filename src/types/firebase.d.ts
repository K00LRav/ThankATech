// Type declarations for Firebase modules
declare module '@/lib/firebase' {
  import { Firestore } from 'firebase/firestore';
  import { Auth } from 'firebase/auth';
  import { FirebaseStorage } from 'firebase/storage';
  import { GoogleAuthProvider } from 'firebase/auth';

  export const db: Firestore | null;
  export const auth: Auth | null;
  export const storage: FirebaseStorage | null;
  export const googleProvider: GoogleAuthProvider | null;
  
  // Export all the functions with proper types
  export function registerTechnician(technicianData: any): Promise<any>;
  export function registerUser(userData: any): Promise<any>;
  export function fetchTechnicians(): Promise<any[]>;
  export function sendThankYou(technicianId: string, userId: string, message?: string): Promise<any>;
  export function sendTip(technicianId: string, userId: string, amount: number, message?: string): Promise<any>;
  export function uploadTechnicianPhoto(technicianId: string, photoFile: File): Promise<string>;
  export function migrateTechnicianProfile(uid: string): Promise<any>;
  export function deleteUserProfile(uid: string, userType: string): Promise<void>;
  export function getTechnicianTransactions(technicianId: string, technicianEmail: string, technicianUniqueId?: string): Promise<any[]>;
  export function getCustomerTransactions(customerId: string, customerEmail: string): Promise<any[]>;
  export function recordTransaction(transactionData: any): Promise<any>;
  export function getTechnician(technicianId: string): Promise<any>;
  export function getUser(userId: string): Promise<any>;
  export function getUserByEmail(email: string): Promise<any>;
  export function findTechnicianByEmail(email: string): Promise<any>;
  export const authHelpers: any;
  export const COLLECTIONS: any;
}