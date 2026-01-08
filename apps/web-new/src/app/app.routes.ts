import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { areaGuard } from './core/guards/area.guard';

export const routes: Routes = [
  // ========================================
  // ROOT - Role-based redirect
  // ========================================
  {
    path: '',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./core/components/role-redirect.component').then(m => m.RoleRedirectComponent)
      }
    ]
  },

  // ========================================
  // AUTH ROUTES (Public)
  // ========================================
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
      },
      {
        path: 'register',
        loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent)
      }
    ]
  },

  // ========================================
  // SUPERADMIN AREA (SuperAdmin only)
  // ========================================
  {
    path: 'superadmin',
    canActivate: [areaGuard('superadmin')],
    loadComponent: () => import('./features/superadmin/superadmin-layout.component').then(m => m.SuperAdminLayoutComponent),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/superadmin/dashboard/superadmin-dashboard.component').then(m => m.SuperAdminDashboardComponent)
      },
      {
        path: 'organisations',
        loadComponent: () => import('./features/admin/organisations/organisation-list.component').then(m => m.OrganisationListComponent)
      },
      {
        path: 'organisations/:id',
        loadComponent: () => import('./features/admin/organisations/organisation-detail.component').then(m => m.OrganisationDetailComponent)
      },
      {
        path: 'platform-settings',
        loadComponent: () => import('./features/superadmin/settings/platform-settings.component').then(m => m.PlatformSettingsComponent)
      },
      {
        path: 'analytics',
        loadComponent: () => import('./features/superadmin/analytics/usage-analytics.component').then(m => m.UsageAnalyticsComponent)
      }
    ]
  },

  // ========================================
  // ADMIN AREA (SuperAdmin, OrgAdmin)
  // ========================================
  {
    path: 'admin',
    canActivate: [areaGuard('admin')],
    loadComponent: () => import('./features/admin/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      {
        path: '',
        redirectTo: 'users',
        pathMatch: 'full'
      },
      {
        path: 'users',
        loadComponent: () => import('./features/admin/users/user-list.component').then(m => m.UserListComponent)
      },
      {
        path: 'audit-logs',
        loadComponent: () => import('./features/admin/audit-logs/audit-log-list.component').then(m => m.AuditLogListComponent)
      }
    ]
  },

  // ========================================
  // APP AREA (All authenticated users)
  // ========================================
  {
    path: 'app',
    canActivate: [areaGuard('app')],
    loadComponent: () => import('./features/app/app-layout.component').then(m => m.AppLayoutComponent),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'tickets',
        loadComponent: () => import('./features/tickets/ticket-list/ticket-list.component').then(m => m.TicketListComponent)
      },
      {
        path: 'tickets/create',
        loadComponent: () => import('./features/tickets/ticket-form/ticket-form.component').then(m => m.TicketFormComponent)
      },
      {
        path: 'tickets/:id',
        loadComponent: () => import('./features/tickets/ticket-detail/ticket-detail.component').then(m => m.TicketDetailComponent)
      },
      {
        path: 'work-orders',
        loadComponent: () => import('./features/work-orders/work-order-list.component').then(m => m.WorkOrderListComponent)
      },
      {
        path: 'work-orders/create',
        loadComponent: () => import('./features/work-orders/work-order-form.component').then(m => m.WorkOrderFormComponent)
      },
      {
        path: 'work-orders/:id',
        loadComponent: () => import('./features/work-orders/work-order-detail.component').then(m => m.WorkOrderDetailComponent)
      },
      {
        path: 'quotes',
        loadComponent: () => import('./features/quotes/quote-list.component').then(m => m.QuoteListComponent)
      },
      {
        path: 'quotes/:id',
        loadComponent: () => import('./features/quotes/quote-detail.component').then(m => m.QuoteDetailComponent)
      },
      {
        path: 'invoices',
        loadComponent: () => import('./features/invoices/invoice-list.component').then(m => m.InvoiceListComponent)
      },
      {
        path: 'invoices/:id',
        loadComponent: () => import('./features/invoices/invoice-detail.component').then(m => m.InvoiceDetailComponent)
      }
    ]
  },

  // ========================================
  // FALLBACK
  // ========================================
  {
    path: '**',
    redirectTo: ''
  }
];

