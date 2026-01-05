import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TicketService, Ticket } from '../services/ticket.service';

@Component({
  selector: 'app-ticket-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatTableModule,
    MatChipsModule,
    MatSelectModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="ticket-list-container">
      <div class="header">
        <h1>Maintenance Tickets</h1>
        <button mat-raised-button color="primary" routerLink="/tickets/create">
          <mat-icon>add</mat-icon>
          New Ticket
        </button>
      </div>

      <mat-card class="filters-card">
        <form [formGroup]="filterForm" class="filters">
          <mat-form-field appearance="outline">
            <mat-label>Status</mat-label>
            <mat-select formControlName="status" (selectionChange)="onFilterChange()">
              <mat-option value="">All</mat-option>
              <mat-option value="NEW">New</mat-option>
              <mat-option value="Open">Open</mat-option>
              <mat-option value="ASSIGNED">Assigned</mat-option>
              <mat-option value="IN_PROGRESS">In Progress</mat-option>
              <mat-option value="Resolved">Resolved</mat-option>
              <mat-option value="CLOSED">Closed</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Priority</mat-label>
            <mat-select formControlName="priority" (selectionChange)="onFilterChange()">
              <mat-option value="">All</mat-option>
              <mat-option value="ROUTINE">Routine</mat-option>
              <mat-option value="URGENT">Urgent</mat-option>
              <mat-option value="EMERGENCY">Emergency</mat-option>
            </mat-select>
          </mat-form-field>
        </form>
      </mat-card>

      @if (loading()) {
        <div class="loading">
          <mat-spinner></mat-spinner>
        </div>
      } @else {
        <mat-card class="table-card">
          <table mat-table [dataSource]="tickets()" class="tickets-table">
            <ng-container matColumnDef="ticketNumber">
              <th mat-header-cell *matHeaderCellDef>Ticket #</th>
              <td mat-cell *matCellDef="let ticket">
                <a [routerLink]="['/tickets', ticket.id]" class="ticket-link">
                  {{ ticket.ticketNumber }}
                </a>
              </td>
            </ng-container>

            <ng-container matColumnDef="title">
              <th mat-header-cell *matHeaderCellDef>Title</th>
              <td mat-cell *matCellDef="let ticket">{{ ticket.title }}</td>
            </ng-container>

            <ng-container matColumnDef="property">
              <th mat-header-cell *matHeaderCellDef>Property</th>
              <td mat-cell *matCellDef="let ticket">
                <div class="property-info">
                  <div class="unit-name">{{ ticket.unitName }}</div>
                  <div class="address">{{ ticket.propertyAddress }}</div>
                </div>
              </td>
            </ng-container>

            <ng-container matColumnDef="category">
              <th mat-header-cell *matHeaderCellDef>Category</th>
              <td mat-cell *matCellDef="let ticket">
                <mat-chip class="category-chip">{{ ticket.category }}</mat-chip>
              </td>
            </ng-container>

            <ng-container matColumnDef="priority">
              <th mat-header-cell *matHeaderCellDef>Priority</th>
              <td mat-cell *matCellDef="let ticket">
                <mat-chip [class]="'priority-' + ticket.priority.toLowerCase()">
                  {{ ticket.priority }}
                </mat-chip>
              </td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let ticket">
                <mat-chip [class]="'status-' + ticket.status.toLowerCase()">
                  {{ ticket.status }}
                </mat-chip>
              </td>
            </ng-container>

            <ng-container matColumnDef="created">
              <th mat-header-cell *matHeaderCellDef>Created</th>
              <td mat-cell *matCellDef="let ticket">
                {{ ticket.createdAt | date:'short' }}
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="ticket-row"></tr>
          </table>

          @if (tickets().length === 0) {
            <div class="no-data">
              <mat-icon>inbox</mat-icon>
              <p>No tickets found</p>
              <button mat-raised-button color="primary" routerLink="/tickets/create">
                Create First Ticket
              </button>
            </div>
          }
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .ticket-list-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    h1 {
      margin: 0;
      font-size: 2rem;
      font-weight: 500;
    }

    .filters-card {
      margin-bottom: 24px;
    }

    .filters {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }

    .filters mat-form-field {
      flex: 1;
      min-width: 200px;
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: 48px;
    }

    .table-card {
      overflow-x: auto;
    }

    .tickets-table {
      width: 100%;
    }

    .ticket-link {
      color: #667eea;
      text-decoration: none;
      font-weight: 500;
    }

    .ticket-link:hover {
      text-decoration: underline;
    }

    .property-info {
      display: flex;
      flex-direction: column;
    }

    .unit-name {
      font-weight: 500;
    }

    .address {
      font-size: 0.875rem;
      color: #666;
    }

    .category-chip {
      background: #e3f2fd;
      color: #1976d2;
    }

    .priority-routine {
      background: #e8f5e9;
      color: #2e7d32;
    }

    .priority-urgent {
      background: #fff3e0;
      color: #ef6c00;
    }

    .priority-emergency {
      background: #ffebee;
      color: #c62828;
    }

    .status-new, .status-open {
      background: #e3f2fd;
      color: #1976d2;
    }

    .status-assigned, .status-in_progress {
      background: #fff3e0;
      color: #ef6c00;
    }

    .status-resolved, .status-closed {
      background: #e8f5e9;
      color: #2e7d32;
    }

    .ticket-row {
      cursor: pointer;
    }

    .ticket-row:hover {
      background: #f5f5f5;
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
    }

    .no-data p {
      font-size: 1.25rem;
      margin-bottom: 24px;
    }
  `]
})
export class TicketListComponent implements OnInit {
  private ticketService = inject(TicketService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  tickets = signal<Ticket[]>([]);
  loading = signal(true);
  displayedColumns = ['ticketNumber', 'title', 'property', 'category', 'priority', 'status', 'created'];

  filterForm = this.fb.group({
    status: [''],
    priority: ['']
  });

  ngOnInit(): void {
    this.loadTickets();
  }

  loadTickets(): void {
    this.loading.set(true);
    const filters = this.filterForm.value;

    this.ticketService.listTickets({
      status: filters.status || undefined,
      priority: filters.priority || undefined
    }).subscribe({
      next: (response) => {
        if (response.data) {
          this.tickets.set(response.data);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  onFilterChange(): void {
    this.loadTickets();
  }
}

