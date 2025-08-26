/**
 * Creates a timestamp which tracks when something was created,
 * when something was updated, and several helper methods.
 */
export class Timestamp {
  public readonly createdAt = Date.now()
  public updatedAt = Date.now()

  constructor(public readonly options: { maxAge: number }) {}

  public update() {
    this.updatedAt = Date.now()
  }

  public get age() {
    return Date.now() - this.createdAt
  }

  public get lastAlive() {
    return Date.now() - this.updatedAt
  }

  public get isExpired() {
    return this.lastAlive >= this.options.maxAge
  }
}
