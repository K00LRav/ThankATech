'use client';

import { useState } from 'react';

export default function FixTipsPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runFix = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/fix-anonymous-tips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error: any) {
      setResult({ error: 'Failed to run fix: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Fix Anonymous Tips</h1>
        
        <div className="bg-slate-800 rounded-lg p-6 mb-6">
          <p className="text-white mb-4">
            This tool will update existing tips that show as &quot;Anonymous&quot; by looking up customer information.
          </p>
          
          <button
            onClick={runFix}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? 'Running Fix...' : 'Fix Anonymous Tips'}
          </button>
        </div>

        {result && (
          <div className="bg-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">Results</h2>
            <pre className="text-green-400 text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
