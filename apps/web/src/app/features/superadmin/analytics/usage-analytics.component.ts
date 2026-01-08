import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AnalyticsService, OrganisationUsage } from '../../../core/services/analytics.service';

@Component({
  selector: 'app-usage-analytics',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTooltipModule
  ],
  template: `
    <div class="analytics-container">
      <div class="header">
        <h1>Usage Analytics</h1>
        <p>Platform-wide usage metrics and resource consumption</p>
        <div class="actions">
          <button mat-raised-button color="primary" (click)="exportToCSV()">
            <mat-icon>download</mat-icon>
            Export to CSV
          </button>
          <button mat-raised-button (click)="loadData()">
            <mat-icon>refresh</mat-icon>
            Refresh
          </button>
        </div>
      </div>

      @if (loading()) {
        <div class="loading-container">
          <mat-spinner diameter="50"></mat-spinner>
          <p>Loading usage analytics...</p>
        </div>
      } @else if (error()) {
        <div class="error-container">
          <mat-icon>error</mat-icon>
          <p>{{ error() }}</p>
          <button mat-raised-button color="primary" (click)="loadData()">Retry</button>
        </div>
      } @else {
        <!-- Summary Cards -->
        <div class="summary-cards">
          <mat-card>
            <mat-card-header>
              <mat-icon class="warn-icon">warning</mat-icon>
              <mat-card-title>Exceeding Limits</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="stat-value">{{ getExceedingCount() }}</div>
              <div class="stat-label">organisations over limit</div>
            </mat-card-content>
          </mat-card>

          <mat-card>
            <mat-card-header>
              <mat-icon>confirmation_number</mat-icon>
              <mat-card-title>Total Tickets</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="stat-value">{{ getTotalTickets() }}</div>
              <div class="stat-label">across all organisations</div>
            </mat-card-content>
          </mat-card>

          <mat-card>
            <mat-card-header>
              <mat-icon>work</mat-icon>
              <mat-card-title>Total Work Orders</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="stat-value">{{ getTotalWorkOrders() }}</div>
              <div class="stat-label">across all organisations</div>
            </mat-card-content>
          </mat-card>

          <mat-card>
            <mat-card-header>
              <mat-icon>people</mat-icon>
              <mat-card-title>Total Users</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="stat-value">{{ getTotalUsers() }}</div>
              <div class="stat-label">active platform users</div>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Usage Table -->
        <mat-card class="table-card">
          <mat-card-header>
            <mat-icon>table_chart</mat-icon>
            <mat-card-title>Organisation Usage Details</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <table mat-table [dataSource]="usageData()" class="usage-table">
              <!-- Organisation Column -->
              <ng-container matColumnDef="organisation">
                <th mat-header-cell *matHeaderCellDef>Organisation</th>
                <td mat-cell *matCellDef="let element">
                  <div class="org-cell">
                    <span class="org-name">{{ element.organisationName }}</span>
                    @if (element.exceedsLimits) {
                      <mat-icon class="warning-icon" matTooltip="Exceeds plan limits">warning</mat-icon>
                    }
                  </div>
                </td>
              </ng-container>

              <!-- Plan Column -->
              <ng-container matColumnDef="plan">
                <th mat-header-cell *matHeaderCellDef>Plan</th>
                <td mat-cell *matCellDef="let element">
                  <mat-chip>{{ element.plan }}</mat-chip>
                </td>
              </ng-container>

              <!-- Status Column -->
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let element">
                  <mat-chip [class.active]="element.status === 'Active'"
                            [class.suspended]="element.status === 'Suspended'">
                    {{ element.status }}
                  </mat-chip>
                </td>
              </ng-container>

              <!-- Users Column -->
              <ng-container matColumnDef="users">
                <th mat-header-cell *matHeaderCellDef>Users</th>
                <td mat-cell *matCellDef="let element">
                  <div class="usage-cell" [class.exceeds]="element.maxUsers > 0 && element.userCount > element.maxUsers">
                    {{ element.userCount }}
                    @if (element.maxUsers > 0) {
                      <span class="limit">/ {{ element.maxUsers }}</span>
                    }
                  </div>
                </td>
              </ng-container>

              <!-- Tickets Column -->
              <ng-container matColumnDef="tickets">
                <th mat-header-cell *matHeaderCellDef>Tickets</th>
                <td mat-cell *matCellDef="let element">
                  <div class="usage-cell" [class.exceeds]="element.maxTickets > 0 && element.ticketCount > element.maxTickets">
                    {{ element.ticketCount }}
                    @if (element.maxTickets > 0) {
                      <span class="limit">/ {{ element.maxTickets }}</span>
                    }
                  </div>
                </td>
              </ng-container>

              <!-- Work Orders Column -->
              <ng-container matColumnDef="workOrders">
                <th mat-header-cell *matHeaderCellDef>Work Orders</th>
                <td mat-cell *matCellDef="let element">{{ element.workOrderCount }}</td>
              </ng-container>

              <!-- Storage Column -->
              <ng-container matColumnDef="storage">
                <th mat-header-cell *matHeaderCellDef>Storage (GB)</th>
                <td mat-cell *matCellDef="let element">
                  <div class="usage-cell" [class.exceeds]="element.maxStorageGb > 0 && element.storageUsedGb > element.maxStorageGb">
                    {{ element.storageUsedGb }}
                    @if (element.maxStorageGb > 0) {
                      <span class="limit">/ {{ element.maxStorageGb }}</span>
                    }
                  </div>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"
                  [class.exceeds-row]="row.exceedsLimits"></tr>
            </table>

            @if (usageData().length === 0) {
              <div class="no-data">
                <mat-icon>inbox</mat-icon>
                <p>No usage data available</p>
              </div>
            }
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .analytics-container {
      max-width: 1600px;
      margin: 0 auto;
      padding: 24px;
    }

    .header {
      margin-bottom: 32px;
    }

    h1 {
      font-size: 2rem;
      margin-bottom: 0.5rem;
    }

    .actions {
      display: flex;
      gap: 12px;
      margin-top: 16px;
    }

    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 24px;
      margin-bottom: 32px;
    }

    .summary-cards mat-card {
      padding: 16px;
    }

    mat-card-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    mat-icon {
      color: #667eea;
    }

    .warn-icon {
      color: #f59e0b !important;
    }

    .stat-value {
      font-size: 2.5rem;
      font-weight: 600;
      color: #333;
    }

    .stat-label {
      font-size: 0.875rem;
      color: #666;
      margin-top: 4px;
    }

    .table-card {
      padding: 16px;
    }

    .usage-table {
      width: 100%;
    }

    .org-cell {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .org-name {
      font-weight: 500;
    }

    .warning-icon {
      color: #f59e0b;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .usage-cell {
      display: flex;
      align-items: baseline;
      gap: 4px;
    }

    .usage-cell.exceeds {
      color: #dc2626;
      font-weight: 600;
    }

    .limit {
      color: #999;
      font-size: 0.875rem;
    }

    mat-chip {
      font-size: 0.75rem;
    }

    mat-chip.active {
      background: #dcfce7;
      color: #166534;
    }

    mat-chip.suspended {
      background: #fee2e2;
      color: #991b1b;
    }

    .exceeds-row {
      background: #fef3c7;
    }

    .loading-container,
    .error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
      gap: 16px;
    }

    .error-container mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #dc2626;
    }

    .no-data {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
      color: #999;
    }

    .no-data mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      margin-bottom: 16px;
      opacity: 0.5;
    }
  `]
})
export class UsageAnalyticsComponent implements OnInit {
  private analyticsService = inject(AnalyticsService);

