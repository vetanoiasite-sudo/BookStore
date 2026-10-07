import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, Router } from '@angular/router';
import { filter, firstValueFrom } from 'rxjs';
import { gsap } from 'gsap';
import { PageReveal } from '../../core/services/page-reveal.service';
import { ThemeService } from '../../core/services/theme.service';

/** The shortest time the brand lockup stays on screen, so a fast load never just flickers. */
const MIN_HOLD_MS = 2600;
/** A slow background image must never hold the site hostage. */
const IMAGE_TIMEOUT_MS = 4000;
/** How much of the curtain's travel the inner stage cancels out; the rest reads as parallax. */
const STAGE_COUNTER = 0.75;
const SCROLL_KEYS = new Set([' ', 'PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown']);

const blockScroll = (e: Event) => e.preventDefault();
const blockScrollKeys = (e: KeyboardEvent) => {
  if (SCROLL_KEYS.has(e.key)) e.preventDefault();
};

/**
 * The full-screen brand screen shown while the site boots. Once the first route has
 * rendered, the screen lifts away as a curtain with a curved lower edge and uncovers
 * the page underneath.
 *
 * The curve is the curtain's own rounded bottom, and the reveal only ever moves
 * layers with transforms, so the browser composites every frame on the GPU instead
 * of repainting a full-screen clip.
 */
@Component({
  selector: 'ui-preloader',
  template: `
    @if (visible()) {
      <div #curtain class="preloader" aria-hidden="true">
        <div #stage class="preloader__stage">
          <img
            #backdrop
            class="preloader__backdrop"
            [src]="theme.asset('preloader/preloader-bg.webp')"
            alt=""
            decoding="async"
            fetchpriority="high"
          />
          <div #lockup class="preloader__lockup" dir="ltr">
            <img
              class="preloader__logo"
              [src]="theme.asset('preloader/preloader-logo.svg')"
              width="162"
              height="244"
              alt=""
            />
            <p class="preloader__name">Vetanoia Store</p>
          </div>
        </div>
      </div>
    }
  `,
  styleUrl: './preloader.scss',
})
export class UiPreloader {
  private readonly router = inject(Router);
  private readonly reveal = inject(PageReveal);
  protected readonly theme = inject(ThemeService);

  protected readonly visible = signal(true);

  private readonly curtain = viewChild<ElementRef<HTMLElement>>('curtain');
  private readonly stage = viewChild<ElementRef<HTMLElement>>('stage');
  private readonly backdrop = viewChild<ElementRef<HTMLImageElement>>('backdrop');
  private readonly lockup = viewChild<ElementRef<HTMLElement>>('lockup');

  private readonly ctx = gsap.context(() => {});

  constructor() {
    // Listen before the first render so the initial navigation cannot slip past.
    const firstRoute = firstValueFrom(
      this.router.events.pipe(
        filter(
          (e) =>
            e instanceof NavigationEnd ||
            e instanceof NavigationCancel ||
            e instanceof NavigationError,
        ),
      ),
    );

    this.lockScroll(true);

    inject(DestroyRef).onDestroy(() => {
      this.ctx.revert();
      this.lockScroll(false);
    });

    afterNextRender(() => void this.run(firstRoute));
  }

  private async run(firstRoute: Promise<unknown>): Promise<void> {
    const curtain = this.curtain()?.nativeElement;
    const stage = this.stage()?.nativeElement;
    const backdrop = this.backdrop()?.nativeElement;
    const lockup = this.lockup()?.nativeElement;
    if (!curtain || !stage || !backdrop || !lockup) return this.finish();

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!reducedMotion) {
      this.ctx.add(() => {
        gsap
          .timeline({ defaults: { ease: 'expo.out' } })
          .from(backdrop, { scale: 1.12, autoAlpha: 0, duration: 2.4, ease: 'power2.out' })
          .from(lockup.children[0], { y: 36, scale: 0.9, autoAlpha: 0, duration: 1.6 }, 0.3)
          .from(lockup.children[1], { x: -28, autoAlpha: 0, duration: 1.6 }, 0.65);
      });
    }

    await Promise.all([
      firstRoute,
      this.imageReady(backdrop),
      document.fonts?.ready,
      new Promise((resolve) => setTimeout(resolve, reducedMotion ? 0 : MIN_HOLD_MS)),
    ]);

    // The page starts showing from here, so its own entrances can begin.
    this.reveal.markRevealed();

    if (reducedMotion) {
      this.ctx.add(() => {
        gsap.to(curtain, { autoAlpha: 0, duration: 0.25, onComplete: () => this.finish() });
      });
      return;
    }

    this.ctx.add(() => {
      const travel = curtain.offsetHeight;
      gsap
        .timeline({ onComplete: () => this.finish() })
        .to(lockup, { y: -48, autoAlpha: 0, duration: 1, ease: 'power2.in' }, 0)
        // The curtain rises while its contents are held back, so the photo drifts up
        // slower than the edge and the reveal has depth.
        .to(curtain, { y: -travel, duration: 2, ease: 'power3.inOut' }, 0.45)
        .to(stage, { y: travel * STAGE_COUNTER, duration: 2, ease: 'power3.inOut' }, 0.45);
    });
  }

  private imageReady(img: HTMLImageElement): Promise<void> {
    if (img.complete) return Promise.resolve();
    return new Promise((resolve) => {
      const done = () => resolve();
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', done, { once: true });
      setTimeout(done, IMAGE_TIMEOUT_MS);
    });
  }

  /**
   * Holds the page still underneath by swallowing scroll input. Hiding overflow would
   * remove the scrollbar and make the page jump sideways when it returns.
   */
  private lockScroll(locked: boolean): void {
    if (locked) {
      window.addEventListener('wheel', blockScroll, { passive: false });
      window.addEventListener('touchmove', blockScroll, { passive: false });
      window.addEventListener('keydown', blockScrollKeys);
    } else {
      window.removeEventListener('wheel', blockScroll);
      window.removeEventListener('touchmove', blockScroll);
      window.removeEventListener('keydown', blockScrollKeys);
    }
  }

  private finish(): void {
    // No revert here: restoring the tweened styles would flash the curtain back for a
    // frame before the @if removes it. The context is reverted on destroy instead.
    this.visible.set(false);
    this.lockScroll(false);
    this.reveal.markRevealed();
  }
}
