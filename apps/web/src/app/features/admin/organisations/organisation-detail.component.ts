import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { OrganisationService, OrganisationDetailResponse } from '../../../core/services/organisation.service';

@Component({
  selector: 'app-organisation-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatSnackBarModule
  ],
  template: `
    <div class="org-detail-container">
      @if (loading()) {
        <div class="loading">Loading organisation details...</div>
      } @else if (error()) {
        <div class="error">{{ error() }}</div>
      } @else if (organisation()) {
        <div class="org-header">
          <button mat-icon-button (click)="goBack()">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <h1>{{ organisation()?.name }}</h1>
        </div>

        <mat-card class="org-info-card">
          <mat-card-header>
            <mat-card-title>Organisation Information</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="info-grid">
              <div class="info-item">
                <label>Name</label>
                <span>{{ organisation()?.name }}</span>
              </div>
              <div class="info-item">
                <label>Slug</label>
                <span><code>{{ organisation()?.slug }}</code></span>
              </div>
              <div class="info-item">
                <label>Plan</label>
                <mat-chip [color]="getPlanColor(organisation()?.plan || '')">
                  {{ organisation()?.plan }}
                </mat-chip>
              </div>
              <div class="info-item">
                <label>Status</label>
                <mat-chip [color]="getStatusColor(organisation()?.status || '')">
                  {{ organisation()?.status }}
                </mat-chip>
              </div>
              <div class="info-item">
                <label>Total Users</label>
                <span>{{ organisation()?.userCount }}</span>
              </div>
              <div class="info-item">
                <label>Primary Admin</label>
                <span>{{ organisation()?.primaryAdminName || 'Not set' }}</span>
              </div>
              <div class="info-item">
                <label>Created</label>
                <span>{{ organisation()?.createdAt | date:'medium' }}</span>
              </div>
            </div>

            <div class="actions">
              @if (organisation()?.status === 'Active') {
                <button
                  mat-raised-button
                  color="warn"
                  (click)="suspendOrganisation()">
                  <mat-icon>block</mat-icon>
                  Suspend Organisation
                </button>
              } @else if (organisation()?.status === 'Suspended') {
                <button
                  mat-raised-button
                  color="accent"
                  (click)="reactivateOrganisation()">
                  <mat-icon>check_circle</mat-icon>
                  Reactivate Organisation
                </button>
              }
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="users-card">
          <mat-card-header>
            <mat-card-title>Users ({{ organisation()?.users?.length || 0 }})</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @if (organisation()?.users && organisation()!.users.length > 0) {
              <table mat-table [dataSource]="organisation()!.users" class="users-table">
                <!-- Email Column -->
                <ng-container matColumnDef="email">
                  <th mat-header-cell *matHeaderCellDef>Email</th>
                  <td mat-cell *matCellDef="let user">
                    {{ user.email }}
                    @if (user.id === organisation()?.primaryAdminUserId) {
                      <mat-chip color="accent" highlighted class="inline-chip">
                        <mat-icon>verified</mat-icon>
                        Primary Admin
                      </mat-chip>
                    }
                  </td>
                </ng-container>

                <!-- Name Column -->
                <ng-container matColumnDef="name">
                  <th mat-header-cell *matHeaderCellDef>Name</th>
                  <td mat-cell *matCellDef="let user">
                    {{ user.firstName }} {{ user.lastName }}
                  </td>
                </ng-container>

                <!-- Role Column -->
                <ng-container matColumnDef="role">
                  <th mat-header-cell *matHeaderCellDef>Role</th>
                  <td mat-cell *matCellDef="let user">
                    <mat-chip>{{ user.role }}</mat-chip>
                  </td>
                </ng-container>

                <!-- Status Column -->
                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef>Status</th>
                  <td mat-cell *matCellDef="let user">
                    @if (user.isActive) {
                      <mat-chip color="primary">Active</mat-chip>
                    } @else {
                      <mat-chip>Inactive</mat-chip>
                    }
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="userColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: userColumns;"></tr>
              </table>
            } @else {
              <div class="empty-state">
                <mat-icon>people_outline</mat-icon>
                <p>No users in this organisation</p>
              </div>
            }
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .org-detail-container {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .org-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
    }

    .org-header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 500;
    }

    .org-info-card,
    .users-card {
      margin-bottom: 24px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 24px;
      margin-bottom: 24px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .info-item label {
      font-size: 12px;
      font-weight: 500;
      color: rgba(0, 0, 0, 0.54);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .info-item span {
      font-size: 16px;
      color: rgba(0, 0, 0, 0.87);
    }

    code {
      background: #f5f5f5;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 14px;
    }

    .actions {
      display: flex;
      gap: 12px;
      padding-top: 16px;
      border-top: 1px solid rgba(0, 0, 0, 0.12);
    }

    .users-table {
      width: 100%;
    }

    .inline-chip {
      display: inline-flex;
      vertical-align: middle;
      margin-left: 8px;
      font-size: 11px;
      min-height: 24px;
    }

    .inline-chip mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    mat-chip {
      font-size: 11px;
      min-height: 24px;
    }

    .loading,
    .error,
    .empty-state {
      text-align: center;
      padding: 48px 24px;
      color: rgba(0, 0, 0, 0.54);
    }

    .error {
      color: #f44336;
    }

    .empty-state mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: rgba(0, 0, 0, 0.26);
      margin-bottom: 16px;
    }
  `]
})
export class OrganisationDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private orgService = inject(OrganisationService);
  private snackBar = inject(MatSnackBar);

  organisation = signal<OrganisationDetailResponse | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  userColumns = ['email', 'name', 'role', 'status'];

  ngOnInit(): void {
    const orgId = this.route.snapshot.paramMap.get('id');
    if (orgId) {
      this.loadOrganisation(orgId);
    } else {
      this.error.set('Organisation ID not found');
      this.loading.set(false);
    }
  }

  loadOrganisation(orgId: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.orgService.getOrganisation(orgId).subscribe({
      next: (response) => {
        if (response.data) {
          this.organisation.set(response.data);
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load organisation details');
        this.loading.set(false);
        console.error('Load organisation error:', err);
      }
    });
  }

  suspendOrganisation(): void {
    const org = this.organisation();
    if (!org) return;

    if (!confirm(`Are you sure you want to suspend "${org.name}"? All users will lose access.`)) {
      return;
    }

    this.orgService.suspendOrganisation(org.id).subscribe({
      next: () => {
        this.snackBar.open('Organisation suspended successfully', 'Close', { duration: 3000 });
        this.loadOrganisation(org.id);
      },
      error: (err) => {
        const errorMessage = err.error?.error?.message || 'Failed to suspend organisation';
        this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
      }
    });
  }

  reactivateOrganisation(): void {
    const org = this.organisation();
    if (!org) return;

    if (!confirm(`Reactivate "${org.name}"?`)) {
      return;
    }

    this.orgService.reactivateOrganisation(org.id).subscribe({
      next: () => {
        this.snackBar.open('Organisation reactivated successfully', 'Close', { duration: 3000 });
        this.loadOrganisation(org.id);
      },
      error: (err) => {
        const errorMessage = err.error?.error?.message || 'Failed to reactivate organisation';
        this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/organisations']);
  }

  getPlanColor(plan: string): 'primary' | 'accent' | 'warn' | undefined {
    switch (plan.toLowerCase()) {
      case 'free': return undefined;
      case 'pro': return 'primary';
      case 'enterprise': return 'accent';
      default: return undefined;
    }
  }

  getStatusColor(status: string): 'primary' | 'warn' | undefined {
    return status === 'Active' ? 'primary' : 'warn';
  }
}
