import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import Button from './Button';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error("ErrorBoundary caught an error:", error, errorInfo);
        this.setState({
            error: error,
            errorInfo: errorInfo
        });
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return (
                <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center bg-gray-50 rounded-2xl border border-gray-100 m-4">
                    <div className="bg-rose-100 p-4 rounded-full mb-4">
                        <AlertTriangle className="h-12 w-12 text-rose-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Oups! Quelque chose s'est mal passé.</h2>
                    <p className="text-gray-500 mb-6 max-w-md">
                        Une erreur inattendue s'est produite dans cette partie de l'application. Nos équipes ont été notifiées.
                    </p>

                    {import.meta.env.DEV && this.state.error && (
                        <div className="mb-6 p-4 bg-gray-900 rounded-lg text-left overflow-auto w-full max-w-2xl max-h-64">
                            <p className="text-rose-400 font-mono text-sm mb-2">{this.state.error.toString()}</p>
                            <pre className="text-gray-400 font-mono text-xs">
                                {this.state.errorInfo?.componentStack}
                            </pre>
                        </div>
                    )}

                    <Button
                        onClick={this.handleReload}
                        icon={RefreshCcw}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                        Recharger la page
                    </Button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
