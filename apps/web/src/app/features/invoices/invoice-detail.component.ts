import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { InvoiceService, Invoice, LineItem } from './services/invoice.service';
import { WorkOrderService, WorkOrder } from '../work-orders/services/work-order.service';

@Component({
  selector: 'app-invoice-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatTableModule
  ],
  template: `
    <div class="invoice-detail-container">
      @if (loading()) {
        <div class="loading">
          <mat-spinner></mat-spinner>
        </div>
      } @else if (invoice()) {
        <div class="header">
          <button mat-icon-button routerLink="/invoices">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <h1>{{ invoice()!.invoiceNumber }}</h1>
          <div class="spacer"></div>
          <mat-chip [class]="'status-' + invoice()!.status.toLowerCase()">
            {{ invoice()!.status }}
          </mat-chip>
          @if (isOverdue()) {
            <mat-chip class="overdue-chip">
              <mat-icon>warning</mat-icon>
              Overdue
            </mat-chip>
          }
        </div>

        <div class="content-grid">
          <div class="main-content">
            <mat-card>
              <mat-card-header>
                <mat-card-title>Invoice Information</mat-card-title>
              </mat-card-header>

              <mat-card-content>
                <div class="info-section">
                  <h3>Financial Summary</h3>
                  <div class="financial-summary">
                    <div class="financial-row">
                      <span class="label">Subtotal:</span>
                      <span class="value">{{ invoice()!.subtotalGBP | currency:'GBP':'symbol':'1.2-2' }}</span>
                    </div>
                    <div class="financial-row">
                      <span class="label">VAT:</span>
                      <span class="value">{{ invoice()!.vatGBP | currency:'GBP':'symbol':'1.2-2' }}</span>
                    </div>
                    <mat-divider></mat-divider>
                    <div class="financial-row total">
                      <span class="label">Total:</span>
                      <span class="value">{{ invoice()!.totalGBP | currency:'GBP':'symbol':'1.2-2' }}</span>
                    </div>
                  </div>
                </div>

                @if (lineItems().length > 0) {
                  <mat-divider></mat-divider>
                  <div class="info-section">
                    <h3>Line Items</h3>
                    <table mat-table [dataSource]="lineItems()" class="line-items-table">
                      <ng-container matColumnDef="description">
                        <th mat-header-cell *matHeaderCellDef>Description</th>
                        <td mat-cell *matCellDef="let item">{{ item.description }}</td>
                      </ng-container>

                      <ng-container matColumnDef="quantity">
                        <th mat-header-cell *matHeaderCellDef>Qty</th>
                        <td mat-cell *matCellDef="let item">{{ item.quantity }}</td>
                      </ng-container>

                      <ng-container matColumnDef="unitPrice">
                        <th mat-header-cell *matHeaderCellDef>Unit Price</th>
                        <td mat-cell *matCellDef="let item">{{ item.unitPrice | currency:'GBP':'symbol':'1.2-2' }}</td>
                      </ng-container>

                      <ng-container matColumnDef="total">
                        <th mat-header-cell *matHeaderCellDef>Total</th>
                        <td mat-cell *matCellDef="let item">{{ item.total | currency:'GBP':'symbol':'1.2-2' }}</td>
                      </ng-container>

                      <tr mat-header-row *matHeaderRowDef="lineItemColumns"></tr>
                      <tr mat-row *matRowDef="let row; columns: lineItemColumns;"></tr>
                    </table>
                  </div>
                }

                <mat-divider></mat-divider>

                <div class="info-section">
                  <h3>Invoice Details</h3>
                  <div class="info-row">
                    <span class="label">Submitted By:</span>
                    <span class="value">{{ invoice()!.submittedByName }}</span>
                  </div>
                  @if (invoice()!.submittedAt) {
                    <div class="info-row">
                      <span class="label">Submitted At:</span>
                      <span class="value">{{ invoice()!.submittedAt | date:'medium' }}</span>
                    </div>
                  }
                  @if (invoice()!.dueDate) {
                    <div class="info-row">
                      <span class="label">Due Date:</span>
                      <span class="value" [class.overdue-text]="isOverdue()">
                        {{ invoice()!.dueDate | date:'medium' }}
                        @if (isOverdue()) {
                          <mat-icon class="warning-icon">warning</mat-icon>
                        }
                      </span>
                    </div>
                  }
                  @if (invoice()!.paidAt) {
                    <div class="info-row">
                      <span class="label">Paid At:</span>
                      <span class="value">{{ invoice()!.paidAt | date:'medium' }}</span>
                    </div>
                  }
                  @if (invoice()!.fileKey) {
                    <div class="info-row">
                      <span class="label">Invoice File:</span>
                      <span class="value">
                        <button mat-stroked-button color="primary">
                          <mat-icon>download</mat-icon>
                          Download PDF
                        </button>
                      </span>
                    </div>
                  }
                </div>
              </mat-card-content>
            </mat-card>

            @if (workOrder()) {
              <mat-card class="work-order-card">
                <mat-card-header>
                  <mat-card-title>Related Work Order</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="work-order-info">
                    <div class="info-row">
                      <span class="label">Work Order #:</span>
                      <span class="value">
                        <a [routerLink]="['/work-orders', workOrder()!.id]" class="link">
                          {{ workOrder()!.workOrderNumber }}
                        </a>
                      </span>
                    </div>
                    <div class="info-row">
                      <span class="label">Status:</span>
                      <span class="value">
                        <mat-chip [class]="'status-' + workOrder()!.status.toLowerCase()">
                          {{ workOrder()!.status }}
                        </mat-chip>
                      </span>
                    </div>
                    @if (workOrder()!.description) {
                      <div class="info-row">
                        <span class="label">Description:</span>
                        <span class="value">{{ workOrder()!.description }}</span>
                      </div>
                    }
                  </div>
                </mat-card-content>
              </mat-card>
            }
          </div>

          <div class="sidebar">
            @if (canApprove() || canMarkAsPaid()) {
              <mat-card class="actions-card">
                <mat-card-header>
                  <mat-card-title>Actions</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  @if (successMessage()) {
                    <div class="success-message">
                      <mat-icon>check_circle</mat-icon>
                      {{ successMessage() }}
                    </div>
                  }

                  @if (errorMessage()) {
                    <div class="error-message">
                      <mat-icon>error</mat-icon>
                      {{ errorMessage() }}
                    </div>
                  }

                  @if (canApprove()) {
                    <button
                      mat-raised-button
                      color="primary"
                      class="full-width"
                      (click)="onApprove()"
                      [disabled]="approving()">
                      @if (approving()) {
                        <mat-spinner diameter="20"></mat-spinner>
                      } @else {
                        <mat-icon>check</mat-icon>
                        Approve Invoice
                      }
                    </button>
                  }

                  @if (canMarkAsPaid()) {
                    <button
                      mat-raised-button
                      color="accent"
                      class="full-width"
                      (click)="onMarkAsPaid()"
                      [disabled]="markingPaid()">
                      @if (markingPaid()) {
                        <mat-spinner diameter="20"></mat-spinner>
                      } @else {
                        <mat-icon>payments</mat-icon>
                        Mark as Paid
                      }
                    </button>
                  }
                </mat-card-content>
              </mat-card>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .invoice-detail-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
    }

    .header h1 {
      margin: 0;
      font-size: 2rem;
    }

    .spacer {
      flex: 1;
    }

    .overdue-chip {
      background: #ff5252;
      color: #ffffff;
      font-weight: 600;
    }

    .overdue-chip mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: 48px;
    }

    .content-grid {
      display: grid;
      grid-template-columns: 1fr 350px;
      gap: 24px;
    }

    @media (max-width: 1024px) {
      .content-grid {
        grid-template-columns: 1fr;
      }
    }

    .main-content {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .info-section {
      margin: 24px 0;
    }

    .info-section h3 {
      margin: 0 0 16px 0;
      font-size: 1.125rem;
    }

    .info-row {
      display: flex;
      gap: 16px;
      margin-bottom: 12px;
      align-items: center;
    }

    .label {
      font-weight: 500;
      min-width: 120px;
      color: #666;
    }

    .value {
      flex: 1;
    }

    .financial-summary {
      background: #f5f5f5;
      padding: 16px;
      border-radius: 4px;
    }

    .financial-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 1rem;
    }

    .financial-row.total {
      margin-top: 12px;
      font-size: 1.25rem;
      font-weight: 600;
      color: #333;
    }

    .line-items-table {
      width: 100%;
      margin-top: 8px;
    }

    .link {
      color: #667eea;
      text-decoration: none;
      font-weight: 500;
    }

    .link:hover {
      text-decoration: underline;
    }

    .overdue-text {
      color: #c62828;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .warning-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .actions-card .mat-mdc-raised-button {
      margin-bottom: 16px;
    }

    .full-width {
      width: 100%;
    }

    .success-message {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      margin-bottom: 16px;
      background: #e8f5e9;
      color: #2e7d32;
      border-radius: 4px;
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      margin-bottom: 16px;
      background: #ffebee;
      color: #c62828;
      border-radius: 4px;
    }

    .status-draft { background: #e3f2fd; color: #1976d2; }
    .status-submitted, .status-underreview { background: #fff3e0; color: #ef6c00; }
    .status-approved { background: #e8f5e9; color: #2e7d32; }
    .status-paid { background: #1de9b6; color: #004d40; }
    .status-rejected, .status-cancelled { background: #ffebee; color: #c62828; }
    .status-overdue { background: #ff5252; color: #ffffff; }

    .status-pending { background: #e3f2fd; color: #1976d2; }
    .status-assigned, .status-scheduled { background: #fff3e0; color: #ef6c00; }
    .status-inprogress { background: #fce4ec; color: #c2185b; }
    .status-awaitingapproval { background: #f3e5f5; color: #7b1fa2; }
    .status-completed { background: #e8f5e9; color: #2e7d32; }
  `]
})
export class InvoiceDetailComponent implements OnInit {
  private invoiceService = inject(InvoiceService);
  private workOrderService = inject(WorkOrderService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  invoice = signal<Invoice | null>(null);
  workOrder = signal<WorkOrder | null>(null);
  lineItems = signal<LineItem[]>([]);
  loading = signal(true);
  approving = signal(false);
  markingPaid = signal(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  lineItemColumns = ['description', 'quantity', 'unitPrice', 'total'];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadInvoice(id);
    }
  }

