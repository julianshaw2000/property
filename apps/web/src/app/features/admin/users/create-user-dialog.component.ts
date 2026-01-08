import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { UserManagementService } from '../../../core/services/user-management.service';

@Component({
  selector: 'app-create-user-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCheckboxModule,
    MatSnackBarModule
  ],
  template: `
    <h2 mat-dialog-title>Create New User</h2>

    <mat-dialog-content>
      <form [formGroup]="userForm" class="user-form">
        <mat-form-field appearance="outline">
          <mat-label>Email</mat-label>
          <input matInput type="email" formControlName="email" required>
          @if (userForm.get('email')?.hasError('required')) {
            <mat-error>Email is required</mat-error>
          }
          @if (userForm.get('email')?.hasError('email')) {
            <mat-error>Please enter a valid email</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>First Name</mat-label>
          <input matInput formControlName="firstName">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Last Name</mat-label>
          <input matInput formControlName="lastName">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Phone (E.164 format)</mat-label>
          <input matInput formControlName="phoneE164" placeholder="+447123456789">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Role</mat-label>
          <mat-select formControlName="role" required>
            <mat-option value="Viewer">Viewer</mat-option>
            <mat-option value="Coordinator">Coordinator</mat-option>
            <mat-option value="OrgAdmin">OrgAdmin</mat-option>
            <mat-option value="Contractor">Contractor</mat-option>
            <mat-option value="Tenant">Tenant</mat-option>
          </mat-select>
          @if (userForm.get('role')?.hasError('required')) {
            <mat-error>Role is required</mat-error>
          }
        </mat-form-field>

        <mat-checkbox formControlName="sendInviteEmail">
          Send invite email (user sets password)
        </mat-checkbox>

        @if (!userForm.get('sendInviteEmail')?.value) {
          <mat-form-field appearance="outline">
            <mat-label>Password</mat-label>
            <input matInput type="password" formControlName="password" required>
            @if (userForm.get('password')?.hasError('required')) {
              <mat-error>Password is required when not sending invite</mat-error>
            }
            @if (userForm.get('password')?.hasError('minlength')) {
              <mat-error>Password must be at least 6 characters</mat-error>
            }
          </mat-form-field>
        }
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button
        mat-raised-button
        color="primary"
        (click)="createUser()"
        [disabled]="submitting() || userForm.invalid">
        @if (submitting()) {
          Creating...
        } @else {
          Create User
        }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .user-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 400px;
      padding: 8px 0;
    }

    mat-form-field {
      width: 100%;
    }

    mat-checkbox {
      margin: 8px 0;
    }
  `]
})
export class CreateUserDialogComponent {
  private fb = inject(FormBuilder);
  private userService = inject(UserManagementService);
  private dialogRef = inject(MatDialogRef<CreateUserDialogComponent>);
  private snackBar = inject(MatSnackBar);

  submitting = signal(false);

  userForm: FormGroup;

  constructor() {
    this.userForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      firstName: [''],
      lastName: [''],
      phoneE164: [''],
      role: ['Viewer', Validators.required],
      sendInviteEmail: [true],
      password: ['']
    });

    // Add password validation when sendInviteEmail is false
    this.userForm.get('sendInviteEmail')?.valueChanges.subscribe(sendInvite => {
      const passwordControl = this.userForm.get('password');
      if (sendInvite) {
        passwordControl?.clearValidators();
      } else {
        passwordControl?.setValidators([Validators.required, Validators.minLength(6)]);
      }
      passwordControl?.updateValueAndValidity();
    });
  }

  createUser(): void {
    if (this.userForm.invalid) {
      return;
    }

    this.submitting.set(true);

    const formValue = this.userForm.value;
    const request = {
      email: formValue.email,
      role: formValue.role,
      firstName: formValue.firstName || undefined,
      lastName: formValue.lastName || undefined,
      phoneE164: formValue.phoneE164 || undefined,
      password: formValue.sendInviteEmail ? undefined : formValue.password,
      sendInviteEmail: formValue.sendInviteEmail
    };

    this.userService.createUser(request).subscribe({
      next: () => {
        this.snackBar.open('User created successfully', 'Close', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (err) => {
        const errorMessage = err.error?.error?.message || 'Failed to create user';
        this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
        this.submitting.set(false);
      }
    });
  }
}
