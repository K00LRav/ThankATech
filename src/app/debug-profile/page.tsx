'use client';
// @ts-nocheck

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

export default function DebugProfile() {
  const [user, setUser] = useState<any>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        
        try {
          console.log('🔍 Debug: Searching for profiles for user:', firebaseUser.email);
          const foundProfiles = [];
          
          // Search technicians collection by UID
          const techByUid = await getDoc(doc(db, 'technicians', firebaseUser.uid));
          if (techByUid.exists()) {
            foundProfiles.push({
              source: 'technicians (by UID)',
              id: techByUid.id,
              ...techByUid.data()
            });
          }
          
          // Search technicians collection by email
          const techByEmailQuery = query(
            collection(db, 'technicians'),
            where('email', '==', firebaseUser.email)
          );
          const techByEmailSnapshot = await getDocs(techByEmailQuery);
          techByEmailSnapshot.forEach(doc => {
            foundProfiles.push({
              source: 'technicians (by email)',
              id: doc.id,
              ...doc.data()
            });
          });
          
          // Search users collection by UID
          const userByUid = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userByUid.exists()) {
            foundProfiles.push({
              source: 'users (by UID)',
              id: userByUid.id,
              ...userByUid.data()
            });
          }
          
          // Search users collection by email
          const userByEmailQuery = query(
            collection(db, 'users'),
            where('email', '==', firebaseUser.email)
          );
          const userByEmailSnapshot = await getDocs(userByEmailQuery);
          userByEmailSnapshot.forEach(doc => {
            foundProfiles.push({
              source: 'users (by email)',
              id: doc.id,
              ...doc.data()
            });
          });
          
          console.log('🔍 Debug: Found profiles:', foundProfiles);
          setProfiles(foundProfiles);
        } catch (error) {
          console.error('Error searching for profiles:', error);
        }
      } else {
        setUser(null);
        setProfiles([]);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">🔍 Profile Debug</h1>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">🔍 Profile Debug</h1>
          <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-6">
            <p className="text-red-300">❌ No user signed in</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🔍 Profile Debug</h1>
        
        {/* Firebase User */}
        <div className="bg-slate-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Firebase Auth User</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><strong>UID:</strong> {user.uid}</div>
            <div><strong>Email:</strong> {user.email}</div>
            <div><strong>Display Name:</strong> {user.displayName || 'N/A'}</div>
            <div><strong>Photo URL:</strong> {user.photoURL ? 'Yes' : 'No'}</div>
          </div>
        </div>
        
        {/* Found Profiles */}
        <div className="bg-slate-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Found Profiles</h2>
          <p className="text-blue-200 mb-4">Found: {profiles.length} profile(s)</p>
          
          {profiles.length === 0 ? (
            <div className="text-yellow-300 p-4 bg-yellow-900/20 rounded-lg">
              ⚠️ No profiles found for this user. They may need to register.
            </div>
          ) : (
            <div className="space-y-4">
              {profiles.map((profile, index) => (
                <div key={index} className="bg-slate-700 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2 text-green-300">{profile.source}</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><strong>Document ID:</strong> {profile.id}</div>
                    <div><strong>Unique ID:</strong> {profile.uniqueId || 'N/A'}</div>
                    <div><strong>Name:</strong> {profile.name || profile.displayName || 'N/A'}</div>
                    <div><strong>Email:</strong> {profile.email || 'N/A'}</div>
                    <div><strong>User Type:</strong> {profile.userType || 'N/A'}</div>
                    <div><strong>Business Name:</strong> {profile.businessName || 'N/A'}</div>
                    <div><strong>Category:</strong> {profile.category || 'N/A'}</div>
                    <div><strong>Created:</strong> {profile.createdAt ? new Date(profile.createdAt.seconds * 1000).toLocaleString() : 'N/A'}</div>
                  </div>
                  <details className="mt-4">
                    <summary className="cursor-pointer text-blue-300 hover:text-blue-200">Show Full Data</summary>
                    <pre className="bg-slate-600 p-2 rounded mt-2 text-xs overflow-x-auto">
                      {JSON.stringify(profile, null, 2)}
                    </pre>
                  </details>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="text-center">
          <Link 
            href="/dashboard" 
            className="inline-block bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold transition-colors mr-4"
          >
            → Go to Dashboard
          </Link>
          <Link 
            href="/debug-transactions" 
            className="inline-block bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            → Check Transactions
          </Link>
        </div>
      </div>
    </div>
  );
}
