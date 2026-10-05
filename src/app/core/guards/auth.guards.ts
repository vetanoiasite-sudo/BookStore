import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import type { Role } from '../models/auth';

/**
 * Requires a signed-in caller. The address being asked for is carried to the sign-in
 * page, so someone who followed a link to their listings lands back on them rather
 * than on a home page they did not ask for.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.isAuthenticated() ? true : signIn(router, state.url);
};

/** Requires a marketplace account, which can both buy and sell. */
export const memberGuard: CanActivateFn = roleGuard('Member');

/** Requires a back-office account: an administrator or a member of staff. */
export const staffGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return signIn(router, state.url);
  }

  // Signed in but in the wrong role: this is a dead end, not a sign-in prompt.
  return auth.isStaff() || router.createUrlTree(['/']);
};

/**
 * Requires an administrator. The two screens behind this — the audit trail and the
 * settings — are administrator-only on the server as well; the guard here only saves
 * the reader a trip to a page that would turn them away.
 */
export const adminGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return signIn(router, state.url);
  }

  // Signed in but not an administrator: a dead end rather than a sign-in prompt.
  return auth.isAdmin() || router.createUrlTree(['/admin']);
};

/**
 * Keeps a signed-in visitor away from the sign-in and sign-up pages, which would
 * otherwise offer to replace the session they already have.
 */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.isAuthenticated() ? router.createUrlTree(['/']) : true;
};

function roleGuard(role: Role): CanActivateFn {
  return (_route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isAuthenticated()) {
      return signIn(router, state.url);
    }

    return auth.hasRole(role) || router.createUrlTree(['/']);
  };
}

function signIn(router: Router, returnUrl: string): UrlTree {
  return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl } });
}
