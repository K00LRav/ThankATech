"use client";

import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

interface Technician {
  id: string;
  name: string;
  email?: string;
  category?: string;
  createdAt?: any;
}

export default function CleanupAdminPage() {
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
          createdAt: data.createdAt
        });
      });

      // Sort by creation date (oldest first)
      techs.sort((a, b) => {
        const getTime = (t: Technician) => {
          if (t.createdAt?.toMillis) return t.createdAt.toMillis();
          if (t.createdAt?.seconds) return t.createdAt.seconds * 1000;
          return 0;
        };
        return getTime(a) - getTime(b);
      });

      setTechnicians(techs);
      setLoading(false);
    } catch (error) {
      console.error('Error loading technicians:', error);
      setLoading(false);
    }
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

  const deleteMultiple = async (idsToDelete: string[]) => {
    if (!confirm(`Delete ${idsToDelete.length} technicians? This cannot be undone!`)) {
      return;
    }

    setDeleting('multiple');
    let deleted = 0;

    for (const id of idsToDelete) {
      try {
        await deleteDoc(doc(db, 'technicians', id));
        try {
          await deleteDoc(doc(db, 'users', id));
        } catch (e) {
          // Ignore
        }
        deleted++;
      } catch (error) {
        console.error(`Error deleting ${id}:`, error);
      }
    }

    await loadTechnicians();
    setDeleting(null);
    alert(`Deleted ${deleted} out of ${idsToDelete.length} technicians!`);
  };

  const getCreatedAtDisplay = (tech: Technician) => {
    if (!tech.createdAt) return 'Unknown';
    
    try {
      const timestamp = tech.createdAt.toMillis ? 
        tech.createdAt.toMillis() : 
        tech.createdAt.seconds * 1000;
      
      return new Date(timestamp).toLocaleString();
    } catch {
      return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 p-8 flex items-center justify-center">
        <div className="text-white text-xl">Loading technicians...</div>
      </div>
    );
  }

  const toKeep = technicians.slice(0, 3);
  const toDelete = technicians.slice(3);

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            🧹 Cleanup Admin Panel
          </h1>
          <div className="bg-blue-500/20 border border-blue-400/30 rounded-lg p-4">
            <p className="text-blue-200 mb-2">
              <strong>Current Situation:</strong>
            </p>
            <ul className="text-blue-200 text-sm space-y-1 ml-4">
              <li>• {technicians.length} registered technicians in Firebase</li>
              <li>• ~11 mock technicians in code (getMockTechnicians)</li>
              <li>• Some mocks were converted to real users (causing duplicates)</li>
              <li>• Total showing: 19 technicians</li>
            </ul>
            <p className="text-yellow-200 mt-3 text-sm">
              ⚠️ <strong>Note:</strong> You converted mock users to real users for profile pages. 
              Keep registered users that need profile pages (like thankatech.com/username).
            </p>
          </div>
        </div>

        {/* Keep These */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-green-400">
              ✅ Keep These ({toKeep.length})
            </h2>
            <span className="text-sm text-gray-400">Oldest technicians</span>
          </div>
          <div className="space-y-3">
            {toKeep.map((tech, index) => (
              <div 
                key={tech.id}
                className="bg-green-500/10 border border-green-400/30 rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-semibold">
                      #{index + 1} - {tech.name}
                    </div>
                    <div className="text-sm text-gray-400">
                      {tech.email || 'No email'} • {tech.category || 'No category'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Created: {getCreatedAtDisplay(tech)}
                    </div>
                  </div>
                  <div className="text-green-400 font-bold">
                    KEEP
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Delete These */}
        {toDelete.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-red-400">
                ❌ Delete These ({toDelete.length})
              </h2>
              <button
                onClick={() => deleteMultiple(toDelete.map(t => t.id))}
                disabled={deleting !== null}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                {deleting === 'multiple' ? 'Deleting...' : `Delete All ${toDelete.length}`}
              </button>
            </div>
            <div className="space-y-3">
              {toDelete.map((tech, index) => (
                <div 
                  key={tech.id}
                  className="bg-red-500/10 border border-red-400/30 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-white font-semibold">
                        #{toKeep.length + index + 1} - {tech.name}
                      </div>
                      <div className="text-sm text-gray-400">
                        {tech.email || 'No email'} • {tech.category || 'No category'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Created: {getCreatedAtDisplay(tech)}
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

        {toDelete.length === 0 && (
          <div className="bg-green-500/20 border border-green-400/30 rounded-lg p-6 text-center">
            <h3 className="text-2xl font-bold text-green-400 mb-2">
              🎉 Perfect!
            </h3>
            <p className="text-green-200">
              You have exactly 3 registered technicians. Total count: 3 + 11 mock = 14 ✅
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
          <h3 className="text-lg font-semibold text-white mb-2">Instructions:</h3>
          <ol className="text-gray-300 space-y-2 list-decimal list-inside">
            <li>Review the technicians marked for deletion</li>
            <li>Click "Delete All {toDelete.length}" to remove them all at once</li>
            <li>Or delete them individually using the "Delete" button</li>
            <li>Once done, go back to the home page and refresh</li>
            <li>You should see "1 of 14" in the pagination!</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
