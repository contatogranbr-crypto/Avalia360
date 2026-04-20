import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<any, any> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    const { hasError, error } = this.state;
    // @ts-ignore - TS sometimes fails to recognize props inheritance in this environment
    const { children } = this.props;

    if (hasError) {
      return (
        <div className="p-10 bg-red-50 border-4 border-red-200 rounded-2xl m-10 text-center">
          <h1 className="text-2xl font-bold text-red-700 mb-4">Algo deu errado na interface.</h1>
          <p className="text-red-600 mb-6">O componente falhou ao carregar. Detalhes técnicos abaixo:</p>
          <pre className="bg-black/5 p-4 rounded text-left overflow-auto max-h-[400px] text-xs font-mono text-red-500 border border-red-100 mb-6">
            {error?.message}
            {"\n\n"}
            {error?.stack}
          </pre>
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Tentar Recarregar
          </button>
        </div>
      );
    }

    return children;
  }
}
