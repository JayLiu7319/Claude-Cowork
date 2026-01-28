import { Component, ErrorInfo, ReactNode } from 'react';
import log from 'electron-log/renderer';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        log.error('Uncaught error in React component:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="h-screen w-screen flex flex-col items-center justify-center bg-base-100 text-base-content p-8">
                    <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
                    <div className="bg-base-200 p-4 rounded-lg overflow-auto max-w-full max-h-[50vh] mb-4">
                        <pre className="text-sm font-mono text-error">
                            {this.state.error && this.state.error.toString()}
                        </pre>
                    </div>
                    <p className="text-base-content/70">
                        The error has been logged. Please restart the application.
                    </p>
                    <button
                        className="mt-6 px-4 py-2 bg-primary text-primary-content rounded hover:bg-primary/90 transition-colors"
                        onClick={() => window.location.reload()}
                    >
                        Reload Application
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
