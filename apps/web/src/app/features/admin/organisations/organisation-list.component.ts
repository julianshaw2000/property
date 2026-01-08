import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { OrganisationService, OrganisationResponse } from '../../../core/services/organisation.service';
import { CreateOrganisationDialogComponent } from './create-organisation-dialog.component';

@Component({
  selector: 'app-organisation-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  template: `
    <div class="org-list-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Organisation Management</mat-card-title>
          <div class="header-actions">
            <button mat-raised-button color="primary" (click)="openCreateDialog()">
              <mat-icon>business</mat-icon>
              Create Organisation
            </button>
          </div>
        </mat-card-header>

        <mat-card-content>
          @if (loading()) {
            <div class="loading">Loading organisations...</div>
          } @else if (error()) {
            <div class="error">{{ error() }}</div>
          } @else {
            <table mat-table [dataSource]="organisations()" class="org-table">
              <!-- Name Column -->
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Name</th>
                <td mat-cell *matCellDef="let org">{{ org.name }}</td>
              </ng-container>

              <!-- Slug Column -->
              <ng-container matColumnDef="slug">
                <th mat-header-cell *matHeaderCellDef>Slug</th>
                <td mat-cell *matCellDef="let org">
                  <code>{{ org.slug }}</code>
                </td>
              </ng-container>

              <!-- Plan Column -->
              <ng-container matColumnDef="plan">
                <th mat-header-cell *matHeaderCellDef>Plan</th>
                <td mat-cell *matCellDef="let org">
                  <mat-chip [color]="getPlanColor(org.plan)">
                    {{ org.plan }}
                  </mat-chip>
                </td>
              </ng-container>

              <!-- Status Column -->
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let org">
                  <mat-chip [color]="getStatusColor(org.status)">
                    {{ org.status }}
                  </mat-chip>
                </td>
              </ng-container>

              <!-- Users Column -->
              <ng-container matColumnDef="users">
                <th mat-header-cell *matHeaderCellDef>Users</th>
                <td mat-cell *matCellDef="let org">{{ org.userCount }}</td>
              </ng-container>

              <!-- Created Column -->
              <ng-container matColumnDef="created">
                <th mat-header-cell *matHeaderCellDef>Created</th>
                <td mat-cell *matCellDef="let org">
                  {{ org.createdAt | date:'short' }}
                </td>
              </ng-container>

              <!-- Actions Column -->
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Actions</th>
                <td mat-cell *matCellDef="let org">
                  <button
                    mat-icon-button
                    color="primary"
                    (click)="viewDetails(org.id)"
                    matTooltip="View details">
                    <mat-icon>visibility</mat-icon>
                  </button>
                  @if (org.status === 'Active') {
                    <button
                      mat-icon-button
                      color="warn"
                      (click)="suspendOrg(org.id)"
                      matTooltip="Suspend organisation">
                      <mat-icon>block</mat-icon>
                    </button>
                  } @else if (org.status === 'Suspended') {
                    <button
                      mat-icon-button
                      color="accent"
                      (click)="reactivateOrg(org.id)"
                      matTooltip="Reactivate organisation">
                      <mat-icon>check_circle</mat-icon>
                    </button>
                  }
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>

            @if (organisations().length === 0) {
              <div class="empty-state">
                <mat-icon>business</mat-icon>
                <p>No organisations found</p>
              </div>
            }
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .org-list-container {
      padding: 24px;
    }

    mat-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .header-actions {
      margin-left: auto;
    }

    .org-table {
      width: 100%;
    }

    code {
      background: #f5f5f5;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 12px;
    }

    .loading, .error, .empty-state {
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
    }

    mat-chip {
      font-size: 11px;
      min-height: 24px;
    }
  `]
})
export class OrganisationListComponent implements OnInit {
  private orgService = inject(OrganisationService);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  organisations = signal<OrganisationResponse[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  displayedColumns = ['name', 'slug', 'plan', 'status', 'users', 'created', 'actions'];

  ngOnInit(): void {
    this.loadOrganisations();
  }

  loadOrganisations(): void {
    this.loading.set(true);
    this.error.set(null);

    this.orgService.listOrganisations().subscribe({
      next: (response) => {
        if (response.data) {
          this.organisations.set(response.data);
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load organisations');
        this.loading.set(false);
        console.error('Load organisations error:', err);
      }
    });
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(CreateOrganisationDialogComponent, {
      width: '500px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadOrganisations();
      }
    });
  }

  viewDetails(orgId: string): void {
    this.router.navigate(['/admin/organisations', orgId]);
  }

  suspendOrg(orgId: string): void {
    if (!confirm('Are you sure you want to suspend this organisation? All users will lose access.')) {
      return;
    }

    this.orgService.suspendOrganisation(orgId).subscribe({
      next: () => {
        this.snackBar.open('Organisation suspended successfully', 'Close', { duration: 3000 });
        this.loadOrganisations();
      },
      error: (err) => {
        const errorMessage = err.error?.error?.message || 'Failed to suspend organisation';
        this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
      }
    });
  }

  reactivateOrg(orgId: string): void {
    if (!confirm('Reactivate this organisation?')) {
      return;
    }

    this.orgService.reactivateOrganisation(orgId).subscribe({
      next: () => {
        this.snackBar.open('Organisation reactivated successfully', 'Close', { duration: 3000 });
        this.loadOrganisations();
      },
      error: (err) => {
        const errorMessage = err.error?.error?.message || 'Failed to reactivate organisation';
        this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
      }
    });
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
