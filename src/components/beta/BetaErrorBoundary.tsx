'use client';

import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { WarningCircle, ArrowClockwise } from '@phosphor-icons/react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * BetaErrorBoundary - React error boundary for Beta section components.
 *
 * Catches rendering errors in children and displays a friendly fallback UI
 * with an "Intentar de nuevo" button that resets the error state.
 *
 * Usage at two levels:
 * 1. Inner boundaries in BetaLayout wrap sidebar and main content independently
 * 2. Outer boundary in route layout catches page-level errors
 *
 * Supports custom fallback prop for specialized error displays.
 */
export class BetaErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[BetaErrorBoundary]', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center h-full px-6 py-12">
          <WarningCircle className="w-12 h-12 text-red-400 mb-4" weight="fill" />
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Algo salio mal
          </h2>
          <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
            Ocurrio un error inesperado. Puedes intentar de nuevo o recargar la pagina.
          </p>
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-2 px-4 py-2 rounded-lg
                       bg-indigo-500 text-white hover:bg-indigo-600
                       text-sm font-medium transition-colors"
          >
            <ArrowClockwise className="w-4 h-4" />
            Intentar de nuevo
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
