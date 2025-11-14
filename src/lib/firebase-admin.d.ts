import type { Firestore } from 'firebase-admin/firestore';
import type { Auth } from 'firebase-admin/auth';
import type { App } from 'firebase-admin/app';

export const adminDb: Firestore | null;
export const adminAuth: Auth | null;

declare const adminApp: App | undefined;
export default adminApp;
