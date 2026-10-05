import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import type { CurrentUser, Role } from '../models/auth';
import { AuthService } from '../services/auth.service';
import { authGuard, guestGuard, memberGuard, staffGuard } from './auth.guards';

function account(roles: Role[]): CurrentUser {
  return {
    publicId: 'US-1',
    email: 'someone@bookstore.local',
    displayName: 'Someone',
    emailVerified: true,
    preferredLanguage: 'ar',
    roles,
    sellerPublicId: roles.includes('Member') ? 'SL-1' : null,
  };
}

describe('route guards', () => {
  let router: Router;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });

    router = TestBed.inject(Router);
  });

  /**
   * Signs in through the service itself rather than writing into its internals, so
   * the guards are exercised against a session built the way a real one is.
   */
  function signedInAs(roles: Role[]): void {
    const auth = TestBed.inject(AuthService);
    const http = TestBed.inject(HttpTestingController);

    auth.login({ email: 'someone@bookstore.local', password: 'Dev@12345!' }).subscribe();

    http.expectOne((request) => request.url.endsWith('/auth/login')).flush({
      success: true,
      data: {
        accessToken: 'access',
        accessTokenExpiresAt: new Date().toISOString(),
        refreshToken: 'refresh',
        refreshTokenExpiresAt: new Date().toISOString(),
        user: account(roles),
      },
    });
  }

  function run(
    guard: typeof authGuard,
    url = '/seller/books',
  ): boolean | UrlTree {
    return TestBed.runInInjectionContext(() =>
      guard(
        {} as ActivatedRouteSnapshot,
        { url } as RouterStateSnapshot,
      ),
    ) as boolean | UrlTree;
  }

  it('sends an anonymous visitor to sign in, remembering where they were going', () => {
    const result = run(authGuard, '/seller/books/new');

    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree))
      .toBe('/auth/login?returnUrl=%2Fseller%2Fbooks%2Fnew');
  });

  it('lets a signed-in caller through', () => {
    signedInAs(['Member']);

    expect(run(authGuard)).toBe(true);
  });

  it('lets a member into the seller area', () => {
    signedInAs(['Member']);

    expect(run(memberGuard)).toBe(true);
  });

  it('turns a back-office account away from the seller area rather than asking it to sign in again', () => {
    signedInAs(['Staff']);

    const result = run(memberGuard);

    // Signed in but in the wrong role: a sign-in prompt would be a dead end.
    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toBe('/');
  });

  it('opens the back office to staff as well as administrators', () => {
    signedInAs(['Staff']);
    expect(run(staffGuard, '/admin/books')).toBe(true);

    signedInAs(['Admin']);
    expect(run(staffGuard, '/admin/books')).toBe(true);
  });

  it('keeps a member out of the back office', () => {
    signedInAs(['Member']);

    expect(run(staffGuard, '/admin/books')).toBeInstanceOf(UrlTree);
  });

  it('keeps a signed-in reader away from the sign-in page', () => {
    signedInAs(['Member']);

    expect(run(guestGuard, '/auth/login')).toBeInstanceOf(UrlTree);
  });

  it('lets an anonymous visitor reach the sign-in page', () => {
    expect(run(guestGuard, '/auth/login')).toBe(true);
  });
});
