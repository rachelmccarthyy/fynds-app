import { EventEmitter } from "events";
import { CheckoutStatus, ItemStatusUpdate } from "../types";

class SessionStore {
  private sessions = new Map<string, CheckoutStatus>();
  private owners = new Map<string, string>(); // sessionId → userId (email)
  private emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(100);
  }

  create(
    sessionId: string,
    items: ItemStatusUpdate[],
    userId: string
  ): CheckoutStatus {
    const status: CheckoutStatus = {
      sessionId,
      overallStatus: "processing",
      items,
      startedAt: Date.now(),
    };
    this.sessions.set(sessionId, status);
    this.owners.set(sessionId, userId);
    return status;
  }

  get(sessionId: string): CheckoutStatus | undefined {
    return this.sessions.get(sessionId);
  }

  /** Returns true only if userId matches the user who created this session. */
  isOwner(sessionId: string, userId: string): boolean {
    return this.owners.get(sessionId) === userId;
  }

  updateItem(sessionId: string, update: ItemStatusUpdate): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const idx = session.items.findIndex(
      (i) => i.productLink === update.productLink
    );
    if (idx !== -1) {
      session.items[idx] = update;
    }

    const allDone = session.items.every(
      (i) =>
        i.status === "completed" ||
        i.status === "failed" ||
        i.status === "captcha_required"
    );

    if (allDone) {
      const allSuccess = session.items.every((i) => i.status === "completed");
      const allFailed = session.items.every(
        (i) => i.status === "failed" || i.status === "captcha_required"
      );
      session.overallStatus = allSuccess
        ? "completed"
        : allFailed
          ? "failed"
          : "partial";
      session.completedAt = Date.now();
    }

    this.emitter.emit(`update:${sessionId}`, session);
  }

  subscribe(
    sessionId: string,
    callback: (status: CheckoutStatus) => void
  ): () => void {
    const handler = (status: CheckoutStatus) => callback(status);
    this.emitter.on(`update:${sessionId}`, handler);
    return () => this.emitter.off(`update:${sessionId}`, handler);
  }

  cleanup(sessionId: string): void {
    this.sessions.delete(sessionId);
    this.owners.delete(sessionId);
    this.emitter.removeAllListeners(`update:${sessionId}`);
  }
}

export const sessionStore = new SessionStore();
