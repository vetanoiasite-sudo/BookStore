import { Routes } from '@angular/router';
import {
  adminGuard,
  authGuard,
  guestGuard,
  memberGuard,
  staffGuard,
} from './core/guards/auth.guards';

/**
 * Root routes. Every feature is lazy loaded, so the first paint carries only what
 * the landing page needs and a visitor never downloads the back office.
 *
 * The three signed-in areas are declared before the storefront because the
 * storefront ends in a catch-all, and anything after it would never be reached.
 */
export const routes: Routes = [
  {
    path: 'auth',
    canActivate: [guestGuard],
    loadComponent: () => import('./layout/auth-shell/auth-shell').then((m) => m.AuthShell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'login' },
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./features/auth/register/register').then((m) => m.Register),
      },
    ],
  },
  {
    // The seller workspace. The guard sends an anonymous visitor to sign in and
    // carries the address they wanted, so they land where they were going.
    path: 'seller',
    canActivate: [authGuard, memberGuard],
    loadComponent: () =>
      import('./layout/dashboard-shell/dashboard-shell').then((m) => m.DashboardShell),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/seller/dashboard/seller-dashboard').then(
            (m) => m.SellerDashboardPage,
          ),
      },
      {
        path: 'books',
        pathMatch: 'full',
        loadComponent: () =>
          import('./features/seller/my-books/my-books').then((m) => m.MyBooks),
      },
      {
        path: 'books/new',
        loadComponent: () =>
          import('./features/seller/book-form/book-form').then((m) => m.BookForm),
      },
      {
        // Declared after "new", which would otherwise be read as a book code.
        path: 'books/:publicId',
        loadComponent: () =>
          import('./features/seller/book-form/book-form').then((m) => m.BookForm),
      },
    ],
  },
  {
    path: 'admin',
    canActivate: [authGuard, staffGuard],
    loadComponent: () =>
      import('./layout/dashboard-shell/dashboard-shell').then((m) => m.DashboardShell),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./features/admin/dashboard/admin-dashboard').then((m) => m.AdminDashboardPage),
      },
      {
        // The review queue: only the copies waiting for a decision.
        path: 'books',
        pathMatch: 'full',
        data: { queue: true },
        loadComponent: () =>
          import('./features/admin/books/admin-books').then((m) => m.AdminBooks),
      },
      {
        path: 'books/all',
        loadComponent: () =>
          import('./features/admin/books/admin-books').then((m) => m.AdminBooks),
      },
      {
        path: 'books/:publicId',
        loadComponent: () =>
          import('./features/admin/book-review/book-review').then((m) => m.BookReview),
      },
      {
        path: 'orders',
        pathMatch: 'full',
        loadComponent: () =>
          import('./features/admin/orders/admin-orders').then((m) => m.AdminOrders),
      },
      {
        // After the list, which would otherwise read as an order number.
        path: 'orders/:orderNumber',
        loadComponent: () =>
          import('./features/admin/orders/admin-order-details').then(
            (m) => m.AdminOrderDetailsPage,
          ),
      },
      {
        path: 'inventory',
        loadComponent: () =>
          import('./features/admin/inventory/admin-inventory').then((m) => m.AdminInventory),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./features/admin/users/admin-users').then((m) => m.AdminUsers),
      },
      {
        path: 'sellers',
        loadComponent: () =>
          import('./features/admin/sellers/admin-sellers').then((m) => m.AdminSellers),
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./features/admin/reports/admin-reports').then((m) => m.AdminReports),
      },
      {
        // Changing the shape of the catalogue is an administrator's decision.
        path: 'categories',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/admin/categories/admin-categories').then((m) => m.AdminCategories),
      },
      {
        // Administrator only on the server as well; the guard here saves the trip.
        path: 'audit-logs',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/admin/audit/admin-audit').then((m) => m.AdminAudit),
      },
      {
        path: 'settings',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/admin/settings/admin-settings').then((m) => m.AdminSettings),
      },
    ],
  },
  {
    path: '',
    loadComponent: () =>
      import('./layout/public-shell/public-shell').then((m) => m.PublicShell),
    children: [
      {
        path: '',
        loadComponent: () => import('./features/home/home').then((m) => m.Home),
      },
      {
        path: 'books',
        loadComponent: () => import('./features/books/books').then((m) => m.Books),
      },
      {
        path: 'categories',
        loadComponent: () =>
          import('./features/categories/categories').then((m) => m.Categories),
      },
      {
        path: 'how-it-works',
        loadComponent: () =>
          import('./features/how-it-works/how-it-works').then((m) => m.HowItWorks),
      },
      {
        // The basket and the saved list belong to an account, so an anonymous
        // visitor is sent to sign in and brought straight back here afterwards.
        path: 'cart',
        canActivate: [authGuard],
        loadComponent: () => import('./features/cart/cart').then((m) => m.Cart),
      },
      {
        path: 'favorites',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/favorites/favorites').then((m) => m.Favorites),
      },
      {
        path: 'checkout',
        canActivate: [authGuard],
        loadComponent: () => import('./features/checkout/checkout').then((m) => m.Checkout),
      },
      {
        path: 'addresses',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/addresses/addresses').then((m) => m.Addresses),
      },
      {
        path: 'orders',
        pathMatch: 'full',
        canActivate: [authGuard],
        loadComponent: () => import('./features/orders/orders').then((m) => m.Orders),
      },
      {
        // Declared after the list, which would otherwise read as an order number.
        path: 'orders/:orderNumber',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/orders/order-details').then((m) => m.OrderDetailsPage),
      },
      {
        // The segment carries the slug and the code together, for example
        // the-art-of-war-BK-2026-001245. The code is what identifies the book, so a
        // stale slug still resolves.
        path: 'books/:segment',
        loadComponent: () =>
          import('./features/book-details/book-details').then((m) => m.BookDetailsPage),
      },
      {
        path: '**',
        loadComponent: () =>
          import('./features/not-found/not-found').then((m) => m.NotFound),
      },
    ],
  },
];
