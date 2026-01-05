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
import { WorkOrderService, WorkOrder } from './services/work-order.service';

@Component({
  selector: 'app-work-order-list',
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
    <div class="work-order-list-container">
      <div class="header">
        <h1>Work Orders</h1>
        <button mat-raised-button color="primary" routerLink="/work-orders/create">
          <mat-icon>add</mat-icon>
          New Work Order
        </button>
      </div>

      <mat-card class="filters-card">
        <form [formGroup]="filterForm" class="filters">
          <mat-form-field appearance="outline">
            <mat-label>Status</mat-label>
            <mat-select formControlName="status" (selectionChange)="onFilterChange()">
              <mat-option value="">All</mat-option>
              <mat-option value="Draft">Draft</mat-option>
              <mat-option value="Pending">Pending</mat-option>
              <mat-option value="Assigned">Assigned</mat-option>
              <mat-option value="Scheduled">Scheduled</mat-option>
              <mat-option value="InProgress">In Progress</mat-option>
              <mat-option value="AwaitingApproval">Awaiting Approval</mat-option>
              <mat-option value="Completed">Completed</mat-option>
              <mat-option value="Cancelled">Cancelled</mat-option>
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
          <table mat-table [dataSource]="workOrders()" class="work-orders-table">
            <ng-container matColumnDef="workOrderNumber">
              <th mat-header-cell *matHeaderCellDef>Work Order #</th>
              <td mat-cell *matCellDef="let wo">
                <a [routerLink]="['/work-orders', wo.id]" class="work-order-link">
                  {{ wo.workOrderNumber }}
                </a>
              </td>
            </ng-container>

            <ng-container matColumnDef="ticketNumber">
              <th mat-header-cell *matHeaderCellDef>Ticket #</th>
              <td mat-cell *matCellDef="let wo">
                <a [routerLink]="['/tickets', wo.ticketId]" class="ticket-link">
                  {{ wo.ticketNumber }}
                </a>
              </td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let wo">
                <mat-chip [class]="'status-' + wo.status.toLowerCase()">
                  {{ wo.status }}
                </mat-chip>
              </td>
            </ng-container>

            <ng-container matColumnDef="contractor">
              <th mat-header-cell *matHeaderCellDef>Contractor</th>
              <td mat-cell *matCellDef="let wo">
                {{ wo.assignedContractorName || 'Not assigned' }}
              </td>
            </ng-container>

            <ng-container matColumnDef="scheduledStart">
              <th mat-header-cell *matHeaderCellDef>Scheduled Start</th>
              <td mat-cell *matCellDef="let wo">
                {{ wo.scheduledStartDate ? (wo.scheduledStartDate | date:'short') : '-' }}
              </td>
            </ng-container>

            <ng-container matColumnDef="created">
              <th mat-header-cell *matHeaderCellDef>Created</th>
              <td mat-cell *matCellDef="let wo">
                {{ wo.createdAt | date:'short' }}
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="work-order-row"></tr>
          </table>

          @if (workOrders().length === 0) {
            <div class="no-data">
              <mat-icon>build_circle</mat-icon>
              <p>No work orders found</p>
              <button mat-raised-button color="primary" routerLink="/work-orders/create">
                Create First Work Order
              </button>
            </div>
          }
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .work-order-list-container {
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

    .work-orders-table {
      width: 100%;
    }

    .work-order-link, .ticket-link {
      color: #667eea;
      text-decoration: none;
      font-weight: 500;
    }

    .work-order-link:hover, .ticket-link:hover {
      text-decoration: underline;
    }

    .status-draft, .status-pending {
      background: #e3f2fd;
      color: #1976d2;
    }

    .status-assigned, .status-scheduled {
      background: #fff3e0;
      color: #ef6c00;
    }

    .status-inprogress {
      background: #fce4ec;
      color: #c2185b;
    }

    .status-awaitingapproval {
      background: #f3e5f5;
      color: #7b1fa2;
    }

    .status-completed {
      background: #e8f5e9;
      color: #2e7d32;
    }

    .status-cancelled {
      background: #fafafa;
      color: #757575;
    }

    .work-order-row {
      cursor: pointer;
    }

    .work-order-row:hover {
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
export class WorkOrderListComponent implements OnInit {
  private workOrderService = inject(WorkOrderService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  workOrders = signal<WorkOrder[]>([]);
  loading = signal(true);
  displayedColumns = ['workOrderNumber', 'ticketNumber', 'status', 'contractor', 'scheduledStart', 'created'];

  filterForm = this.fb.group({
    status: ['']
  });

  ngOnInit(): void {
    this.loadWorkOrders();
  }

  loadWorkOrders(): void {
    this.loading.set(true);
    const filters = this.filterForm.value;

    this.workOrderService.listWorkOrders({
      status: filters.status || undefined
    }).subscribe({
      next: (response) => {
        if (response.data) {
          this.workOrders.set(response.data);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  onFilterChange(): void {
    this.loadWorkOrders();
  }
}
