import { Try } from '@asleepace/try'

function encodeObjectForErrors(obj: unknown): string {
  if (typeof obj !== 'object') return String(obj)
  return Try.catch(() => JSON.stringify(obj)).unwrapOr(String(obj))
}

export type ErrorResponseInit = Record<string, string | number | boolean> & ResponseInit

/**
 *  Universal error class for the application.
 */
export class ApiError extends Error {
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
