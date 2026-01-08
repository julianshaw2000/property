import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { QuoteService, Quote, LineItem } from './services/quote.service';
import { WorkOrderService, WorkOrder } from '../work-orders/services/work-order.service';

@Component({
    selector: 'app-quote-detail',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterLink,
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatChipsModule,
        MatProgressSpinnerModule,
        MatFormFieldModule,
        MatInputModule,
        MatDividerModule,
        MatTableModule
    ],
    template: `
    <div class="quote-detail-container">
      @if (loading()) {
        <div class="loading">
          <mat-spinner></mat-spinner>
        </div>
      } @else if (quote()) {
        <div class="header">
          <button mat-icon-button routerLink="/quotes">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <h1>{{ quote()!.quoteNumber }}</h1>
          <div class="spacer"></div>
          <mat-chip [class]="'status-' + quote()!.status.toLowerCase()">
            {{ quote()!.status }}
          </mat-chip>
        </div>

        <div class="content-grid">
          <div class="main-content">
            <mat-card>
              <mat-card-header>
                <mat-card-title>Quote Information</mat-card-title>
              </mat-card-header>

              <mat-card-content>
                <div class="info-section">
                  <h3>Financial Summary</h3>
                  <div class="financial-summary">
                    <div class="financial-row">
                      <span class="label">Subtotal:</span>
                      <span class="value">{{ quote()!.subtotalGBP | currency:'GBP':'symbol':'1.2-2' }}</span>
                    </div>
                    <div class="financial-row">
                      <span class="label">VAT:</span>
                      <span class="value">{{ quote()!.vatGBP | currency:'GBP':'symbol':'1.2-2' }}</span>
                    </div>
                    <mat-divider></mat-divider>
                    <div class="financial-row total">
                      <span class="label">Total:</span>
                      <span class="value">{{ quote()!.totalGBP | currency:'GBP':'symbol':'1.2-2' }}</span>
                    </div>
                  </div>
                </div>

                <mat-divider></mat-divider>

                <div class="info-section">
                  <h3>Line Items</h3>
                  @if (lineItems().length > 0) {
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
                  } @else {
                    <p class="no-items">No line items available</p>
                  }
                </div>

                @if (quote()!.notes) {
                  <mat-divider></mat-divider>
                  <div class="info-section">
                    <h3>Notes</h3>
                    <p>{{ quote()!.notes }}</p>
                  </div>
                }

                <mat-divider></mat-divider>

                <div class="info-section">
                  <h3>Quote Details</h3>
                  <div class="info-row">
                    <span class="label">Submitted By:</span>
                    <span class="value">{{ quote()!.submittedByEmail }}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">Submitted At:</span>
                    <span class="value">{{ quote()!.submittedAt | date:'medium' }}</span>
                  </div>
                  @if (quote()!.expiresAt) {
                    <div class="info-row">
                      <span class="label">Expires At:</span>
                      <span class="value" [class.expired]="isExpired()">
                        {{ quote()!.expiresAt | date:'medium' }}
                        @if (isExpired()) {
                          <mat-icon class="warning-icon">warning</mat-icon>
                        }
                      </span>
                    </div>
                  }
                  @if (quote()!.reviewedAt) {
                    <div class="info-row">
                      <span class="label">Reviewed At:</span>
                      <span class="value">{{ quote()!.reviewedAt | date:'medium' }}</span>
                    </div>
                  }
                </div>

                @if (quote()!.reviewNotes) {
                  <mat-divider></mat-divider>
                  <div class="info-section">
                    <h3>Review Notes</h3>
                    <p class="review-notes">{{ quote()!.reviewNotes }}</p>
                  </div>
                }
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
            @if (canApproveOrReject()) {
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
                    }
                    Approve Quote
                  </button>

                  <mat-divider></mat-divider>

                  <h4>Reject Quote</h4>
                  <form [formGroup]="rejectForm" (ngSubmit)="onReject()">
                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Rejection Reason</mat-label>
                      <textarea
                        matInput
                        formControlName="reviewNotes"
                        rows="4"
                        placeholder="Explain why this quote is being rejected..."></textarea>
                      <mat-error>Rejection reason is required</mat-error>
                    </mat-form-field>

                    <button
                      mat-raised-button
                      color="warn"
                      type="submit"
                      class="full-width"
                      [disabled]="rejectForm.invalid || rejecting()">
                      @if (rejecting()) {
                        <mat-spinner diameter="20"></mat-spinner>
                      } @else {
                        <mat-icon>close</mat-icon>
                      }
                      Reject Quote
                    </button>
                  </form>
                </mat-card-content>
              </mat-card>
            }
          </div>
        </div>
      }
    </div>
  `,
    styles: [`
    .quote-detail-container {
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

    .info-section h3, .actions-card h4 {
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

    .no-items {
      color: #999;
      font-style: italic;
      margin: 0;
    }

    .link {
      color: #667eea;
      text-decoration: none;
      font-weight: 500;
    }

    .link:hover {
      text-decoration: underline;
    }

    .expired {
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

    .review-notes {
      background: #fff3e0;
      padding: 12px;
      border-left: 4px solid #ef6c00;
      margin: 0;
    }

    .actions-card form {
      display: flex;
      flex-direction: column;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
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
    .status-rejected { background: #ffebee; color: #c62828; }
    .status-expired { background: #fafafa; color: #757575; }

    .status-pending { background: #e3f2fd; color: #1976d2; }
    .status-assigned, .status-scheduled { background: #fff3e0; color: #ef6c00; }
    .status-inprogress { background: #fce4ec; color: #c2185b; }
    .status-awaitingapproval { background: #f3e5f5; color: #7b1fa2; }
    .status-completed { background: #e8f5e9; color: #2e7d32; }
    .status-cancelled { background: #fafafa; color: #757575; }
  `]
})
export class QuoteDetailComponent implements OnInit {
  private quoteService = inject(QuoteService);
  private workOrderService = inject(WorkOrderService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  quote = signal<Quote | null>(null);
  workOrder = signal<WorkOrder | null>(null);
  lineItems = signal<LineItem[]>([]);
  loading = signal(true);
  approving = signal(false);
  rejecting = signal(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  lineItemColumns = ['description', 'quantity', 'unitPrice', 'total'];

  rejectForm = this.fb.group({
    reviewNotes: ['', Validators.required]
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadQuote(id);
    }
  }

  loadQuote(id: string): void {
    this.loading.set(true);
    this.quoteService.getQuote(id).subscribe({
      next: (response) => {
        if (response.data) {
          this.quote.set(response.data);
          this.parseLineItems(response.data.lineItemsJson);
          this.loadWorkOrder(response.data.workOrderId);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.router.navigate(['/quotes']);
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

  parseLineItems(lineItemsJson: string): void {
    try {
      const items = JSON.parse(lineItemsJson);
      this.lineItems.set(Array.isArray(items) ? items : []);
    } catch {
      this.lineItems.set([]);
    }
  }

  canApproveOrReject(): boolean {
    const status = this.quote()?.status;
    return status === 'Submitted' || status === 'UnderReview';
  }

  isExpired(): boolean {
    const expiresAt = this.quote()?.expiresAt;
    return expiresAt ? new Date(expiresAt) < new Date() : false;
  }

  onApprove(): void {
    const quoteId = this.quote()?.id;
    if (!quoteId) return;

    this.approving.set(true);
    this.successMessage.set(null);
    this.errorMessage.set(null);

    this.quoteService.approveQuote(quoteId).subscribe({
      next: (response) => {
        if (response.data) {
          this.quote.set(response.data);
          this.successMessage.set('Quote approved successfully!');
        }
        this.approving.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to approve quote. Please try again.');
        this.approving.set(false);
      }
    });
  }

  onReject(): void {
    if (this.rejectForm.invalid) return;

    const quoteId = this.quote()?.id;
    if (!quoteId) return;

    this.rejecting.set(true);
    this.successMessage.set(null);
    this.errorMessage.set(null);

    this.quoteService.rejectQuote(quoteId, this.rejectForm.value as any).subscribe({
      next: (response) => {
        if (response.data) {
          this.quote.set(response.data);
          this.successMessage.set('Quote rejected successfully.');
          this.rejectForm.reset();
        }
        this.rejecting.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to reject quote. Please try again.');
        this.rejecting.set(false);
      }
    });
  }
}
