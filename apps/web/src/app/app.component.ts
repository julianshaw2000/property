import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatSidenavModule,
    MatListModule
  ],
  template: `
    @if (authService.isAuthenticated()) {
      <mat-sidenav-container class="sidenav-container">
        <mat-sidenav #drawer mode="side" opened class="sidenav">
          <div class="logo">
            <h2>MaintainUK</h2>
          </div>
          <mat-nav-list>
            <a mat-list-item routerLink="/dashboard" routerLinkActive="active">
              <mat-icon>dashboard</mat-icon>
              <span>Dashboard</span>
            </a>
            <a mat-list-item routerLink="/tickets" routerLinkActive="active">
              <mat-icon>confirmation_number</mat-icon>
              <span>Tickets</span>
            </a>
            <a mat-list-item routerLink="/work-orders" routerLinkActive="active">
              <mat-icon>build</mat-icon>
              <span>Work Orders</span>
            </a>
            <a mat-list-item routerLink="/quotes" routerLinkActive="active">
              <mat-icon>description</mat-icon>
              <span>Quotes</span>
            </a>
            <a mat-list-item routerLink="/invoices" routerLinkActive="active">
              <mat-icon>receipt</mat-icon>
              <span>Invoices</span>
            </a>
          </mat-nav-list>
        </mat-sidenav>

        <mat-sidenav-content>
          <mat-toolbar color="primary" class="toolbar">
            <button mat-icon-button (click)="drawer.toggle()">
              <mat-icon>menu</mat-icon>
            </button>
            <span class="spacer"></span>
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
    } @else {
      <router-outlet></router-outlet>
    }
  `,
  styles: [`
    .sidenav-container {
      height: 100vh;
    }

    .sidenav {
      width: 250px;
      background: #1e1e2e;
      color: white;
    }

    .logo {
      padding: 24px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .logo h2 {
      margin: 0;
      font-size: 1.5rem;
      color: #667eea;
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

    .content {
      min-height: calc(100vh - 64px);
      background: #f5f5f5;
    }
  `]
})
export class AppComponent {
  authService = inject(AuthService);
  private router = inject(Router);

  logout(): void {
    this.authService.logout();
  }
}

