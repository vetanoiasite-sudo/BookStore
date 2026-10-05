import { Injectable, signal } from '@angular/core';

/** What a message is telling the reader. */
export type ToastTone = 'success' | 'error' | 'info';

/** One message on screen. */
export interface Toast {
  id: number;
  tone: ToastTone;

  /** A translation key, or literal text when the message came from the server. */
  message: string;

  /** True when the message is already in the reader's language. */
  literal: boolean;
}

/** How long a message stays before it removes itself. */
const LIFETIME_MS = 5000;

/**
 * Short confirmations and failures. Anything that changes data says so here, because
 * a silent success is indistinguishable from a request that never left.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;

  readonly toasts = signal<Toast[]>([]);

  /** Shows a translation key. */
  success(message: string): void {
    this.push('success', message, false);
  }

  info(message: string): void {
    this.push('info', message, false);
  }

  error(message: string): void {
    this.push('error', message, false);
  }

  /** Shows text the server already localised, such as a validation message. */
  failure(message: string): void {
    this.push('error', message, true);
  }

  dismiss(id: number): void {
    this.toasts.update((current) => current.filter((toast) => toast.id !== id));
  }

  private push(tone: ToastTone, message: string, literal: boolean): void {
    const id = this.nextId++;

    this.toasts.update((current) => [...current, { id, tone, message, literal }]);

    // Messages are confirmations, not a log. They clear themselves so the corner of
    // the screen does not fill up over a long editing session.
    setTimeout(() => this.dismiss(id), LIFETIME_MS);
  }
}
