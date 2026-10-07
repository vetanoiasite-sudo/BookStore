import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, of, switchMap } from 'rxjs';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { TranslationService } from '../../../core/i18n/translation.service';
import { ApiRequestError } from '../../../core/http/api-error';
import type { AdminCategoryNode } from '../../../core/models/category';
import { BackOfficeService } from '../../../core/services/back-office.service';
import { SeoService } from '../../../core/services/seo.service';
import { ToastService } from '../../../core/services/toast.service';
import { UiEmptyState, UiErrorState, UiSkeleton } from '../../../shared/ui/state-views';

type PageState = 'loading' | 'ready' | 'error';

/**
 * How many levels the tree may have: a main category, a sub-category and a branch
 * inside that. The server enforces the same limit; this keeps the page from offering
 * what it would refuse.
 */
const MAX_DEPTH = 3;

/** What the form is doing: adding a category somewhere, or editing one. */
type Editing =
  | { kind: 'create'; parent: AdminCategoryNode | null; level: number }
  | { kind: 'edit'; node: AdminCategoryNode; parentId: string | null };

/** A category as an option in the parent picker, indented by its depth. */
interface ParentOption {
  id: string;
  label: string;
}

/**
 * Category management. The tree is shown whole, because a category only makes sense
 * in its place: each one can take a sub-category, be renamed, hidden from the
 * storefront, moved under another parent or, when nothing is filed in it, deleted.
 */
@Component({
  selector: 'app-admin-categories',
  imports: [NgTemplateOutlet, ReactiveFormsModule, TranslatePipe, UiSkeleton, UiEmptyState, UiErrorState],
  templateUrl: './admin-categories.html',
  styleUrl: './admin-categories.scss',
})
export class AdminCategories {
  private readonly backOffice = inject(BackOfficeService);
  private readonly toasts = inject(ToastService);
  protected readonly translations = inject(TranslationService);
  private readonly builder = inject(FormBuilder);
  private readonly seo = inject(SeoService);

  protected readonly placeholders = [0, 1, 2, 3];

  protected readonly state = signal<PageState>('loading');
  protected readonly tree = signal<AdminCategoryNode[]>([]);
  protected readonly editing = signal<Editing | null>(null);
  protected readonly saving = signal(false);
  protected readonly busy = signal<string | null>(null);

