import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { gsap } from 'gsap';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { TranslationService } from '../../../core/i18n/translation.service';
import { PageReveal } from '../../../core/services/page-reveal.service';

/** How long each photo stays before the next one lifts in. */
const SLIDE_SECONDS = 6;
/** Length of the curtain lift between two photos. */
const LIFT_SECONDS = 0.9;
/** Share of the curtain's travel its photo cancels out, as in the preloader. */
const STAGE_COUNTER = 0.75;
/** Horizontal drag, in pixels, that counts as a swipe. */
const SWIPE_DISTANCE = 50;

type Direction = 'up' | 'down';

/**
 * The home page hero: a full-bleed carousel of bookshop photos behind the tagline.
 *
 * Photos change the way the preloader leaves: the current one lifts away as a
 * curtain with a curved edge and uncovers the next, and the photo on screen slowly
 * settles from a slight zoom. Every move is a transform, so it stays on the GPU.
 */
@Component({
  selector: 'home-hero',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './home-hero.html',
  styleUrl: './home-hero.scss',
})
export class HomeHero {
  private readonly translations = inject(TranslationService);
  private readonly reveal = inject(PageReveal);

  protected readonly slides = [1, 2, 3, 4, 5].map((n) => `hero/slide-${n}.webp`);
  protected readonly active = signal(0);

  /** The tagline split into words, so each one can rise into place on its own. */
  protected readonly titleWords = computed(() =>
    this.translations.translate('app.tagline').split(/\s+/).filter(Boolean),
  );

  private readonly slideEls = viewChildren<ElementRef<HTMLElement>>('slide');
  private readonly title = viewChild.required<ElementRef<HTMLElement>>('title');
  private readonly lead = viewChild.required<ElementRef<HTMLElement>>('lead');
  private readonly actions = viewChild.required<ElementRef<HTMLElement>>('actions');

  private readonly ctx = gsap.context(() => {});
  private readonly reducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  private readonly rendered = signal(false);
  private introPlayed = false;
  private transition: gsap.core.Timeline | null = null;
  private drift: gsap.core.Tween | null = null;
  private autoplay: gsap.core.Tween | null = null;
  private held = false;
  private swipeX: number | null = null;

  constructor() {
    afterNextRender(() => {
      if (!this.reducedMotion) {
        // Hidden before the first paint, so nothing shows in place and then jumps.
        this.ctx.add(() => {
          gsap.set(this.introTargets(), { autoAlpha: 0 });
        });
        this.settle(this.slideEls()[0].nativeElement);
      }
      this.rendered.set(true);
    });

    // The entrance waits for the preloader's curtain, so it plays where it can be seen.
    effect(() => {
      if (!this.rendered() || !this.reveal.revealed() || this.introPlayed) return;
      this.introPlayed = true;
      this.playIntro();
      this.scheduleNext();
    });

    const onVisibility = () => (document.hidden ? this.autoplay?.pause() : this.resume());
    document.addEventListener('visibilitychange', onVisibility);

    inject(DestroyRef).onDestroy(() => {
      document.removeEventListener('visibilitychange', onVisibility);
      this.ctx.revert();
    });
  }

  private next(): void {
    this.goTo((this.active() + 1) % this.slides.length, 'up');
  }

  private previous(): void {
    this.goTo((this.active() - 1 + this.slides.length) % this.slides.length, 'down');
  }

  /** Moving forward lifts the photo up; moving back drops it down. */
  private goTo(index: number, direction?: Direction): void {
    const from = this.active();
    if (index === from) return;

    // A click mid-lift finishes the lift at once instead of stacking a second one.
    this.transition?.progress(1);

    const slides = this.slideEls().map((ref) => ref.nativeElement);
    const outgoing = slides[from];
    const incoming = slides[index];
    const dir = direction ?? (index > from ? 'up' : 'down');

    this.active.set(index);
    this.autoplay?.kill();

    if (this.reducedMotion) {
      outgoing.classList.remove('is-active');
      incoming.classList.add('is-active');
      return;
    }

    // Incoming waits underneath, the outgoing photo becomes the curtain above it.
    incoming.classList.add('is-active');
    outgoing.classList.add('is-leaving', `is-leaving--${dir}`);
    this.settle(incoming);

    const stage = outgoing.firstElementChild as HTMLElement;
    const travel = outgoing.offsetHeight;
    const sign = dir === 'up' ? -1 : 1;

    this.ctx.add(() => {
      this.transition = gsap
        .timeline({
          defaults: { duration: LIFT_SECONDS, ease: 'power3.inOut' },
          onComplete: () => {
            outgoing.classList.remove('is-active', 'is-leaving', `is-leaving--${dir}`);
            gsap.set([outgoing, stage], { clearProps: 'transform' });
            this.transition = null;
            this.scheduleNext();
          },
        })
        .to(outgoing, { y: sign * travel }, 0)
        .to(stage, { y: -sign * travel * STAGE_COUNTER }, 0);
    });
  }

  protected hold(held: boolean): void {
    this.held = held;
    if (held) this.autoplay?.pause();
    else this.resume();
  }

  protected swipeStart(event: PointerEvent): void {
    if (event.pointerType !== 'mouse') this.swipeX = event.clientX;
  }

  protected swipeEnd(event: PointerEvent): void {
    if (this.swipeX === null) return;
    const delta = event.clientX - this.swipeX;
    this.swipeX = null;
    if (Math.abs(delta) < SWIPE_DISTANCE) return;
    // In a right-to-left layout "forward" is a swipe to the right.
    const forward = this.translations.isRtl() ? delta > 0 : delta < 0;
    if (forward) this.next();
    else this.previous();
  }

  /** The photo on screen drifts from a slight zoom back to rest while it is shown. */
  private settle(slide: HTMLElement): void {
    const image = slide.querySelector('img');
    if (!image) return;
    this.drift?.kill();
    this.ctx.add(() => {
      this.drift = gsap.fromTo(
        image,
        { scale: 1.12 },
        { scale: 1, duration: SLIDE_SECONDS + LIFT_SECONDS, ease: 'power2.out' },
      );
    });
  }

  /** Autoplay runs forward and wraps back to the first photo after the last. */
  private scheduleNext(): void {
    if (this.reducedMotion) return;
    this.autoplay?.kill();
    this.ctx.add(() => {
      this.autoplay = gsap.delayedCall(SLIDE_SECONDS, () => {
        this.next();
      });
    });
    if (this.held || document.hidden) this.autoplay?.pause();
  }

  private resume(): void {
    if (!this.held && !document.hidden) this.autoplay?.resume();
  }

  private playIntro(): void {
    if (this.reducedMotion) return;
    const words = this.title().nativeElement.querySelectorAll('.hero__word-inner');
    this.ctx.add(() => {
      gsap
        .timeline({ delay: 0.55, defaults: { ease: 'expo.out', duration: 1.1 } })
        .set(this.introTargets(), { autoAlpha: 1 })
        .from(words, { yPercent: 110, duration: 1, stagger: 0.045 }, 0)
        // fromTo, because the paragraph was hidden as a whole before the first paint.
        .fromTo(this.lead().nativeElement, { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1 }, 0.35)
        .from(this.actions().nativeElement.children, { y: 20, autoAlpha: 0, stagger: 0.08 }, 0.5);
    });
  }

  private introTargets(): HTMLElement[] {
    return [this.title(), this.lead(), this.actions()].map((ref) => ref.nativeElement);
  }
}
