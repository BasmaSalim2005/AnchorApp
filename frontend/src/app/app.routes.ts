import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'app/daily' },
  {
    path: 'welcome',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./pages/onboarding/onboarding').then((m) => m.Onboarding),
  },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/dashboard/dashboard').then((m) => m.Dashboard),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'daily' },
      {
        path: 'daily',
        loadComponent: () => import('./pages/tabs/daily/daily').then((m) => m.Daily),
      },
      {
        path: 'weekly',
        loadComponent: () => import('./pages/tabs/weekly/weekly').then((m) => m.Weekly),
      },
      {
        path: 'monthly',
        loadComponent: () => import('./pages/tabs/monthly/monthly').then((m) => m.Monthly),
      },
      {
        path: 'yearly',
        loadComponent: () => import('./pages/tabs/yearly/yearly').then((m) => m.Yearly),
      },
    ],
  },
  { path: '**', redirectTo: 'app/daily' },
];
