import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { BaseChartDirective } from 'ng2-charts';
import {
  Chart,
  ChartConfiguration,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { DashboardService, DashboardStats } from '../../../core/services/dashboard.service';

// Register Chart.js components
Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

@Component({
    selector: 'app-superadmin-dashboard',
    imports: [
        CommonModule,
        RouterLink,
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatChipsModule,
        BaseChartDirective
    ],
    template: `
    <div class="dashboard-container">
      <h1>Platform Administration</h1>
      <p>Real-time platform statistics and analytics</p>

      @if (loading()) {
        <div class="loading-container">
          <mat-spinner diameter="50"></mat-spinner>
          <p>Loading dashboard...</p>
        </div>
      } @else if (error()) {
        <div class="error-container">
          <mat-icon>error</mat-icon>
          <p>{{ error() }}</p>
          <button mat-raised-button color="primary" (click)="loadDashboard()">Retry</button>
        </div>
      } @else {
        <div class="cards-grid">
          <!-- Total Organisations -->
          <mat-card class="stat-card">
            <mat-card-header>
              <mat-icon>business</mat-icon>
              <mat-card-title>Total Organisations</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="stat-value">{{ stats()?.totalOrganisations ?? 0 }}</div>
              <div class="stat-label">
                {{ stats()?.activeOrganisations ?? 0 }} active,
                {{ stats()?.suspendedOrganisations ?? 0 }} suspended
              </div>
              @if (stats()?.organisationGrowthPercent) {
                <div class="growth-indicator" [class.positive]="(stats()?.organisationGrowthPercent ?? 0) > 0">
                  <mat-icon>{{ (stats()?.organisationGrowthPercent ?? 0) > 0 ? 'trending_up' : 'trending_down' }}</mat-icon>
                  {{ stats()?.organisationGrowthPercent }}% vs last month
                </div>
              }
            </mat-card-content>
            <mat-card-actions>
              <button mat-button routerLink="/superadmin/organisations">View All</button>
            </mat-card-actions>
          </mat-card>

          <!-- Total Users -->
          <mat-card class="stat-card">
            <mat-card-header>
              <mat-icon>people</mat-icon>
              <mat-card-title>Platform Users</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="stat-value">{{ stats()?.totalUsers ?? 0 }}</div>
              <div class="stat-label">{{ stats()?.activeUsers ?? 0 }} active users</div>
              @if (stats()?.userGrowthPercent) {
                <div class="growth-indicator" [class.positive]="(stats()?.userGrowthPercent ?? 0) > 0">
                  <mat-icon>{{ (stats()?.userGrowthPercent ?? 0) > 0 ? 'trending_up' : 'trending_down' }}</mat-icon>
                  {{ stats()?.userGrowthPercent }}% vs last month
                </div>
              }
            </mat-card-content>
          </mat-card>

          <!-- Users by Role -->
          <mat-card class="stat-card">
            <mat-card-header>
              <mat-icon>badge</mat-icon>
              <mat-card-title>Users by Role</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="role-chips">
                @for (role of getUserRoles(); track role.name) {
                  <mat-chip>{{ role.name }}: {{ role.count }}</mat-chip>
                }
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Organisations by Plan -->
          <mat-card class="stat-card">
            <mat-card-header>
              <mat-icon>workspace_premium</mat-icon>
              <mat-card-title>Organisations by Plan</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="plan-list">
                @for (plan of getOrgPlans(); track plan.name) {
                  <div class="plan-item">
                    <span class="plan-name">{{ plan.name }}</span>
                    <span class="plan-count">{{ plan.count }}</span>
                  </div>
                }
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Quick Actions -->
          <mat-card class="stat-card actions-card">
            <mat-card-header>
              <mat-icon>bolt</mat-icon>
              <mat-card-title>Quick Actions</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <button mat-raised-button color="primary" routerLink="/superadmin/organisations" class="action-button">
                <mat-icon>add</mat-icon>
                Create Organisation
              </button>
              <button mat-raised-button routerLink="/superadmin/platform-settings" class="action-button">
                <mat-icon>settings</mat-icon>
                Platform Settings
              </button>
              <button mat-raised-button routerLink="/admin/audit-logs" class="action-button">
                <mat-icon>history</mat-icon>
                Audit Logs
              </button>
            </mat-card-content>
          </mat-card>

          <!-- System Health -->
          <mat-card class="stat-card">
            <mat-card-header>
              <mat-icon>health_and_safety</mat-icon>
              <mat-card-title>System Health</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="health-status">
                <mat-icon class="health-icon healthy">check_circle</mat-icon>
                <span>All systems operational</span>
              </div>
            </mat-card-content>
            <mat-card-actions>
              <button mat-button>View Details</button>
            </mat-card-actions>
          </mat-card>
        </div>

        <!-- Growth Charts -->
        <div class="charts-section">
          <mat-card class="chart-card">
            <mat-card-header>
              <mat-icon>trending_up</mat-icon>
              <mat-card-title>Platform Growth (Last 30 Days)</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="chart-container">
                @if (growthChartData().labels && growthChartData().labels!.length > 0) {
                  <canvas
                    baseChart
                    [data]="growthChartData()"
                    [options]="growthChartOptions"
                    type="line">
                  </canvas>
                } @else {
                  <div class="no-data">
                    <mat-icon>insert_chart</mat-icon>
                    <p>No growth data available</p>
                  </div>
                }
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      }
    </div>
  `,
    styles: [`
    .dashboard-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 24px;
    }

    h1 {
      font-size: 2rem;
      margin-bottom: 0.5rem;
    }

    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 24px;
      margin-top: 32px;
    }

    .stat-card {
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
      font-size: 32px;
      width: 32px;
      height: 32px;
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

    .growth-indicator {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.875rem;
      color: #d32f2f;
      margin-top: 8px;
    }

    .growth-indicator.positive {
      color: #388e3c;
    }

    .growth-indicator mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .role-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .plan-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .plan-item {
      display: flex;
      justify-content: space-between;
      padding: 8px;
      background: #f5f5f5;
      border-radius: 4px;
    }

    .plan-name {
      font-weight: 500;
    }

    .plan-count {
      color: #667eea;
      font-weight: 600;
    }

    .actions-card .action-button {
      width: 100%;
      margin-bottom: 12px;
      justify-content: flex-start;
    }

    .actions-card .action-button:last-child {
      margin-bottom: 0;
    }

    mat-card-content {
      padding: 16px 0;
    }

    .health-status {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 1rem;
    }

    .health-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
    }

    .health-icon.healthy {
      color: #388e3c;
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
      color: #d32f2f;
    }

    .charts-section {
      margin-top: 32px;
    }

    .chart-card {
      padding: 16px;
    }

    .chart-container {
      height: 400px;
      position: relative;
      padding: 16px 0;
    }

    .no-data {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #999;
    }

    .no-data mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    .no-data p {
      font-size: 1rem;
      margin: 0;
    }
  `]
})
export class SuperAdminDashboardComponent implements OnInit {
  private dashboardService = inject(DashboardService);

  stats = signal<DashboardStats | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  // Chart configuration and data
  growthChartData = signal<ChartConfiguration<'line'>['data']>({
    labels: [],
    datasets: []
  });

  growthChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom'
      },
      tooltip: {
        mode: 'index',
        intersect: false
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Date'
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Count'
        },
        beginAtZero: true
      }
    }
  };

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading.set(true);
    this.error.set(null);

    // Load dashboard stats
    this.dashboardService.getDashboardStats().subscribe({
      next: (response) => {
        if (response.data) {
          this.stats.set(response.data);
        } else if (response.error) {
          this.error.set(response.error.message);
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load dashboard:', err);
        this.error.set('Failed to load dashboard statistics. Please try again.');
        this.loading.set(false);
      }
    });

    // Load growth data for charts
    this.dashboardService.getGrowthData(30).subscribe({
      next: (response) => {
        if (response.data) {
          this.processGrowthData(response.data);
        }
      },
      error: (err) => {
        console.error('Failed to load growth data:', err);
      }
    });
  }

  private processGrowthData(data: any): void {
    const labels = data.dataPoints.map((point: any) => {
      const date = new Date(point.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    const orgSignups = data.dataPoints.map((point: any) => point.organisationSignups);
    const userRegistrations = data.dataPoints.map((point: any) => point.userRegistrations);

    this.growthChartData.set({
      labels,
      datasets: [
        {
          label: 'Organisation Signups',
          data: orgSignups,
          borderColor: '#667eea',
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'User Registrations',
          data: userRegistrations,
          borderColor: '#764ba2',
          backgroundColor: 'rgba(118, 75, 162, 0.1)',
          fill: true,
          tension: 0.4
        }
      ]
    });
  }

  getUserRoles(): { name: string; count: number }[] {
    const usersByRole = this.stats()?.usersByRole ?? {};
    return Object.entries(usersByRole).map(([name, count]) => ({ name, count: count as number }));
  }

  getOrgPlans(): { name: string; count: number }[] {
    const orgsByPlan = this.stats()?.organisationsByPlan ?? {};
    return Object.entries(orgsByPlan).map(([name, count]) => ({ name, count: count as number }));
  }
}
