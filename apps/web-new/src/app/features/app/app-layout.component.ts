import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-app-layout',
    imports: [
        CommonModule,
        RouterModule,
        MatSidenavModule,
        MatListModule,
        MatIconModule,
        MatToolbarModule,
        MatButtonModule,
        MatMenuModule
    ],
    template: `
    <mat-sidenav-container class="app-container">
      <mat-sidenav mode="side" opened class="app-sidenav">
        <div class="logo">
          <h2>MaintainUK</h2>
        </div>

        <mat-nav-list>
          <a mat-list-item routerLink="/app/dashboard" routerLinkActive="active">
            <mat-icon>dashboard</mat-icon>
            <span>Dashboard</span>
          </a>

          @if (canViewTickets()) {
            <a mat-list-item routerLink="/app/tickets" routerLinkActive="active">
              <mat-icon>confirmation_number</mat-icon>
              <span>Tickets</span>
            </a>
          }

          @if (canViewWorkOrders()) {
            <a mat-list-item routerLink="/app/work-orders" routerLinkActive="active">
              <mat-icon>build</mat-icon>
              <span>Work Orders</span>
            </a>
          }

          @if (canViewQuotes()) {
            <a mat-list-item routerLink="/app/quotes" routerLinkActive="active">
              <mat-icon>description</mat-icon>
              <span>Quotes</span>
            </a>
          }

          @if (canViewInvoices()) {
            <a mat-list-item routerLink="/app/invoices" routerLinkActive="active">
              <mat-icon>receipt</mat-icon>
              <span>Invoices</span>
            </a>
          }

          <mat-divider></mat-divider>

          @if (auth.isOrgAdmin()) {
            <a mat-list-item routerLink="/admin/users">
              <mat-icon>admin_panel_settings</mat-icon>
              <span>Administration</span>
            </a>
          }

          @if (auth.isSuperAdmin()) {
            <a mat-list-item routerLink="/superadmin/dashboard">
              <mat-icon>shield</mat-icon>
              <span>Platform Admin</span>
            </a>
          }
        </mat-nav-list>
      </mat-sidenav>

      <mat-sidenav-content>
        <mat-toolbar color="primary" class="toolbar">
          <span class="spacer"></span>
          <div class="role-badge">{{ auth.role() }}</div>
          <button mat-button [matMenuTriggerFor]="userMenu">
            <mat-icon>account_circle</mat-icon>
            My Account
          </button>
          <mat-menu #userMenu="matMenu">
            <button mat-menu-item (click)="logout()">
              <mat-icon>logout</mat-icon>
              Logout
            </button>
          </mat-menu>
        </mat-toolbar>

        <div class="content">
          <router-outlet></router-outlet>
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
    styles: [`
    .app-container {
      height: 100vh;
    }

    .app-sidenav {
      width: 250px;
      background: rgb(155, 155, 188);
      color: white;
    }

    .logo {
      padding: 24px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .logo h2 {
      margin: 0;
      font-size: 1.5rem;
      color: rgb(51, 87, 249);
      font-weight: 600;
    }

    mat-nav-list {
      padding-top: 16px;
    }

    mat-nav-list a {
      color: rgba(255, 255, 255, 0.7);
      margin: 4px 8px;
      border-radius: 8px;
      transition: all 0.2s;
    }

    mat-nav-list a:hover {
      background: rgba(255, 255, 255, 0.1);
      color: white;
    }

    mat-nav-list a.active {
      background: #667eea;
      color: white;
    }

    mat-nav-list a mat-icon {
      margin-right: 16px;
    }

    .toolbar {
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .spacer {
      flex: 1 1 auto;
    }

    .role-badge {
      margin-right: 16px;
      padding: 4px 12px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 4px;
      font-size: 12px;
    }

    .content {
      min-height: calc(100vh - 64px);
      background: #f5f5f5;
    }

    mat-divider {
      margin: 8px 0;
      background-color: rgba(255, 255, 255, 0.2);
    }
  `]
})
export class AppLayoutComponent {
  auth = inject(AuthService);

  // Role-based navigation visibility
  canViewTickets = computed(() => {
    const role = this.auth.role();
    return ['SuperAdmin', 'OrgAdmin', 'Coordinator', 'Viewer', 'Tenant'].includes(role || '');
  });

  canViewWorkOrders = computed(() => {
    const role = this.auth.role();
    return ['SuperAdmin', 'OrgAdmin', 'Coordinator', 'Viewer', 'Contractor'].includes(role || '');
  });

  canViewQuotes = computed(() => {
    const role = this.auth.role();
    return ['SuperAdmin', 'OrgAdmin', 'Coordinator', 'Viewer'].includes(role || '');
  });

  canViewInvoices = computed(() => {
    const role = this.auth.role();
    return ['SuperAdmin', 'OrgAdmin', 'Coordinator', 'Viewer'].includes(role || '');
  });

  logout(): void {
    this.auth.logout();
  }
}
