import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'auth/login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'auth/register',
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'tickets',
    canActivate: [authGuard],
    loadComponent: () => import('./features/tickets/ticket-list/ticket-list.component').then(m => m.TicketListComponent)
  },
  {
    path: 'tickets/create',
    canActivate: [authGuard],
    loadComponent: () => import('./features/tickets/ticket-form/ticket-form.component').then(m => m.TicketFormComponent)
  },
  {
    path: 'tickets/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/tickets/ticket-detail/ticket-detail.component').then(m => m.TicketDetailComponent)
  },
  {
    path: 'work-orders',
    canActivate: [authGuard],
    loadComponent: () => import('./features/work-orders/work-order-list.component').then(m => m.WorkOrderListComponent)
  },
  {
    path: 'work-orders/create',
    canActivate: [authGuard],
    loadComponent: () => import('./features/work-orders/work-order-form.component').then(m => m.WorkOrderFormComponent)
  },
  {
    path: 'work-orders/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/work-orders/work-order-detail.component').then(m => m.WorkOrderDetailComponent)
  },
  {
    path: 'quotes',
    canActivate: [authGuard],
    loadComponent: () => import('./features/quotes/quote-list.component').then(m => m.QuoteListComponent)
  },
  {
    path: 'quotes/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/quotes/quote-detail.component').then(m => m.QuoteDetailComponent)
  },
  {
    path: 'invoices',
    canActivate: [authGuard],
    loadComponent: () => import('./features/invoices/invoice-list.component').then(m => m.InvoiceListComponent)
  },
  {
    path: 'invoices/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/invoices/invoice-detail.component').then(m => m.InvoiceDetailComponent)
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];

