import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PlatformSettingsService, PlatformSettings } from '../../../core/services/platform-settings.service';

@Component({
  selector: 'app-platform-settings',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    MatButtonModule,
    MatSnackBarModule
  ],
  template: `
    <div class="settings-container">
      <h1>Platform Settings</h1>

      <mat-card>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="onSave()">
            <h2>Platform Identity</h2>
            <div class="settings-row">
              <mat-form-field appearance="outline" class="half-width">
                <mat-label>Platform Name</mat-label>
                <input matInput formControlName="platformName">
              </mat-form-field>

              <mat-form-field appearance="outline" class="half-width">
                <mat-label>Support Email</mat-label>
                <input matInput type="email" formControlName="supportEmail">
              </mat-form-field>
            </div>

            <div class="settings-row">
              <mat-form-field appearance="outline" class="half-width">
                <mat-label>Terms URL</mat-label>
                <input matInput formControlName="termsUrl">
              </mat-form-field>

              <mat-form-field appearance="outline" class="half-width">
                <mat-label>Privacy URL</mat-label>
                <input matInput formControlName="privacyUrl">
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Global Banner Message</mat-label>
              <textarea matInput rows="2" formControlName="globalBannerMessage"></textarea>
            </mat-form-field>

            <h2>Organisation Limits</h2>
            <div class="settings-row">
              <mat-form-field appearance="outline" class="third-width">
                <mat-label>Max Properties per Org</mat-label>
                <input matInput type="number" formControlName="maxPropertiesPerOrg">
              </mat-form-field>

              <mat-form-field appearance="outline" class="third-width">
                <mat-label>Max Users per Org</mat-label>
                <input matInput type="number" formControlName="maxUsersPerOrg">
              </mat-form-field>

              <mat-form-field appearance="outline" class="third-width">
                <mat-label>Max Active Jobs per Month</mat-label>
                <input matInput type="number" formControlName="maxActiveJobsPerMonth">
              </mat-form-field>
            </div>

            <div class="settings-row">
              <mat-form-field appearance="outline" class="half-width">
                <mat-label>Default Approval Threshold (GBP)</mat-label>
                <input matInput type="number" formControlName="defaultApprovalThresholdGbp">
              </mat-form-field>

              <mat-form-field appearance="outline" class="half-width">
                <mat-label>Max Approval Threshold (GBP)</mat-label>
                <input matInput type="number" formControlName="maxApprovalThresholdGbp">
              </mat-form-field>
            </div>

            <h2>Billing</h2>
            <div class="settings-row toggles-row">
              <mat-slide-toggle formControlName="billingEnabled">Billing Enabled</mat-slide-toggle>
              <mat-slide-toggle formControlName="vatEnabled">VAT Enabled</mat-slide-toggle>
              <mat-slide-toggle formControlName="hardStopOnNonpayment">Hard Stop on Nonpayment</mat-slide-toggle>
            </div>

            <div class="settings-row">
              <mat-form-field appearance="outline" class="third-width">
                <mat-label>Trial Days</mat-label>
                <input matInput type="number" formControlName="trialDays">
              </mat-form-field>

              <mat-form-field appearance="outline" class="third-width">
                <mat-label>Nonpayment Grace Days</mat-label>
                <input matInput type="number" formControlName="nonpaymentGraceDays">
              </mat-form-field>

              <mat-form-field appearance="outline" class="third-width">
                <mat-label>VAT Rate (%)</mat-label>
                <input matInput type="number" formControlName="vatRatePercent">
              </mat-form-field>
            </div>

            <h2>Communication Channels</h2>
            <div class="settings-row toggles-row">
              <mat-slide-toggle formControlName="channelEmailEnabled">Email</mat-slide-toggle>
              <mat-slide-toggle formControlName="channelSmsEnabled">SMS</mat-slide-toggle>
              <mat-slide-toggle formControlName="channelWhatsappEnabled">WhatsApp</mat-slide-toggle>
            </div>

            <h2>AI & Platform Modes</h2>
            <div class="settings-row toggles-row">
              <mat-slide-toggle formControlName="aiEnabled">AI Enabled</mat-slide-toggle>
              <mat-slide-toggle formControlName="maintenanceMode">Maintenance Mode</mat-slide-toggle>
              <mat-slide-toggle formControlName="readOnlyMode">Read-Only Mode</mat-slide-toggle>
            </div>

            <div class="actions">
              <button
                mat-raised-button
                color="primary"
                type="submit"
                [disabled]="saving() || form.invalid || !form.dirty">
                {{ saving() ? 'Saving...' : 'Save Settings' }}
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .settings-container {
      max-width: 1000px;
      margin: 0 auto;
      padding: 24px;
    }

    h1 {
      font-size: 2rem;
      margin-bottom: 1.5rem;
    }

    h2 {
      margin-top: 24px;
      margin-bottom: 12px;
      font-size: 1.2rem;
    }

    .settings-row {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }

    .full-width {
      width: 100%;
    }

    .half-width {
      flex: 1 1 50%;
      min-width: 220px;
    }

    .third-width {
      flex: 1 1 33%;
      min-width: 180px;
    }

    .toggles-row {
      align-items: center;
    }

    .actions {
      margin-top: 24px;
      display: flex;
      justify-content: flex-end;
    }
  `]
})
export class PlatformSettingsComponent {
  private fb = inject(FormBuilder);
  private settingsService = inject(PlatformSettingsService);
  private snackBar = inject(MatSnackBar);

