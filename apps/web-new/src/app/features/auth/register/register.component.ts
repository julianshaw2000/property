import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'app-register',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterLink,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatProgressSpinnerModule,
        MatIconModule
    ],
    template: `
    <div class="register-container">
      <mat-card class="register-card">
        <mat-card-header>
          <mat-card-title>Create Account</mat-card-title>
          <mat-card-subtitle>Start managing your properties</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="registerForm" (ngSubmit)="onSubmit()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Organization Name</mat-label>
              <input matInput formControlName="orgName" required>
            </mat-form-field>

            <div class="name-row">
              <mat-form-field appearance="outline" class="half-width">
                <mat-label>First Name</mat-label>
                <input matInput formControlName="firstName" required>
              </mat-form-field>

              <mat-form-field appearance="outline" class="half-width">
                <mat-label>Last Name</mat-label>
                <input matInput formControlName="lastName" required>
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="email" required>
              @if (registerForm.get('email')?.hasError('email')) {
                <mat-error>Invalid email format</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Password</mat-label>
              <input
                matInput
                [type]="hidePassword() ? 'password' : 'text'"
                formControlName="password"
                required>
              <button
                mat-icon-button
                matSuffix
                type="button"
                (click)="hidePassword.set(!hidePassword())"
                [attr.aria-label]="hidePassword() ? 'Show password' : 'Hide password'"
                [attr.aria-pressed]="!hidePassword()">
                <mat-icon>{{ hidePassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (registerForm.get('password')?.hasError('minlength')) {
                <mat-error>Password must be at least 8 characters</mat-error>
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
              [disabled]="loading() || registerForm.invalid">
              @if (loading()) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                Create Account
              }
            </button>
          </form>

          <div class="login-link">
            Already have an account? <a routerLink="/auth/login">Login here</a>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
    styles: [`
    .register-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }

    .register-card {
      width: 100%;
      max-width: 500px;
    }

    mat-card-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 24px;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .name-row {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
    }

    .half-width {
      flex: 1;
    }

    .error-message {
      color: #f44336;
      margin-bottom: 16px;
      padding: 12px;
      background: #ffebee;
      border-radius: 4px;
    }

    .login-link {
      text-align: center;
      margin-top: 16px;
      font-size: 14px;
    }

    button[type="submit"] {
      margin-top: 8px;
      height: 48px;
    }
  `]
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  loading = signal(false);
  errorMessage = signal<string | null>(null);
  hidePassword = signal(true);

  registerForm = this.fb.group({
    orgName: ['', Validators.required],
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  onSubmit(): void {
    if (this.registerForm.invalid) return;

    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService.register(this.registerForm.value as any).subscribe({
      next: (response) => {
        if (response.data) {
          this.router.navigate(['/dashboard']);
        } else if (response.error) {
          this.errorMessage.set(response.error.message);
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set('Registration failed. Please try again.');
        this.loading.set(false);
      }
    });
  }
}

