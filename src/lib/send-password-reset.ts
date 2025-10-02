/**
 * PASSWORD RESET TOOL: Send password reset email to users
 */

import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';

export async function sendPasswordReset(email: string): Promise<{success: boolean, message: string}> {
  if (!auth) {
    return { success: false, message: 'Firebase Auth not configured' };
  }

  try {
    console.log(`📧 Sending password reset email to: ${email}`);
    
    await sendPasswordResetEmail(auth, email);
    
    console.log(`✅ Password reset email sent successfully`);
    console.log(`💡 User should check their email inbox and spam folder`);
    
    return {
      success: true,
      message: `Password reset email sent to ${email}. Check inbox and spam folder.`
    };
    
  } catch (error: any) {
    console.error('❌ Password reset failed:', error);
    
    let errorMessage = 'Unknown error';
    if (error.code === 'auth/user-not-found') {
      errorMessage = 'No Firebase Auth account found for this email. User may need to sign up first.';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email format';
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = 'Too many reset attempts. Please try again later.';
    } else {
      errorMessage = error.message || error.code || 'Unknown error';
    }
    
    return { 
      success: false, 
      message: errorMessage
    };
  }
}

export default sendPasswordReset;