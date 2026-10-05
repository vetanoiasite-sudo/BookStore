import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import type { AuthenticationResponse, CurrentUser } from '../models/auth';
import { AuthService } from './auth.service';

const seller: CurrentUser = {
  publicId: 'US-123',
  email: 'seller@bookstore.local',
  displayName: 'مكتبة القاهرة',
  emailVerified: true,
  preferredLanguage: 'ar',
  roles: ['Member'],
  sellerPublicId: 'SL-7HQ2K4M9',
};

function tokens(access: string, refresh: string): AuthenticationResponse {
  return {
    accessToken: access,
    accessTokenExpiresAt: new Date().toISOString(),
    refreshToken: refresh,
    refreshTokenExpiresAt: new Date().toISOString(),
    user: seller,
  };
}

describe('AuthService', () => {
  let auth: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function signIn(): void {
    auth.login({ email: seller.email, password: 'Dev@12345!' }).subscribe();
    http.expectOne((request) => request.url.endsWith('/auth/login'))
      .flush({ success: true, data: tokens('access-1', 'refresh-1') });
  }

  it('starts signed out', () => {
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.user()).toBeNull();
    expect(auth.accessToken()).toBeNull();
  });

  it('holds the account and its token after signing in', () => {
    signIn();

    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.user()?.displayName).toBe('مكتبة القاهرة');
    expect(auth.accessToken()).toBe('access-1');
  });

  it('reports the roles the account actually holds', () => {
    signIn();

    expect(auth.isMember()).toBe(true);
    expect(auth.isStaff()).toBe(false);
    expect(auth.isAdmin()).toBe(false);
  });

  it('remembers the session so a reload does not sign the reader out', async () => {
    signIn();

    // A second service reads what the first stored, which is what happens on a
    // reload: the session survives, and is then checked against the server.
    const restored = TestBed.inject(AuthService);
    localStorage.setItem(
      'bookstore.session',
      JSON.stringify({ accessToken: 'access-1', refreshToken: 'refresh-1', user: seller }),
    );

    const done = restored.restore();
    http.expectOne((request) => request.url.endsWith('/auth/me'))
      .flush({ success: true, data: seller });
    await done;

    expect(restored.isAuthenticated()).toBe(true);
  });

  it('drops a stored session the server no longer recognises', async () => {
    localStorage.setItem(
      'bookstore.session',
      JSON.stringify({ accessToken: 'stale', refreshToken: 'stale', user: seller }),
    );

    const done = auth.restore();
    http.expectOne((request) => request.url.endsWith('/auth/me'))
      .flush({ success: false, message: 'Gone' }, { status: 401, statusText: 'Unauthorized' });
    await done;

    expect(auth.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('bookstore.session')).toBeNull();
  });

  it('signs out locally even when the server call fails', () => {
    signIn();

    auth.logout().subscribe();
    http.expectOne((request) => request.url.endsWith('/auth/logout'))
      .error(new ProgressEvent('offline'));

    // A failed revoke must not leave someone signed in on a shared machine.
    expect(auth.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('bookstore.session')).toBeNull();
  });

  it('spends the refresh token once however many callers ask at the same time', () => {
    signIn();

    const first = jasmineLike();
    const second = jasmineLike();

    auth.refresh().subscribe(first.next);
    auth.refresh().subscribe(second.next);

    // The token rotates on use: a second request would be read as a replay.
    http.expectOne((request) => request.url.endsWith('/auth/refresh'))
      .flush({ success: true, data: tokens('access-2', 'refresh-2') });

    expect(first.values).toEqual(['access-2']);
    expect(second.values).toEqual(['access-2']);
    expect(auth.accessToken()).toBe('access-2');
  });

  it('ends the session when the refresh is refused', () => {
    signIn();

    auth.refresh().subscribe({ error: () => undefined });
    http.expectOne((request) => request.url.endsWith('/auth/refresh'))
      .flush({ success: false }, { status: 401, statusText: 'Unauthorized' });

    expect(auth.isAuthenticated()).toBe(false);
  });
});

/** A tiny subscriber that records what it was handed. */
function jasmineLike() {
  const values: string[] = [];
  return { values, next: (value: string) => values.push(value) };
}
