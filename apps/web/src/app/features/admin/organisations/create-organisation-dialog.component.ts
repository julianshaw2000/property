import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { OrganisationService } from '../../../core/services/organisation.service';

@Component({
  selector: 'app-create-organisation-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule
  ],
  template: `
    <h2 mat-dialog-title>Create New Organisation</h2>

    <mat-dialog-content>
      <form [formGroup]="orgForm" class="org-form">
        <mat-form-field appearance="outline">
          <mat-label>Organisation Name</mat-label>
          <input matInput formControlName="name" required>
          @if (orgForm.get('name')?.hasError('required')) {
            <mat-error>Organisation name is required</mat-error>
          }
          @if (orgForm.get('name')?.hasError('minlength')) {
            <mat-error>Name must be at least 2 characters</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Plan</mat-label>
          <mat-select formControlName="plan" required>
            <mat-option value="Free">Free</mat-option>
            <mat-option value="Starter">Starter</mat-option>
            <mat-option value="Professional">Professional</mat-option>
            <mat-option value="Enterprise">Enterprise</mat-option>
          </mat-select>
          @if (orgForm.get('plan')?.hasError('required')) {
            <mat-error>Plan is required</mat-error>
          }
        </mat-form-field>

        <p class="slug-hint">
          <mat-icon>info</mat-icon>
          A unique URL identifier will be automatically generated
        </p>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button
        mat-raised-button
        color="primary"
        (click)="createOrganisation()"
        [disabled]="submitting() || orgForm.invalid">
        @if (submitting()) {
          Creating...
        } @else {
          Create Organisation
        }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .org-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 400px;
      padding: 8px 0;
    }

    mat-form-field {
      width: 100%;
    }

    .slug-hint {
      display: flex;
      align-items: center;
      gap: 8px;
      color: rgba(0, 0, 0, 0.6);
      font-size: 14px;
      margin: 0;
      padding: 8px 12px;
      background-color: #f5f5f5;
      border-radius: 4px;
    }

    .slug-hint mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
  `]
})
export class CreateOrganisationDialogComponent {
  private fb = inject(FormBuilder);
  private orgService = inject(OrganisationService);
  private dialogRef = inject(MatDialogRef<CreateOrganisationDialogComponent>);
  private snackBar = inject(MatSnackBar);

  submitting = signal(false);

  orgForm: FormGroup;

  constructor() {
    this.orgForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      plan: ['Free', Validators.required]
    });
  }

  createOrganisation(): void {
    if (this.orgForm.invalid) {
      return;
    }

    this.submitting.set(true);

    const formValue = this.orgForm.value;
    const request = {
      name: formValue.name,
      plan: formValue.plan
    };

    this.orgService.createOrganisation(request).subscribe({
      next: () => {
        this.snackBar.open('Organisation created successfully', 'Close', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (err) => {
        const errorMessage = err.error?.error?.message || 'Failed to create organisation';
        this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
        this.submitting.set(false);
      }
    });
  }
}
