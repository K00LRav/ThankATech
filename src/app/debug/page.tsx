'use client';
// @ts-nocheck

import React, { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import Link from 'next/link';

export default function DebugPage() {
  const [user, setUser] = useState<any>(null);
  const [userDoc, setUserDoc] = useState<any>(null);
  const [techDoc, setTechDoc] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allTechnicians, setAllTechnicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth || !db) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        
        try {
          // Get user document
          const userDocRef = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDocRef.exists()) {
            setUserDoc({ id: userDocRef.id, ...userDocRef.data() });
          }
          
          // Get technician document
          const techDocRef = await getDoc(doc(db, 'technicians', firebaseUser.uid));
          if (techDocRef.exists()) {
            setTechDoc({ id: techDocRef.id, ...techDocRef.data() });
          }
          
          // Get all users
          const usersSnapshot = await getDocs(collection(db, 'users'));
          const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setAllUsers(users);
          
          // Get all technicians
          const techSnapshot = await getDocs(collection(db, 'technicians'));
          const technicians = techSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setAllTechnicians(technicians);
          
        } catch (error) {
          console.error('Error loading debug data:', error);
        }
      } else {
        setUser(null);
        setUserDoc(null);
        setTechDoc(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Loading Debug Info...</h1>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Debug Page - Please Sign In</h1>
          <Link href="/" className="text-blue-400 hover:text-blue-300">Go to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Debug Information</h1>
          <Link href="/" className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded">
            Back to Home
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Current User Info */}
          <div className="bg-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4 text-blue-400">Firebase Auth User</h2>
            <div className="space-y-2 text-sm">
              <div><strong>UID:</strong> {user.uid}</div>
              <div><strong>Email:</strong> {user.email}</div>
              <div><strong>Display Name:</strong> {user.displayName || 'Not set'}</div>
              <div><strong>Photo URL:</strong> {user.photoURL || 'Not set'}</div>
              <div><strong>Email Verified:</strong> {user.emailVerified ? 'Yes' : 'No'}</div>
            </div>
          </div>

          {/* User Document */}
          <div className="bg-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4 text-green-400">Users Collection Document</h2>
            {userDoc ? (
              <div className="space-y-2 text-sm">
                <div><strong>ID:</strong> {userDoc.id}</div>
                <div><strong>Name:</strong> {userDoc.name || 'Not set'}</div>
                <div><strong>Email:</strong> {userDoc.email || 'Not set'}</div>
                <div><strong>User Type:</strong> {userDoc.userType || 'Not set'}</div>
                <div><strong>Category:</strong> {userDoc.category || 'Not set'}</div>
                <div><strong>Business Name:</strong> {userDoc.businessName || 'Not set'}</div>
                <div><strong>Points:</strong> {userDoc.points || 0}</div>
                <div><strong>Total Tips:</strong> {userDoc.totalTips || 0}</div>
                <div><strong>Photo URL:</strong> {userDoc.photoURL || 'Not set'}</div>
              </div>
            ) : (
              <p className="text-gray-400">No document found in users collection</p>
            )}
          </div>

          {/* Technician Document */}
          <div className="bg-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4 text-purple-400">Technicians Collection Document</h2>
            {techDoc ? (
              <div className="space-y-2 text-sm">
                <div><strong>ID:</strong> {techDoc.id}</div>
                <div><strong>Name:</strong> {techDoc.name || 'Not set'}</div>
                <div><strong>Email:</strong> {techDoc.email || 'Not set'}</div>
                <div><strong>User Type:</strong> {techDoc.userType || 'Not set'}</div>
                <div><strong>Category:</strong> {techDoc.category || 'Not set'}</div>
                <div><strong>Business Name:</strong> {techDoc.businessName || 'Not set'}</div>
                <div><strong>Points:</strong> {techDoc.points || 0}</div>
                <div><strong>Total Tips:</strong> {techDoc.totalTips || 0}</div>
                <div><strong>Photo URL:</strong> {techDoc.photoURL || 'Not set'}</div>
              </div>
            ) : (
              <p className="text-gray-400">No document found in technicians collection</p>
            )}
          </div>

          {/* Dashboard Link */}
          <div className="bg-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4 text-yellow-400">Dashboard Access</h2>
            <div className="space-y-4">
              <p className="text-sm">
                {techDoc || (userDoc && userDoc.userType === 'technician') 
                  ? '✅ You should be able to access the dashboard'
                  : '❌ No technician profile found - dashboard access will be denied'
                }
              </p>
              <Link 
                href="/dashboard" 
                className="inline-block bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded text-white"
              >
                Try Dashboard
              </Link>
            </div>
          </div>
        </div>

        {/* All Users */}
        <div className="mt-8 bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4 text-blue-400">All Users ({allUsers.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-600">
                  <th className="text-left p-2">ID</th>
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Email</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Category</th>
                </tr>
              </thead>
              <tbody>
                {allUsers.map(user => (
                  <tr key={user.id} className="border-b border-slate-700">
                    <td className="p-2 font-mono text-xs">{user.id.substring(0, 8)}...</td>
                    <td className="p-2">{user.name || 'N/A'}</td>
                    <td className="p-2">{user.email || 'N/A'}</td>
                    <td className="p-2">{user.userType || 'N/A'}</td>
                    <td className="p-2">{user.category || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* All Technicians */}
        <div className="mt-8 bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4 text-purple-400">All Technicians ({allTechnicians.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-600">
                  <th className="text-left p-2">ID</th>
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Email</th>
                  <th className="text-left p-2">Category</th>
                  <th className="text-left p-2">Business Name</th>
                </tr>
              </thead>
              <tbody>
                {allTechnicians.map(tech => (
                  <tr key={tech.id} className="border-b border-slate-700">
                    <td className="p-2 font-mono text-xs">{tech.id.substring(0, 8)}...</td>
                    <td className="p-2">{tech.name || 'N/A'}</td>
                    <td className="p-2">{tech.email || 'N/A'}</td>
                    <td className="p-2">{tech.category || 'N/A'}</td>
                    <td className="p-2">{tech.businessName || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
