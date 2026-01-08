import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';

@Component({
    selector: 'app-admin-layout',
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
    <mat-sidenav-container class="admin-container">
      <mat-sidenav mode="side" opened class="admin-sidenav">
        <mat-toolbar color="primary">
          <span>Administration</span>
        </mat-toolbar>

        <mat-nav-list>
          @if (auth.isSuperAdmin()) {
            <a mat-list-item routerLink="/admin/organisations" routerLinkActive="active">
              <mat-icon matListItemIcon>business</mat-icon>
              <span matListItemTitle>Organisations</span>
            </a>
          }

          <a mat-list-item routerLink="/admin/users" routerLinkActive="active">
            <mat-icon matListItemIcon>people</mat-icon>
            <span matListItemTitle>Users</span>
          </a>

          <a mat-list-item routerLink="/admin/audit-logs" routerLinkActive="active">
            <mat-icon matListItemIcon>history</mat-icon>
            <span matListItemTitle>Audit Logs</span>
          </a>

          <mat-divider></mat-divider>

          @if (auth.isSuperAdmin()) {
            <a mat-list-item routerLink="/superadmin/dashboard">
              <mat-icon matListItemIcon>shield</mat-icon>
              <span matListItemTitle>Platform Admin</span>
            </a>
          }

          <a mat-list-item routerLink="/app/dashboard">
            <mat-icon matListItemIcon>apps</mat-icon>
            <span matListItemTitle>App Area</span>
          </a>
        </mat-nav-list>
      </mat-sidenav>

      <mat-sidenav-content>
        <mat-toolbar color="primary" class="top-toolbar">
          <span class="spacer"></span>
          <div class="role-badge">{{ auth.role() }}</div>
          @if (auth.isAuthenticated()) {
            <button mat-button [matMenuTriggerFor]="userMenu">
              <mat-icon>account_circle</mat-icon>
              {{ (auth.currentUser$ | async)?.firstName ?? 'My Account' }}
            </button>
            <mat-menu #userMenu="matMenu">
              <button mat-menu-item (click)="logout()">
                <mat-icon>logout</mat-icon>
                Logout
              </button>
            </mat-menu>
          } @else {
            <button mat-button (click)="goToLogin()">
              <mat-icon>login</mat-icon>
              Login
            </button>
          }
        </mat-toolbar>

        <div class="admin-content">
          <router-outlet></router-outlet>
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
    styles: [`
    .admin-container {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;
    }

    .admin-sidenav {
      width: 250px;
    }

    .admin-content {
      padding: 24px;
      height: calc(100% - 64px);
      overflow: auto;
      background: #f5f5f5;
    }

    .top-toolbar {
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

    .active {
      background-color: rgba(0, 0, 0, 0.04);
    }

    mat-divider {
      margin: 8px 0;
    }
  `]
})
export class AdminLayoutComponent {
  auth = inject(AuthService);
  private router = inject(Router);

  logout(): void {
    this.auth.logout();
  }

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}
