import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, map, of, shareReplay, tap, throwError } from 'rxjs';
import { ApiClient } from '../http/api-client';
import type {
  AuthenticationResponse,
  CurrentUser,
  LoginRequest,
  RegisterRequest,
  Role,
} from '../models/auth';

/** Where the token pair is kept between visits. */
const STORAGE_KEY = 'bookstore.session';

/** The shape written to storage. */
interface StoredSession {
  accessToken: string;
  refreshToken: string;
  user: CurrentUser;
}

/**
 * Who is signed in, and the only place the tokens live. The account is exposed as a
 * signal, so a header, a guard and a dashboard all react to a sign-in or a sign-out
 * without any of them subscribing to anything.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiClient);

  private readonly session = signal<StoredSession | null>(null);

  /** In-flight refresh, shared so a burst of 401s produces one round trip. */
  private refreshing: Observable<string> | null = null;

  /** The signed-in account, or null. */
  readonly user = computed(() => this.session()?.user ?? null);

  readonly isAuthenticated = computed(() => this.session() !== null);

  readonly roles = computed<Role[]>(() => this.session()?.user.roles ?? []);

  /** A marketplace account, which can both buy and sell. */
  readonly isMember = computed(() => this.hasRole('Member'));

  /** Anyone who works in the back office, whether administrator or staff. */
  readonly isStaff = computed(() => this.hasRole('Admin') || this.hasRole('Staff'));

  readonly isAdmin = computed(() => this.hasRole('Admin'));

  /** The bearer token for the next request, or null when signed out. */
  accessToken(): string | null {
    return this.session()?.accessToken ?? null;
  }

  refreshToken(): string | null {
    return this.session()?.refreshToken ?? null;
  }

  hasRole(role: Role): boolean {
    return this.session()?.user.roles.includes(role) ?? false;
  }

  /**
   * Restores a session from the last visit. Called once before the first render, so
   * a reload does not flash a signed-out header at someone who is signed in.
   */
  restore(): Promise<void> {
    const stored = this.read();

    if (!stored) {
      return Promise.resolve();
    }

    this.session.set(stored);

    // The stored account is shown immediately and then checked. If the token has
    // expired the refresh below replaces it; if the account is gone, the session is
    // dropped rather than left showing a name that no longer signs in.
    return new Promise((resolve) => {
      this.api.get<CurrentUser>('/auth/me').subscribe({
        next: (user) => {
          this.session.update((current) => (current ? { ...current, user } : current));
          this.persist();
          resolve();
        },
        error: () => {
          this.clear();
          resolve();
        },
      });
    });
  }

  login(request: LoginRequest): Observable<CurrentUser> {
    return this.api
      .post<AuthenticationResponse>('/auth/login', request)
      .pipe(map((response) => this.accept(response)));
  }

  register(request: RegisterRequest): Observable<CurrentUser> {
    return this.api
      .post<AuthenticationResponse>('/auth/register', request)
      .pipe(map((response) => this.accept(response)));
  }

  /**
   * Signs out. The server is told so the refresh token is revoked, but the local
   * session is cleared either way: a failed call must not leave someone signed in
   * on a shared machine.
   */
  logout(): Observable<void> {
    const refreshToken = this.refreshToken();
    this.clear();

    if (!refreshToken) {
      return of(void 0);
    }

    return this.api.post<unknown>('/auth/logout', { refreshToken }).pipe(
      map(() => void 0),
      catchError(() => of(void 0)),
    );
  }

  /**
   * Exchanges the refresh token for a new pair. Concurrent callers share one request
   * because the token rotates on use: two requests would spend it twice and the
   * second would be treated as a replay.
   */
  refresh(): Observable<string> {
    if (this.refreshing) {
      return this.refreshing;
    }

    const refreshToken = this.refreshToken();

    if (!refreshToken) {
      return throwError(() => new Error('No refresh token.'));
    }

    this.refreshing = this.api
      .post<AuthenticationResponse>('/auth/refresh', { refreshToken })
      .pipe(
        map((response) => {
          this.accept(response);
          return response.accessToken;
        }),

        // A refresh that fails means the token was revoked, replayed or has expired.
        // None of those leave a usable session behind.
        tap({ error: () => this.clear() }),
        finalize(() => (this.refreshing = null)),
        shareReplay({ bufferSize: 1, refCount: false }),
      );

    return this.refreshing;
  }

  /** Stores a fresh token pair and returns the account behind it. */
  private accept(response: AuthenticationResponse): CurrentUser {
    this.session.set({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      user: response.user,
    });

    this.persist();
    return response.user;
  }

  private clear(): void {
    this.session.set(null);

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Private browsing and blocked site data both throw here.
    }
  }

  private persist(): void {
    const session = this.session();

    if (!session) {
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      // Remembering the session is a convenience; the tab still works without it.
    }
  }

  private read(): StoredSession | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw) as StoredSession;
      return parsed.accessToken && parsed.refreshToken && parsed.user ? parsed : null;
    } catch {
      return null;
    }
  }
}
