import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatGridListModule } from '@angular/material/grid-list';
import { TicketService, Ticket } from '../tickets/services/ticket.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-dashboard',
    imports: [
        CommonModule,
        RouterLink,
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatGridListModule
    ],
    template: `
    <div class="dashboard-container">
      <div class="welcome">
        <h1>Welcome to MaintainUK</h1>
        <p>Manage your property maintenance with ease</p>
      </div>

      <div class="stats-grid">
        <mat-card class="stat-card">
          <div class="stat-content">
            <mat-icon class="stat-icon new">confirmation_number</mat-icon>
            <div class="stat-details">
              <div class="stat-value">{{ stats().new }}</div>
              <div class="stat-label">New Tickets</div>
            </div>
          </div>
          <button mat-button color="primary" routerLink="/app/tickets">View All</button>
        </mat-card>

        <mat-card class="stat-card">
          <div class="stat-content">
            <mat-icon class="stat-icon progress">build</mat-icon>
            <div class="stat-details">
              <div class="stat-value">{{ stats().inProgress }}</div>
              <div class="stat-label">In Progress</div>
            </div>
          </div>
          <button mat-button color="primary" routerLink="/app/tickets">View All</button>
        </mat-card>

        <mat-card class="stat-card">
          <div class="stat-content">
            <mat-icon class="stat-icon urgent">warning</mat-icon>
            <div class="stat-details">
              <div class="stat-value">{{ stats().urgent }}</div>
              <div class="stat-label">Urgent</div>
            </div>
          </div>
          <button mat-button color="primary" routerLink="/app/tickets">View All</button>
        </mat-card>

        <mat-card class="stat-card">
          <div class="stat-content">
            <mat-icon class="stat-icon completed">check_circle</mat-icon>
            <div class="stat-details">
              <div class="stat-value">{{ stats().completed }}</div>
              <div class="stat-label">Completed</div>
            </div>
          </div>
          <button mat-button color="primary" routerLink="/app/tickets">View All</button>
        </mat-card>
      </div>

      <div class="recent-section">
        <mat-card>
          <mat-card-header>
            <mat-card-title>Recent Tickets</mat-card-title>
            <button mat-button routerLink="/app/tickets/create" color="primary">
              <mat-icon>add</mat-icon>
              New Ticket
            </button>
          </mat-card-header>
          <mat-card-content>
            @if (recentTickets().length > 0) {
              <div class="tickets-list">
                @for (ticket of recentTickets(); track ticket.id) {
                  <div class="ticket-item" [routerLink]="['/tickets', ticket.id]">
                    <div class="ticket-info">
                      <div class="ticket-number">{{ ticket.ticketNumber }}</div>
                      <div class="ticket-title">{{ ticket.title }}</div>
                      <div class="ticket-property">{{ ticket.propertyAddress }}</div>
                    </div>
                    <div class="ticket-badges">
                      <span class="badge" [class]="'priority-' + ticket.priority.toLowerCase()">
                        {{ ticket.priority }}
                      </span>
                      <span class="badge" [class]="'status-' + ticket.status.toLowerCase()">
                        {{ ticket.status }}
                      </span>
                    </div>
                  </div>
                }
              </div>
            } @else {
              <div class="empty-state">
                <mat-icon>inbox</mat-icon>
                <p>No tickets yet. Create your first ticket to get started.</p>
                <button mat-raised-button color="primary" routerLink="/app/tickets/create">
                  Create Ticket
                </button>
              </div>
            }
          </mat-card-content>
        </mat-card>
      </div>

      <div class="quick-actions">
        <h2>Quick Actions</h2>
        <div class="actions-grid">
          <mat-card class="action-card" routerLink="/app/tickets/create">
            <mat-icon>add_circle</mat-icon>
            <h3>Create Ticket</h3>
            <p>Report a new maintenance issue</p>
          </mat-card>

          <mat-card class="action-card" routerLink="/app/tickets">
            <mat-icon>list</mat-icon>
            <h3>View Tickets</h3>
            <p>See all maintenance tickets</p>
          </mat-card>

          <mat-card class="action-card" routerLink="/app/work-orders">
            <mat-icon>build_circle</mat-icon>
            <h3>Work Orders</h3>
            <p>Manage work orders</p>
          </mat-card>

          <mat-card class="action-card" routerLink="/app/invoices">
            <mat-icon>receipt</mat-icon>
            <h3>Invoices</h3>
            <p>Track payments</p>
          </mat-card>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .dashboard-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .welcome {
      margin-bottom: 32px;
    }

    .welcome h1 {
      font-size: 2.5rem;
      margin: 0 0 8px 0;
      font-weight: 500;
    }

    .welcome p {
      font-size: 1.125rem;
      color: #666;
      margin: 0;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 24px;
      margin-bottom: 32px;
    }

    .stat-card {
      padding: 24px;
    }

    .stat-content {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 16px;
    }

    .stat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
    }

    .stat-icon.new { color: #2196f3; }
    .stat-icon.progress { color: #ff9800; }
    .stat-icon.urgent { color: #f44336; }
    .stat-icon.completed { color: #4caf50; }

    .stat-details {
      flex: 1;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 600;
      line-height: 1;
    }

    .stat-label {
      font-size: 0.875rem;
      color: #666;
      margin-top: 4px;
    }

    .recent-section {
      margin-bottom: 32px;
    }

    mat-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .tickets-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .ticket-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .ticket-item:hover {
      background: #f5f5f5;
      border-color: #667eea;
    }

    .ticket-info {
      flex: 1;
    }

    .ticket-number {
      font-weight: 600;
      color: #667eea;
      margin-bottom: 4px;
    }

    .ticket-title {
      font-size: 1rem;
      margin-bottom: 4px;
    }

    .ticket-property {
      font-size: 0.875rem;
      color: #666;
    }

    .ticket-badges {
      display: flex;
      gap: 8px;
    }

    .badge {
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .priority-routine { background: #e8f5e9; color: #2e7d32; }
    .priority-urgent { background: #fff3e0; color: #ef6c00; }
    .priority-emergency { background: #ffebee; color: #c62828; }

    .status-new, .status-open { background: #e3f2fd; color: #1976d2; }
    .status-assigned, .status-in_progress { background: #fff3e0; color: #ef6c00; }
    .status-resolved, .status-closed { background: #e8f5e9; color: #2e7d32; }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px;
      color: #999;
    }

    .empty-state mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      margin-bottom: 16px;
    }

    .quick-actions {
      margin-top: 32px;
    }

    .quick-actions h2 {
      margin-bottom: 16px;
    }

    .actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }

    .action-card {
      padding: 24px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
    }

    .action-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .action-card mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #667eea;
      margin-bottom: 8px;
    }

    .action-card h3 {
      margin: 0 0 8px 0;
      font-size: 1.125rem;
    }

    .action-card p {
      margin: 0;
      font-size: 0.875rem;
      color: #666;
    }
  `]
})
export class DashboardComponent implements OnInit {
  private ticketService = inject(TicketService);
  authService = inject(AuthService);

  stats = signal({
    new: 0,
    inProgress: 0,
    urgent: 0,
    completed: 0
  });

  recentTickets = signal<Ticket[]>([]);

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.ticketService.listTickets({ take: 10 }).subscribe({
      next: (response) => {
        if (response.data) {
          this.recentTickets.set(response.data.slice(0, 5));
          this.calculateStats(response.data);
        }
      }
    });
  }

  calculateStats(tickets: Ticket[]): void {
    this.stats.set({
      new: tickets.filter(t => t.status === 'NEW' || t.status === 'Open').length,
      inProgress: tickets.filter(t => t.status === 'IN_PROGRESS' || t.status === 'ASSIGNED').length,
      urgent: tickets.filter(t => t.priority === 'URGENT' || t.priority === 'EMERGENCY').length,
      completed: tickets.filter(t => t.status === 'Resolved' || t.status === 'CLOSED').length
    });
  }
}