  usageData = signal<OrganisationUsage[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  displayedColumns = ['organisation', 'plan', 'status', 'users', 'tickets', 'workOrders', 'storage'];

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);

    this.analyticsService.getUsageStats().subscribe({
      next: (response) => {
        if (response.data) {
          this.usageData.set(response.data.organisations);
        } else if (response.error) {
          this.error.set(response.error.message);
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load usage analytics:', err);
        this.error.set('Failed to load usage analytics. Please try again.');
        this.loading.set(false);
      }
    });
  }

  getExceedingCount(): number {
    return this.usageData().filter(o => o.exceedsLimits).length;
  }

  getTotalTickets(): number {
    return this.usageData().reduce((sum, o) => sum + o.ticketCount, 0);
  }

  getTotalWorkOrders(): number {
    return this.usageData().reduce((sum, o) => sum + o.workOrderCount, 0);
  }

  getTotalUsers(): number {
    return this.usageData().reduce((sum, o) => sum + o.userCount, 0);
  }

  exportToCSV(): void {
    const data = this.usageData();
    const headers = ['Organisation', 'Plan', 'Status', 'Users', 'Max Users', 'Tickets', 'Max Tickets', 'Work Orders', 'Storage (GB)', 'Max Storage (GB)', 'Exceeds Limits'];
    const rows = data.map(o => [
      o.organisationName,
      o.plan,
      o.status,
      o.userCount,
      o.maxUsers,
      o.ticketCount,
      o.maxTickets,
      o.workOrderCount,
      o.storageUsedGb,
      o.maxStorageGb,
      o.exceedsLimits ? 'Yes' : 'No'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `usage-analytics-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
