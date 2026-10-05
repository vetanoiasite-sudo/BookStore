import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../http/api-client';
import type { HowItWorksContent } from '../models/content';

/** Reads the pages that explain the platform rather than list books. */
@Injectable({ providedIn: 'root' })
export class ContentService {
  private readonly api = inject(ApiClient);

  /** The "how it works" page, in both languages. */
  howItWorks(): Observable<HowItWorksContent> {
    return this.api.get<HowItWorksContent>('/content/how-it-works');
  }
}
