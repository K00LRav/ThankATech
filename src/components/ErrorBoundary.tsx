"use client";

import React, { Component, ReactNode } from 'react';
import { logger } from '@/lib/logger';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * ErrorBoundary component to catch and handle React errors gracefully
 * 
 * Usage:
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * 
 * Or with custom fallback:
 * <ErrorBoundary fallback={<CustomErrorUI />}>
 *   <YourComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log the error to console in development
    logger.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // You can also log the error to an error reporting service here
    // Example: Sentry.captureException(error, { extra: errorInfo });
    
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-red-500/30 p-6 sm:p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">⚠️</span>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Oops! Something went wrong
              </h1>
              <p className="text-gray-300">
                We're sorry, but something unexpected happened. Don't worry, we're working on it!
              </p>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-lg">
                <h3 className="font-semibold text-red-300 mb-2">Error Details (Dev Mode):</h3>
                <p className="text-sm text-red-200 font-mono break-all mb-2">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo && (
                  <details className="text-xs text-red-200">
                    <summary className="cursor-pointer hover:text-red-100 mb-2">
                      View Component Stack
                    </summary>
                    <pre className="whitespace-pre-wrap break-all bg-red-950/50 p-2 rounded">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-900 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 px-6 py-3 bg-white/10 backdrop-blur-sm border border-white/30 text-white rounded-lg font-medium hover:bg-white/20 transition-all duration-200"
              >
                Go Home
              </button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-400">
                If this problem persists, please{' '}
                <a 
                  href="/contact" 
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  contact support
                </a>
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Functional error boundary wrapper for easier use
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
): React.FC<P> {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

export default ErrorBoundary;