  saving = signal(false);

  form = this.fb.group({
    settingsVersion: [0],

    // Platform identity
    platformName: [''],
    supportEmail: ['', Validators.email],
    termsUrl: [''],
    privacyUrl: [''],
    globalBannerMessage: [''],

    // Organisation limits
    maxPropertiesPerOrg: [0, [Validators.min(1)]],
    maxUsersPerOrg: [0, [Validators.min(1)]],
    maxActiveJobsPerMonth: [0, [Validators.min(1)]],
    defaultApprovalThresholdGbp: [0, [Validators.min(0)]],
    maxApprovalThresholdGbp: [0, [Validators.min(0)]],

    // Billing
    billingEnabled: [false],
    trialDays: [0, [Validators.min(0)]],
    nonpaymentGraceDays: [0, [Validators.min(0)]],
    hardStopOnNonpayment: [false],
    vatEnabled: [false],
    vatRatePercent: [0, [Validators.min(0)]],

    // Comms
    channelEmailEnabled: [true],
    channelSmsEnabled: [false],
    channelWhatsappEnabled: [false],

    // AI & modes
    aiEnabled: [false],
    maintenanceMode: [false],
    readOnlyMode: [false]
  });

  constructor() {
    this.loadSettings();
  }

  private loadSettings(): void {
    this.settingsService.getSettings().subscribe({
      next: (response) => {
        if (response.data) {
          this.form.patchValue(response.data);
          this.form.markAsPristine();
        }
      },
      error: () => {
        this.snackBar.open('Failed to load platform settings', 'Close', { duration: 5000 });
      }
    });
  }

  onSave(): void {
    if (this.form.invalid || !this.form.dirty) {
      return;
    }

    this.saving.set(true);

    const value = this.form.value as unknown as PlatformSettings;

    this.settingsService.updateSettings(value).subscribe({
      next: (response) => {
        if (response.data) {
          this.form.patchValue(response.data);
          this.form.markAsPristine();
          this.snackBar.open('Platform settings updated', 'Close', { duration: 3000 });
        }
        this.saving.set(false);
      },
      error: (err) => {
        const message = err?.error?.error?.message ?? 'Failed to update platform settings';
        this.snackBar.open(message, 'Close', { duration: 5000 });
        this.saving.set(false);
      }
    });
  }
}
