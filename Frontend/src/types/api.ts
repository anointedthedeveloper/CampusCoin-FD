// Shapes shared by every API response, and the error type httpClient throws.

/** Successful response envelope: `{ data, message? }`. */
export interface ApiSuccess<T> {
  data: T;
  message?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

/** Error body the backend sends: a message, an optional code and per-field errors. */
export interface ApiErrorBody {
  message: string;
  code?: string;
  fieldErrors?: Record<string, string>;
}

/** Thrown by httpClient for any failed request; carries the HTTP status and field errors. */
export class ApiError extends Error {
  code?: string;
  status?: number;
  fieldErrors?: Record<string, string>;

  constructor(message: string, options?: { code?: string; status?: number; fieldErrors?: Record<string, string> }) {
    super(message);
    this.name = 'ApiError';
    this.code = options?.code;
    this.status = options?.status;
    this.fieldErrors = options?.fieldErrors;
  }
}
