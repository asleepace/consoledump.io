import { Try } from '@asleepace/try'
import { BufferedFile } from '../server/buffered-file'

function encodeObjectForErrors(obj: unknown): string {
  if (typeof obj !== 'object') return String(obj)
  if (obj instanceof BufferedFile) {
    return `BufferedFile: path ${obj.filePath}`
  }
  return Try.catch(() => JSON.stringify(obj)).unwrapOr(String(obj))
}

export type ErrorResponseInit = Record<string, string | number | boolean> &
  ResponseInit

/**
 *  Universal error class for the application.
 */
export class ApiError extends Error {
  /** cast and item to an ApiError instance if it's not already. */
  static from(err: unknown): ApiError {
    if (err instanceof ApiError) return err
    if (err instanceof Error) new ApiError(err.message, err)
    return new ApiError(err)
  }

  static throw(...args: any[]): never {
    throw new ApiError(...args)
  }

  constructor(...args: any[]) {
    super(args.map(encodeObjectForErrors).join(' '))
    console.warn(this)
  }

  /**
   *  Create an HTTP response from the error.
   *
   *  @param {ResponseInit} options
   */
  public toResponse({
    status = 500,
    statusText = 'Api Error',
    headers = {},
    ...info
  }: ErrorResponseInit = {}): Response {
    return Response.json(
      { name: this.name, error: this.message, ...info },
      {
        statusText,
        status,
        headers,
      }
    )
  }
}
