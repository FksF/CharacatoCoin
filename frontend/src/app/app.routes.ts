import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./components/dashboard/dashboard').then(m => m.Dashboard)
  },
  {
    path: 'token-management',
    loadComponent: () => import('./components/token-management/token-management').then(m => m.TokenManagement)
  },
  {
    path: 'staking',
    loadComponent: () => import('./components/staking/staking').then(m => m.Staking)
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];
