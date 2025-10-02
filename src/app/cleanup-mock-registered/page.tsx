"use client";

import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

interface Technician {
  id: string;
  name: string;
  email?: string;
  category?: string;
  username?: string;
  createdAt?: any;
}

export default function CleanupMockRegisteredPage() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadTechnicians();
  }, []);

  const loadTechnicians = async () => {
    try {
      const techsRef = collection(db, 'technicians');
      const snapshot = await getDocs(techsRef);
      
      const techs: Technician[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        techs.push({
          id: docSnap.id,
          name: data.name || 'Unknown',
          email: data.email,
          category: data.category,
          username: data.username,
          createdAt: data.createdAt
        });
      });

      // Sort by ID to separate mock from real
      techs.sort((a, b) => a.id.localeCompare(b.id));

      setTechnicians(techs);
      setLoading(false);
    } catch (error) {
      console.error('Error loading technicians:', error);
      setLoading(false);
    }
  };

  const isMockRegistered = (tech: Technician): boolean => {
    // Check if this is a mock user that was registered
    // Mock users have IDs starting with "mock-"
    return tech.id.startsWith('mock-');
  };

  const hasUserProfile = (tech: Technician): boolean => {
    // Real user profiles should have a username field
    return !!tech.username && !tech.id.startsWith('mock-');
  };

  const deleteTechnician = async (id: string) => {
    if (!confirm('Are you sure you want to delete this technician?')) {
      return;
    }

    setDeleting(id);
    try {
      // Delete from technicians collection
      await deleteDoc(doc(db, 'technicians', id));
      
      // Try to delete from users collection
      try {
        await deleteDoc(doc(db, 'users', id));
      } catch (e) {
        // User doc might not exist
      }

      // Reload list
      await loadTechnicians();
      alert('Technician deleted successfully!');
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Error deleting technician: ' + (error as Error).message);
    } finally {
      setDeleting(null);
    }
  };

  const deleteAllMockRegistered = async () => {
    const mockRegistered = technicians.filter(isMockRegistered);
    
    if (mockRegistered.length === 0) {
      alert('No mock registered users to delete!');
      return;
    }

    if (!confirm(`Delete ${mockRegistered.length} mock registered users? This cannot be undone!\n\nThese are mock users that were accidentally registered as real users.`)) {
      return;
    }

    setDeleting('multiple');
    let deleted = 0;

    for (const tech of mockRegistered) {
      try {
        await deleteDoc(doc(db, 'technicians', tech.id));
        try {
          await deleteDoc(doc(db, 'users', tech.id));
        } catch (e) {
          // Ignore
        }
        deleted++;
      } catch (error) {
        console.error(`Error deleting ${tech.id}:`, error);
      }
    }

    await loadTechnicians();
    setDeleting(null);
    alert(`Deleted ${deleted} out of ${mockRegistered.length} mock registered users!`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 p-8 flex items-center justify-center">
        <div className="text-white text-xl">Loading technicians...</div>
      </div>
    );
  }

  const mockRegistered = technicians.filter(isMockRegistered);
  const realUsers = technicians.filter(tech => !isMockRegistered(tech));

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            🧹 Remove Mock Registered Users
          </h1>
          <div className="bg-blue-500/20 border border-blue-400/30 rounded-lg p-4 space-y-2">
            <p className="text-blue-200">
              <strong>Total:</strong> {technicians.length} registered technicians
            </p>
            <p className="text-green-200">
              <strong>Real Users (with profiles):</strong> {realUsers.length} - KEEP these
            </p>
            <p className="text-red-200">
              <strong>Mock Registered Users:</strong> {mockRegistered.length} - DELETE these
            </p>
            <p className="text-yellow-200 text-sm mt-2">
              💡 Mock users have IDs like "mock-john-doe". They should only exist as mock data, not as registered users.
            </p>
          </div>
        </div>

        {/* Real Users - KEEP */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-green-400">
              ✅ Real Users - Keep These ({realUsers.length})
            </h2>
          </div>
          <div className="space-y-3">
            {realUsers.map((tech) => (
              <div 
                key={tech.id}
                className="bg-green-500/10 border border-green-400/30 rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-semibold">
                      {tech.name}
                    </div>
                    <div className="text-sm text-gray-400">
                      {tech.email || 'No email'} • {tech.category || 'No category'}
                    </div>
                    {tech.username && (
                      <div className="text-xs text-green-400 mt-1">
                        Profile: thankatech.com/{tech.username}
                      </div>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      ID: {tech.id}
                    </div>
                  </div>
                  <div className="text-green-400 font-bold">
                    KEEP ✓
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mock Registered - DELETE */}
        {mockRegistered.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-red-400">
                ❌ Mock Registered Users - Delete These ({mockRegistered.length})
              </h2>
              <button
                onClick={deleteAllMockRegistered}
                disabled={deleting !== null}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                {deleting === 'multiple' ? 'Deleting...' : `Delete All ${mockRegistered.length}`}
              </button>
            </div>
            <div className="space-y-3">
              {mockRegistered.map((tech) => (
                <div 
                  key={tech.id}
                  className="bg-red-500/10 border border-red-400/30 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-white font-semibold">
                        {tech.name}
                      </div>
                      <div className="text-sm text-gray-400">
                        {tech.email || 'No email'} • {tech.category || 'No category'}
                      </div>
                      <div className="text-xs text-red-400 mt-1">
                        Mock ID: {tech.id}
                      </div>
                      <div className="text-xs text-yellow-400 mt-1">
                        ⚠️ This is a mock user that was registered as a real user by mistake
                      </div>
                    </div>
                    <button
                      onClick={() => deleteTechnician(tech.id)}
                      disabled={deleting !== null}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 ml-4"
                    >
                      {deleting === tech.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {mockRegistered.length === 0 && (
          <div className="bg-green-500/20 border border-green-400/30 rounded-lg p-6 text-center">
            <h3 className="text-2xl font-bold text-green-400 mb-2">
              🎉 All Clean!
            </h3>
            <p className="text-green-200 mb-4">
              No mock registered users found. You only have real users with profiles!
            </p>
            <p className="text-green-200 mb-4">
              Total: {realUsers.length} real registered + 11 mock (display only) = {realUsers.length + 11} total
            </p>
            <a 
              href="/"
              className="inline-block mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Go to Home Page
            </a>
          </div>
        )}

        <div className="mt-8 p-4 bg-slate-800 rounded-lg border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-2">What This Does:</h3>
          <div className="text-gray-300 space-y-2">
            <p>
              <strong>Problem:</strong> Some mock users (like "mock-john-doe") were accidentally registered as real users in Firebase.
            </p>
            <p>
              <strong>Solution:</strong> This tool identifies and removes only the mock registered users (IDs starting with "mock-").
            </p>
            <p>
              <strong>Result:</strong> You'll keep all real users with actual profiles, while mock users will only exist in the code (not in Firebase).
            </p>
            <p className="text-yellow-300 mt-3">
              ⚠️ <strong>Important:</strong> Real users with usernames and profiles will NOT be deleted!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
