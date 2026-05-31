import { NextResponse } from "next/server";

/**
 * Centralized API error helpers.
 *
 * Goal: never leak internal details (Postgres messages, stack traces, schema
 * info) to clients in production, while still logging the full detail
 * server-side for debugging. In development the detail is echoed back to make
 * local work easier.
 */

const isDev = process.env.NODE_ENV !== "production";

type ErrCode =
  | "DB_ERROR"
  | "SERVER_ERROR"
  | "VALIDATION_ERROR"
  | "STORAGE_ERROR"
  | "AUTH_ERROR";

interface ErrorBody {
  error: { code: string; message: string; details?: unknown };
}

function build(code: ErrCode, publicMessage: string, detail: unknown): ErrorBody {
  const body: ErrorBody = { error: { code, message: publicMessage } };
  if (isDev && detail !== undefined) {
    body.error.details =
      detail instanceof Error ? detail.message : detail;
  }
  return body;
}

/** Log full detail server-side, return a generic 500 to the client. */
export function dbError(detail: unknown, context?: string) {
  console.error(`[DB_ERROR]${context ? ` ${context}` : ""}:`, detail);
  return NextResponse.json(
    build("DB_ERROR", "A database error occurred. Please try again.", detail),
    { status: 500 }
  );
}

/** Log full detail server-side, return a generic 500 to the client. */
export function serverError(detail: unknown, context?: string) {
  console.error(`[SERVER_ERROR]${context ? ` ${context}` : ""}:`, detail);
  return NextResponse.json(
    build("SERVER_ERROR", "An unexpected error occurred.", detail),
    { status: 500 }
  );
}

/** Generic storage failure (signed URLs, uploads). */
export function storageError(detail: unknown, context?: string) {
  console.error(`[STORAGE_ERROR]${context ? ` ${context}` : ""}:`, detail);
  return NextResponse.json(
    build("STORAGE_ERROR", "A storage error occurred.", detail),
    { status: 500 }
  );
}
