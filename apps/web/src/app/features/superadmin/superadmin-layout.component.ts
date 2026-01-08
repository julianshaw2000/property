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

@Component({
  selector: 'app-superadmin-layout',
  standalone: true,
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
    <mat-sidenav-container class="superadmin-container">
      <mat-sidenav mode="side" opened class="superadmin-sidenav">
        <mat-toolbar color="primary">
          <span>Platform Admin</span>
        </mat-toolbar>

        <mat-nav-list>
          <a mat-list-item routerLink="/superadmin/dashboard" routerLinkActive="active">
            <mat-icon matListItemIcon>dashboard</mat-icon>
            <span matListItemTitle>Dashboard</span>
          </a>

          <a mat-list-item routerLink="/superadmin/organisations" routerLinkActive="active">
            <mat-icon matListItemIcon>business</mat-icon>
            <span matListItemTitle>Organisations</span>
          </a>

          <a mat-list-item routerLink="/superadmin/analytics" routerLinkActive="active">
            <mat-icon matListItemIcon>analytics</mat-icon>
            <span matListItemTitle>Usage Analytics</span>
          </a>

          <a mat-list-item routerLink="/superadmin/platform-settings" routerLinkActive="active">
            <mat-icon matListItemIcon>settings</mat-icon>
            <span matListItemTitle>Platform Settings</span>
          </a>

          <mat-divider></mat-divider>

          <a mat-list-item routerLink="/admin/users">
            <mat-icon matListItemIcon>admin_panel_settings</mat-icon>
            <span matListItemTitle>Org Admin</span>
          </a>

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

        <div class="superadmin-content">
          <router-outlet></router-outlet>
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .superadmin-container {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;
    }

    .superadmin-sidenav {
      width: 250px;
      background: rgb(155, 155, 188);
      color: white;
    }

    mat-toolbar {
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
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

    mat-icon {
      margin-right: 16px;
    }

    .superadmin-content {
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

    mat-divider {
      margin: 8px 0;
      background-color: rgba(255, 255, 255, 0.2);
    }
  `]
})
export class SuperAdminLayoutComponent {
  auth = inject(AuthService);

  logout(): void {
    this.auth.logout();
  }
}
