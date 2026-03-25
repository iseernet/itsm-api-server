export class JiraClientError extends Error {
    constructor(
        message: string,
        public readonly status?: number,
        public readonly data?: any,
        public readonly code?: string
    ) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class JiraAuthenticationError extends JiraClientError {
    constructor(message: string, status?: number, data?: any) {
        super(message, status, data, 'AUTH_ERROR');
    }
}

export class JiraApiError extends JiraClientError {
    constructor(
        message: string,
        status?: number,
        data?: any,
        code?: string
    ) {
        super(message, status, data, code || 'API_ERROR');
    }
}

export class JiraRateLimitError extends JiraApiError {
    constructor(message: string, retryAfter?: number) {
        super(message, 429, { retryAfter }, 'RATE_LIMIT_EXCEEDED');
    }
}

export class JiraNotFoundError extends JiraApiError {
    constructor(message: string) {
        super(message, 404, undefined, 'NOT_FOUND');
    }
}

export class JiraValidationError extends JiraApiError {
    constructor(message: string, errors?: any[]) {
        super(message, 400, { errors }, 'VALIDATION_ERROR');
    }
}