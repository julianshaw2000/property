import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { AuditLogService, AuditLogResponse } from '../../../core/services/audit-log.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'app-audit-log-list',
    imports: [
        CommonModule,
        MatTableModule,
        MatCardModule,
        MatChipsModule,
        MatIconModule
    ],
    template: `
    <div class="audit-log-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Audit Logs</mat-card-title>
          @if (authService.isSuperAdmin()) {
            <mat-chip color="accent">
              <mat-icon>admin_panel_settings</mat-icon>
              Viewing all organisations
            </mat-chip>
          }
        </mat-card-header>

        <mat-card-content>
          @if (loading()) {
            <div class="loading">Loading audit logs...</div>
          } @else if (error()) {
            <div class="error">{{ error() }}</div>
          } @else {
            <table mat-table [dataSource]="auditLogs()" class="audit-table">
              <!-- Timestamp Column -->
              <ng-container matColumnDef="timestamp">
                <th mat-header-cell *matHeaderCellDef>Timestamp</th>
                <td mat-cell *matCellDef="let log">
                  {{ log.createdAt | date:'medium' }}
                </td>
              </ng-container>

              <!-- User Column -->
              <ng-container matColumnDef="user">
                <th mat-header-cell *matHeaderCellDef>User</th>
                <td mat-cell *matCellDef="let log">{{ log.userEmail }}</td>
              </ng-container>

              <!-- Action Column -->
              <ng-container matColumnDef="action">
                <th mat-header-cell *matHeaderCellDef>Action</th>
                <td mat-cell *matCellDef="let log">
                  <mat-chip [class]="getActionClass(log.action)">
                    {{ formatAction(log.action) }}
                  </mat-chip>
                </td>
              </ng-container>

              <!-- Entity Type Column -->
              <ng-container matColumnDef="entityType">
                <th mat-header-cell *matHeaderCellDef>Entity Type</th>
                <td mat-cell *matCellDef="let log">{{ log.entityType }}</td>
              </ng-container>

              <!-- Changes Column -->
              <ng-container matColumnDef="changes">
                <th mat-header-cell *matHeaderCellDef>Changes</th>
                <td mat-cell *matCellDef="let log">
                  @if (log.changesSummaryJson) {
                    <details>
                      <summary>View changes</summary>
                      <pre>{{ formatChanges(log.changesSummaryJson) }}</pre>
                    </details>
                  } @else {
                    <span class="no-changes">—</span>
                  }
                </td>
              </ng-container>

              <!-- IP Address Column -->
              <ng-container matColumnDef="ipAddress">
                <th mat-header-cell *matHeaderCellDef>IP Address</th>
                <td mat-cell *matCellDef="let log">
                  {{ log.ipAddress || '—' }}
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>

            @if (auditLogs().length === 0) {
              <div class="empty-state">
                <mat-icon>history</mat-icon>
                <p>No audit logs found</p>
              </div>
            }
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
    styles: [`
    .audit-log-container {
      padding: 24px;
    }

    mat-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .audit-table {
      width: 100%;
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

    mat-chip.created {
      background-color: #4caf50 !important;
      color: white;
    }

    mat-chip.updated, mat-chip.changed {
      background-color: #2196f3 !important;
      color: white;
    }

    mat-chip.deleted, mat-chip.deactivated, mat-chip.suspended {
      background-color: #f44336 !important;
      color: white;
    }

    mat-chip.invited {
      background-color: #ff9800 !important;
      color: white;
    }

    details {
      cursor: pointer;
    }

    details summary {
      color: #1976d2;
      font-size: 12px;
    }

    details pre {
      margin: 8px 0 0;
      padding: 8px;
      background: #f5f5f5;
      border-radius: 4px;
      font-size: 11px;
      max-width: 300px;
      overflow-x: auto;
    }

    .no-changes {
      color: rgba(0, 0, 0, 0.38);
    }

    td mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      vertical-align: middle;
    }
  `]
})
export class AuditLogListComponent implements OnInit {
  private auditService = inject(AuditLogService);
  authService = inject(AuthService);

  auditLogs = signal<AuditLogResponse[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  displayedColumns = ['timestamp', 'user', 'action', 'entityType', 'changes', 'ipAddress'];

  ngOnInit(): void {
    this.loadAuditLogs();
  }

  loadAuditLogs(): void {
    this.loading.set(true);
    this.error.set(null);

    this.auditService.listAuditLogs().subscribe({
      next: (response) => {
        if (response.data) {
          this.auditLogs.set(response.data);
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load audit logs');
        this.loading.set(false);
        console.error('Load audit logs error:', err);
      }
    });
  }

  formatAction(action: string): string {
    return action
      .split('.')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  getActionClass(action: string): string {
    const lowerAction = action.toLowerCase();
    if (lowerAction.includes('created')) return 'created';
    if (lowerAction.includes('updated') || lowerAction.includes('changed')) return 'updated';
    if (lowerAction.includes('deleted') || lowerAction.includes('deactivated') || lowerAction.includes('suspended')) return 'deleted';
    if (lowerAction.includes('invited')) return 'invited';
    return '';
  }

  formatChanges(changesJson: string): string {
    try {
      const changes = JSON.parse(changesJson);
      return JSON.stringify(changes, null, 2);
    } catch {
      return changesJson;
    }
  }
}
