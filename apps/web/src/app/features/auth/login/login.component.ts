import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';
import { getHomeRouteForRole } from '../../../core/utils/role-routes';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="login-container">
      <mat-card class="login-card">
        <mat-card-header>
          <mat-card-title>MaintainUK</mat-card-title>
          <mat-card-subtitle>Property Maintenance Platform</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="email" required>
              @if (loginForm.get('email')?.hasError('required')) {
                <mat-error>Email is required</mat-error>
              }
              @if (loginForm.get('email')?.hasError('email')) {
                <mat-error>Invalid email format</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Password</mat-label>
              <input matInput type="password" formControlName="password" required>
              @if (loginForm.get('password')?.hasError('required')) {
                <mat-error>Password is required</mat-error>
              }
            </mat-form-field>

            @if (errorMessage()) {
              <div class="error-message">{{ errorMessage() }}</div>
            }

            <button
              mat-raised-button
              color="primary"
              type="submit"
              class="full-width"
              [disabled]="loading() || loginForm.invalid">
              @if (loading()) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                Login
              }
            </button>
          </form>

          <div class="register-link">
            Don't have an account? <a routerLink="/auth/register">Register here</a>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }

    .login-card {
      width: 100%;
      max-width: 400px;
    }

    mat-card-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 24px;
    }

    mat-card-title {
      font-size: 2rem;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .error-message {
      color: #f44336;
      margin-bottom: 16px;
      padding: 12px;
      background: #ffebee;
      border-radius: 4px;
      font-size: 14px;
    }

    .register-link {
      text-align: center;
      margin-top: 16px;
      font-size: 14px;
    }

    .register-link a {
      color: #667eea;
      text-decoration: none;
      font-weight: 500;
    }

    .register-link a:hover {
      text-decoration: underline;
    }

    button[type="submit"] {
      margin-top: 8px;
      height: 48px;
      font-size: 16px;
    }
  `]
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  loading = signal(false);
  errorMessage = signal<string | null>(null);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService.login(this.loginForm.value as any).subscribe({
      next: (response) => {
        if (response.data) {
          // Get role-based home route
          const role = this.authService.role();
          const homeRoute = getHomeRouteForRole(role);
          this.router.navigate([homeRoute]);
        } else if (response.error) {
          this.errorMessage.set(response.error.message);
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set('Login failed. Please try again.');
        this.loading.set(false);
      }
    });
  }
}

