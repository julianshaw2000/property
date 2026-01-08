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
import { InvoiceService, Invoice } from './services/invoice.service';

@Component({
    selector: 'app-invoice-list',
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
    <div class="invoice-list-container">
      <div class="header">
        <h1>Invoices</h1>
      </div>

      <mat-card class="filters-card">
        <form [formGroup]="filterForm" class="filters">
          <mat-form-field appearance="outline">
            <mat-label>Status</mat-label>
            <mat-select formControlName="status" (selectionChange)="onFilterChange()">
              <mat-option value="">All</mat-option>
              <mat-option value="Draft">Draft</mat-option>
              <mat-option value="Submitted">Submitted</mat-option>
              <mat-option value="UnderReview">Under Review</mat-option>
              <mat-option value="Approved">Approved</mat-option>
              <mat-option value="Rejected">Rejected</mat-option>
              <mat-option value="Paid">Paid</mat-option>
              <mat-option value="Overdue">Overdue</mat-option>
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
          <table mat-table [dataSource]="invoices()" class="invoices-table">
            <ng-container matColumnDef="invoiceNumber">
              <th mat-header-cell *matHeaderCellDef>Invoice #</th>
              <td mat-cell *matCellDef="let invoice">
                <a [routerLink]="['/invoices', invoice.id]" class="invoice-link">
                  {{ invoice.invoiceNumber }}
                </a>
              </td>
            </ng-container>

            <ng-container matColumnDef="workOrderNumber">
              <th mat-header-cell *matHeaderCellDef>Work Order #</th>
              <td mat-cell *matCellDef="let invoice">
                <a [routerLink]="['/work-orders', invoice.workOrderId]" class="work-order-link">
                  {{ invoice.workOrderNumber }}
                </a>
              </td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let invoice">
                <mat-chip [class]="'status-' + invoice.status.toLowerCase()">
                  {{ invoice.status }}
                </mat-chip>
              </td>
            </ng-container>

            <ng-container matColumnDef="submittedBy">
              <th mat-header-cell *matHeaderCellDef>Submitted By</th>
              <td mat-cell *matCellDef="let invoice">
                {{ invoice.submittedByName }}
              </td>
            </ng-container>

            <ng-container matColumnDef="totalGBP">
              <th mat-header-cell *matHeaderCellDef>Total</th>
              <td mat-cell *matCellDef="let invoice">
                {{ invoice.totalGBP | currency:'GBP':'symbol':'1.2-2' }}
              </td>
            </ng-container>

            <ng-container matColumnDef="dueDate">
              <th mat-header-cell *matHeaderCellDef>Due Date</th>
              <td mat-cell *matCellDef="let invoice">
                @if (invoice.dueDate) {
                  <span [class.overdue-text]="isOverdue(invoice)">
                    {{ invoice.dueDate | date:'short' }}
                    @if (isOverdue(invoice)) {
                      <mat-icon class="overdue-icon">warning</mat-icon>
                    }
                  </span>
                } @else {
                  -
                }
              </td>
            </ng-container>

            <ng-container matColumnDef="paidAt">
              <th mat-header-cell *matHeaderCellDef>Paid At</th>
              <td mat-cell *matCellDef="let invoice">
                {{ invoice.paidAt ? (invoice.paidAt | date:'short') : '-' }}
              </td>
            </ng-container>

            <ng-container matColumnDef="created">
              <th mat-header-cell *matHeaderCellDef>Created</th>
              <td mat-cell *matCellDef="let invoice">
                {{ invoice.createdAt | date:'short' }}
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="invoice-row"></tr>
          </table>

          @if (invoices().length === 0) {
            <div class="no-data">
              <mat-icon>receipt</mat-icon>
              <p>No invoices found</p>
            </div>
          }
        </mat-card>
      }
    </div>
  `,
    styles: [`
    .invoice-list-container {
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

    .invoices-table {
      width: 100%;
    }

    .invoice-link, .work-order-link {
      color: #667eea;
      text-decoration: none;
      font-weight: 500;
    }

    .invoice-link:hover, .work-order-link:hover {
      text-decoration: underline;
    }

    .overdue-text {
      color: #c62828;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .overdue-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .status-draft {
      background: #e3f2fd;
      color: #1976d2;
    }

    .status-submitted, .status-underreview {
      background: #fff3e0;
      color: #ef6c00;
    }

    .status-approved {
      background: #e8f5e9;
      color: #2e7d32;
    }

    .status-paid {
      background: #1de9b6;
      color: #004d40;
    }

    .status-rejected, .status-cancelled {
      background: #ffebee;
      color: #c62828;
    }

    .status-overdue {
      background: #ff5252;
      color: #ffffff;
    }

    .invoice-row {
      cursor: pointer;
    }

    .invoice-row:hover {
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
export class InvoiceListComponent implements OnInit {
  private invoiceService = inject(InvoiceService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  invoices = signal<Invoice[]>([]);
  loading = signal(true);
  displayedColumns = ['invoiceNumber', 'workOrderNumber', 'status', 'submittedBy', 'totalGBP', 'dueDate', 'paidAt', 'created'];

  filterForm = this.fb.group({
    status: ['']
  });

  ngOnInit(): void {
    this.loadInvoices();
  }

  loadInvoices(): void {
    this.loading.set(true);

    this.invoiceService.listInvoices().subscribe({
      next: (response) => {
        if (response.data) {
          this.invoices.set(response.data);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  onFilterChange(): void {
    this.loadInvoices();
  }

  isOverdue(invoice: Invoice): boolean {
    if (!invoice.dueDate || invoice.status === 'Paid') {
      return false;
    }
    return new Date(invoice.dueDate) < new Date();
  }
}
