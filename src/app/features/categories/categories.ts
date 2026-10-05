import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import type { CategoryNode } from '../../core/models/category';
import { CategoryService } from '../../core/services/category.service';
import { SeoService } from '../../core/services/seo.service';
import { CategoryNamePipe } from '../../shared/pipes/category-name.pipe';
import { UiEmptyState, UiErrorState, UiSkeleton } from '../../shared/ui/state-views';

type PageState = 'loading' | 'ready' | 'error';

/**
 * The category directory. Each root is a section listing its sub-categories, so a
 * visitor sees the shape of the catalogue on one page rather than clicking down
 * through it a level at a time.
 */
@Component({
  selector: 'app-categories',
  imports: [
    RouterLink,
    TranslatePipe,
    CategoryNamePipe,
    UiSkeleton,
    UiEmptyState,
    UiErrorState,
  ],
  templateUrl: './categories.html',
  styleUrl: './categories.scss',
})
export class Categories {
  private readonly categories = inject(CategoryService);
  private readonly seo = inject(SeoService);

  protected readonly state = signal<PageState>('loading');
  protected readonly tree = signal<CategoryNode[]>([]);

  /** Placeholder blocks while the tree loads. */
  protected readonly placeholders = Array.from({ length: 6 }, (_, index) => index);

  constructor() {
    this.seo.apply({ titleKey: 'nav.categories', canonicalPath: '/categories' });
    this.load();
  }

  protected load(): void {
    this.state.set('loading');

    this.categories.tree().subscribe({
      next: (tree) => {
        this.tree.set(tree);
        this.state.set('ready');
      },
      error: () => this.state.set('error'),
    });
  }
}
