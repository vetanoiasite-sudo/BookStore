import { Injectable, signal } from '@angular/core';

/**
 * Tells the page when it becomes visible. The preloader flips this as its curtain
 * starts to lift, so above-the-fold entrances play while they can be seen rather
 * than behind the brand screen. Any later navigation finds it already set.
 */
@Injectable({ providedIn: 'root' })
export class PageReveal {
  private readonly _revealed = signal(false);

  /** True once the page is on screen. */
  readonly revealed = this._revealed.asReadonly();

  markRevealed(): void {
    this._revealed.set(true);
  }
}
