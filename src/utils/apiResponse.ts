export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: unknown;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const createSuccessResponse = <T>(
  message: string,
  data?: T,
  pagination?: ApiResponse['pagination']
): ApiResponse<T> => ({ success: true, message, data, pagination });

export const createErrorResponse = (message: string, error?: unknown): ApiResponse => ({
  success: false,
  message,
  error,
});