  loadInvoice(id: string): void {
    this.loading.set(true);
    this.invoiceService.getInvoice(id).subscribe({
      next: (response) => {
        if (response.data) {
          this.invoice.set(response.data);
          // Parse line items if available (backend may return lineItemsJson)
          // Note: The backend InvoiceResponse doesn't include lineItemsJson, so this is optional
          this.loadWorkOrder(response.data.workOrderId);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.router.navigate(['/invoices']);
      }
    });
  }

  loadWorkOrder(workOrderId: string): void {
    this.workOrderService.getWorkOrder(workOrderId).subscribe({
      next: (response) => {
        if (response.data) {
          this.workOrder.set(response.data);
        }
      }
    });
  }

  canApprove(): boolean {
    const status = this.invoice()?.status;
    return status === 'Submitted' || status === 'UnderReview';
  }

  canMarkAsPaid(): boolean {
    const status = this.invoice()?.status;
    return status === 'Approved';
  }

  isOverdue(): boolean {
    const invoice = this.invoice();
    if (!invoice || !invoice.dueDate || invoice.status === 'Paid') {
      return false;
    }
    return new Date(invoice.dueDate) < new Date();
  }

  onApprove(): void {
    const invoiceId = this.invoice()?.id;
    if (!invoiceId) return;

    this.approving.set(true);
    this.successMessage.set(null);
    this.errorMessage.set(null);

    this.invoiceService.approveInvoice(invoiceId).subscribe({
      next: (response) => {
        if (response.data) {
          this.invoice.set(response.data);
          this.successMessage.set('Invoice approved successfully!');
        }
        this.approving.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to approve invoice. Please try again.');
        this.approving.set(false);
      }
    });
  }

  onMarkAsPaid(): void {
    const invoiceId = this.invoice()?.id;
    if (!invoiceId) return;

    this.markingPaid.set(true);
    this.successMessage.set(null);
    this.errorMessage.set(null);

    this.invoiceService.markAsPaid(invoiceId).subscribe({
      next: (response) => {
        if (response.data) {
          this.invoice.set(response.data);
          this.successMessage.set('Invoice marked as paid successfully!');
        }
        this.markingPaid.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to mark invoice as paid. Please try again.');
        this.markingPaid.set(false);
      }
    });
  }
}