  protected readonly form = this.builder.nonNullable.group({
    nameAr: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]],
    nameEn: ['', [Validators.maxLength(150)]],
    isActive: [true],
    parentId: [''],
  });

  /**
   * Where a category being edited may move to: anywhere except under itself or one
   * of its own descendants, which the server would refuse as a cycle, and nowhere
   * that would push it or anything beneath it past the third level.
   */
  protected readonly parentOptions = computed<ParentOption[]>(() => {
    const editing = this.editing();
    const excluded = editing?.kind === 'edit' ? editing.node.id : null;
    const height = editing?.kind === 'edit' ? this.heightOf(editing.node) : 1;
    const options: ParentOption[] = [];

    const walk = (nodes: AdminCategoryNode[], depth: number): void => {
      for (const node of nodes) {
        if (node.id === excluded) {
          continue;
        }

        // A parent on this level puts the category one level below it.
        if (depth + 1 + height <= MAX_DEPTH) {
          options.push({ id: node.id, label: `${'— '.repeat(depth)}${this.name(node)}` });
        }

        walk(node.children, depth + 1);
      }
    };

    walk(this.tree(), 0);
    return options;
  });

  constructor() {
    this.seo.apply({ titleKey: 'admin.categories.title', canonicalPath: '/admin/categories' });
    this.load();
  }

  /** Whether a category on this level (0 for a main one) may take another level beneath it. */
  protected canHaveChildren(depth: number): boolean {
    return depth + 1 < MAX_DEPTH;
  }

  /** The category's name in the active language; the Arabic one when there is no English name. */
  protected name(node: AdminCategoryNode): string {
    return this.translations.language() === 'ar' ? node.nameAr : node.nameEn || node.nameAr;
  }

  /** The name in the other language, or nothing when there is no English name to show beside it. */
  protected otherName(node: AdminCategoryNode): string {
    if (!node.nameEn) {
      return '';
    }

    return this.translations.language() === 'ar' ? node.nameEn : node.nameAr;
  }

  protected load(): void {
    this.state.set('loading');

    this.backOffice.categories().subscribe({
      next: (tree) => {
        this.tree.set(tree);
        this.state.set('ready');
      },
      error: () => this.state.set('error'),
    });
  }

  /**
   * Opens the form for a new category: a main one, or one inside a parent that sits
   * on the given level (0 for a main category).
   */
  protected startCreate(parent: AdminCategoryNode | null, parentDepth = -1): void {
    this.form.reset({
      nameAr: '',
      nameEn: '',
      isActive: true,
      parentId: parent?.id ?? '',
    });
    this.editing.set({ kind: 'create', parent, level: parentDepth + 2 });
    this.scrollToForm();
  }

  protected startEdit(node: AdminCategoryNode): void {
    const parentId = this.parentOf(node.id);

    this.form.reset({
      nameAr: node.nameAr,
      nameEn: node.nameEn,
      isActive: node.isActive,
      parentId: parentId ?? '',
    });
    this.editing.set({ kind: 'edit', node, parentId });
    this.scrollToForm();
  }

  protected cancel(): void {
    this.editing.set(null);
  }

  protected save(): void {
    const editing = this.editing();

    if (!editing || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const names = { nameAr: value.nameAr.trim(), nameEn: value.nameEn.trim() };
    const parentId = value.parentId || null;

    let action: Observable<unknown>;

    if (editing.kind === 'create') {
      action = this.backOffice.createCategory({
        ...names,
        parentId: editing.parent?.id ?? null,
      });
    } else {
      // A rename and a move are separate calls on the server. The move goes second
      // and only when the parent actually changed.
      action = this.backOffice
        .updateCategory(editing.node.id, {
          ...names,
          isActive: value.isActive,
        })
        .pipe(
          switchMap(() =>
            parentId === editing.parentId
              ? of(null)
              : this.backOffice.moveCategory(editing.node.id, parentId),
          ),
        );
    }

    this.saving.set(true);

    action.subscribe({
      next: () => {
        this.saving.set(false);
        this.editing.set(null);
        this.toasts.success(
          editing.kind === 'create' ? 'admin.categories.created' : 'admin.categories.saved',
        );
        this.load();
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.report(error);
        // A rename may have gone through even though the move was refused.
        this.load();
      },
    });
  }

  protected remove(node: AdminCategoryNode): void {
    const question = this.translations.translate('admin.categories.confirmDelete');

    if (!confirm(`${this.name(node)}\n\n${question}`)) {
      return;
    }

    this.busy.set(node.id);

    this.backOffice.deleteCategory(node.id).subscribe({
      next: () => {
        this.busy.set(null);
        if (this.editing()?.kind === 'edit') {
          this.editing.set(null);
        }
        this.toasts.success('admin.categories.deleted');
        this.load();
      },
      error: (error: unknown) => {
        this.busy.set(null);
        this.report(error);
      },
    });
  }

  /** How many levels a category spans with everything beneath it: 1 for one with no children. */
  private heightOf(node: AdminCategoryNode): number {
    return 1 + Math.max(0, ...node.children.map((child) => this.heightOf(child)));
  }

  /** The id of a category's parent, or null for a main category. */
  private parentOf(id: string): string | null {
    const find = (nodes: AdminCategoryNode[], parent: string | null): string | null | undefined => {
      for (const node of nodes) {
        if (node.id === id) {
          return parent;
        }

        const found = find(node.children, node.id);
        if (found !== undefined) {
          return found;
        }
      }

      return undefined;
    };

    return find(this.tree(), null) ?? null;
  }

  private scrollToForm(): void {
    setTimeout(() => document.getElementById('category-form')?.scrollIntoView({ block: 'start' }));
  }

  private report(error: unknown): void {
    if (error instanceof ApiRequestError) {
      this.toasts.failure(error.message);
    } else {
      this.toasts.error('common.error');
    }
  }
}
