import { useAppStore } from "@ui/store/useAppStore";

type ErrorContext = {
    component?: string;
    action?: string;
    sessionId?: string;
    [key: string]: unknown;
};

class ErrorService {
    private static instance: ErrorService;

    static getInstance(): ErrorService {
        if (!this.instance) {
            this.instance = new ErrorService();
        }
        return this.instance;
    }

    reportError(error: Error, context?: ErrorContext): void {
        console.error('[ErrorService]', context, error);

        // Display user-friendly error message
        const { setGlobalError } = useAppStore.getState();
        setGlobalError(this.formatErrorMessage(error));

        // TODO: Integrate with external logging service (e.g. Sentry)
    }

    private formatErrorMessage(error: Error): string {
        // Return friendly message based on error type
        if (error.message.includes('ENOENT')) {
            return 'File or directory does not exist';
        }
        if (error.message.includes('EACCES')) {
            return 'Permission denied';
        }
        return error.message;
    }
}

export const errorService = ErrorService.getInstance();
