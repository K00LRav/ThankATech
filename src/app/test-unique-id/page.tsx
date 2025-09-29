'use client';

import React, { useState } from 'react';

export default function TestUniqueIdPage() {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Function to create unique ID (matching our Firebase implementation)
  function createUniqueId(email: string, firstName = '', lastName = '') {
    const emailPart = email.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const namePart = `${firstName}_${lastName}`.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `${namePart}_${emailPart}`.replace(/_+/g, '_').replace(/^_|_$/g, '');
  }

  const runTests = () => {
    setIsLoading(true);
    
    const testCases = [
      {
        email: 'k00lrav@gmail.com',
        firstName: 'Ray',
        lastName: 'Soma',
        expected: 'ray_soma_k00lrav_gmail_com'
      },
      {
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        expected: 'john_doe_john_doe_example_com'
      },
      {
        email: 'test@test.com',
        firstName: '',
        lastName: '',
        expected: 'test_test_com'
      },
      {
        email: 'sarah.johnson@gmail.com',
        firstName: 'Sarah',
        lastName: 'Johnson',
        expected: 'sarah_johnson_sarah_johnson_gmail_com'
      }
    ];

    const results = testCases.map(testCase => {
      const generated = createUniqueId(testCase.email, testCase.firstName, testCase.lastName);
      return {
        ...testCase,
        generated,
        passed: generated === testCase.expected
      };
    });

    setTestResults(results);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-8 border border-white/10">
          <h1 className="text-3xl font-bold text-white mb-6">Unique ID System Test</h1>
          
          <button
            onClick={runTests}
            disabled={isLoading}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors mb-6"
          >
            {isLoading ? 'Running Tests...' : 'Run Unique ID Tests'}
          </button>

          {testResults.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white mb-4">Test Results</h2>
              
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    result.passed
                      ? 'bg-green-500/10 border-green-500/20 text-green-100'
                      : 'bg-red-500/10 border-red-500/20 text-red-100'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-4 h-4 rounded-full ${result.passed ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    <span className="font-semibold">
                      Test {index + 1}: {result.passed ? 'PASSED' : 'FAILED'}
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    <p><strong>Email:</strong> {result.email}</p>
                    <p><strong>Name:</strong> {result.firstName} {result.lastName}</p>
                    <p><strong>Expected:</strong> {result.expected}</p>
                    <p><strong>Generated:</strong> {result.generated}</p>
                  </div>
                </div>
              ))}
              
              <div className="mt-6 p-4 bg-slate-700/50 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-2">Summary</h3>
                <p className="text-blue-200">
                  {testResults.filter(r => r.passed).length} out of {testResults.length} tests passed
                </p>
                {testResults.every(r => r.passed) && (
                  <p className="text-green-400 font-semibold mt-2">✅ All tests passed! Unique ID generation is working correctly.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
