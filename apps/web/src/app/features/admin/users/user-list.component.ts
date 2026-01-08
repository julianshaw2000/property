import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UserManagementService, UserResponse } from '../../../core/services/user-management.service';
import { AuthService } from '../../../core/services/auth.service';
import { CreateUserDialogComponent } from './create-user-dialog.component';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatSelectModule,
    MatDialogModule,
    MatSnackBarModule,
    MatChipsModule,
    MatTooltipModule
  ],
  template: `
    <div class="user-list-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>User Management</mat-card-title>
          <div class="header-actions">
            <button mat-raised-button color="primary" (click)="openCreateDialog()">
              <mat-icon>person_add</mat-icon>
              Create User
            </button>
          </div>
        </mat-card-header>

        <mat-card-content>
          @if (loading()) {
            <div class="loading">Loading users...</div>
          } @else if (error()) {
            <div class="error">{{ error() }}</div>
          } @else {
            <table mat-table [dataSource]="users()" class="user-table">
              <!-- Email Column -->
              <ng-container matColumnDef="email">
                <th mat-header-cell *matHeaderCellDef>Email</th>
                <td mat-cell *matCellDef="let user">{{ user.email }}</td>
              </ng-container>

              <!-- Name Column -->
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Name</th>
                <td mat-cell *matCellDef="let user">
                  {{ user.firstName }} {{ user.lastName }}
                </td>
              </ng-container>

              <!-- Role Column with inline editing -->
              <ng-container matColumnDef="role">
                <th mat-header-cell *matHeaderCellDef>Role</th>
                <td mat-cell *matCellDef="let user">
                  <div class="role-cell">
                    <mat-select
                      [value]="user.role"
                      (selectionChange)="updateUserRole(user.id, $event.value)"
                      [disabled]="!user.isActive">
                      <mat-option value="Viewer">Viewer</mat-option>
                      <mat-option value="Coordinator">Coordinator</mat-option>
                      <mat-option value="OrgAdmin">OrgAdmin</mat-option>
                      <mat-option value="Contractor">Contractor</mat-option>
                      <mat-option value="Tenant">Tenant</mat-option>
                    </mat-select>
                    @if (isPrimaryAdmin(user.id)) {
                      <mat-chip color="accent" highlighted>
                        <mat-icon>verified</mat-icon>
                        Primary Admin
                      </mat-chip>
                    }
                  </div>
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

              <!-- Actions Column -->
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Actions</th>
                <td mat-cell *matCellDef="let user">
                  @if (user.isActive) {
                    <button
                      mat-icon-button
                      color="warn"
                      (click)="deactivateUser(user.id)"
                      matTooltip="Deactivate user">
                      <mat-icon>block</mat-icon>
                    </button>
                  }
                  @if (!isPrimaryAdmin(user.id) && user.role === 'OrgAdmin' && user.isActive) {
                    <button
                      mat-icon-button
                      color="primary"
                      (click)="setPrimaryAdmin(user.id)"
                      matTooltip="Set as Primary Admin">
                      <mat-icon>verified</mat-icon>
                    </button>
                  }
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>

            @if (users().length === 0) {
              <div class="empty-state">
                <mat-icon>people_outline</mat-icon>
                <p>No users found</p>
              </div>
            }
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .user-list-container {
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

    .user-table {
      width: 100%;
    }

    .role-cell {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .role-cell mat-select {
      min-width: 140px;
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

    mat-chip mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
  `]
})
export class UserListComponent implements OnInit {
  private userService = inject(UserManagementService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  users = signal<UserResponse[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  primaryAdminUserId = signal<string | null>(null);

  displayedColumns = ['email', 'name', 'role', 'status', 'actions'];

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading.set(true);
    this.error.set(null);

    // SuperAdmin can pass orgId if needed, OrgAdmin uses their own
    this.userService.listUsers().subscribe({
      next: (response) => {
        if (response.data) {
          this.users.set(response.data);
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load users');
        this.loading.set(false);
        console.error('Load users error:', err);
      }
    });
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(CreateUserDialogComponent, {
      width: '500px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadUsers();
      }
    });
  }

  updateUserRole(userId: string, newRole: string): void {
    this.userService.updateUserRole(userId, { role: newRole }).subscribe({
      next: () => {
        this.snackBar.open('User role updated successfully', 'Close', { duration: 3000 });
        this.loadUsers();
      },
      error: (err) => {
        const errorMessage = err.error?.error?.message || 'Failed to update user role';
        this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
        // Reload to reset the UI
        this.loadUsers();
      }
    });
  }

  deactivateUser(userId: string): void {
    if (!confirm('Are you sure you want to deactivate this user?')) {
      return;
    }

    this.userService.deactivateUser(userId).subscribe({
      next: () => {
        this.snackBar.open('User deactivated successfully', 'Close', { duration: 3000 });
        this.loadUsers();
      },
      error: (err) => {
        const errorMessage = err.error?.error?.message || 'Failed to deactivate user';
        this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
      }
    });
  }

  setPrimaryAdmin(userId: string): void {
    if (!confirm('Set this user as the Primary Admin for the organisation?')) {
      return;
    }

    const orgId = this.authService.orgId();
    if (!orgId) {
      this.snackBar.open('Organisation ID not found', 'Close', { duration: 3000 });
      return;
    }

    this.userService.setPrimaryAdmin(orgId, { userId }).subscribe({
      next: () => {
        this.snackBar.open('Primary admin updated successfully', 'Close', { duration: 3000 });
        this.primaryAdminUserId.set(userId);
        this.loadUsers();
      },
      error: (err) => {
        const errorMessage = err.error?.error?.message || 'Failed to set primary admin';
        this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
      }
    });
  }

  isPrimaryAdmin(userId: string): boolean {
    // This would ideally come from the API response
    // For now, we track it locally after setting
    return this.primaryAdminUserId() === userId;
  }
}
