import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { WorkOrderService, WorkOrder } from './services/work-order.service';
import { TicketService, TicketDetail } from '../tickets/services/ticket.service';
import { ContractorService, Contractor } from '../../core/services/contractor.service';
import { QuoteService, Quote } from '../quotes/services/quote.service';
import { InvoiceService, Invoice } from '../invoices/services/invoice.service';

@Component({
    selector: 'app-work-order-detail',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterLink,
        MatCardModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatChipsModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatDividerModule
    ],
    template: `
    <div class="work-order-detail-container">
      @if (loading()) {
        <div class="loading">
          <mat-spinner></mat-spinner>
        </div>
      } @else if (workOrder()) {
        <div class="header">
          <div class="title-section">
            <button mat-icon-button routerLink="/work-orders">
              <mat-icon>arrow_back</mat-icon>
            </button>
            <h1>{{ workOrder()!.workOrderNumber }}</h1>
            <mat-chip [class]="'status-' + workOrder()!.status.toLowerCase()">
              {{ workOrder()!.status }}
            </mat-chip>
          </div>
        </div>

        <div class="content-grid">
          <div class="main-content">
            <mat-card class="info-card">
              <mat-card-header>
                <mat-card-title>Work Order Information</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="info-grid">
                  <div class="info-item">
                    <label>Work Order Number</label>
                    <div class="value">{{ workOrder()!.workOrderNumber }}</div>
                  </div>

                  <div class="info-item">
                    <label>Status</label>
                    <div class="value">
                      <mat-chip [class]="'status-' + workOrder()!.status.toLowerCase()">
                        {{ workOrder()!.status }}
                      </mat-chip>
                    </div>
                  </div>

                  <div class="info-item full-width">
                    <label>Description</label>
                    <div class="value">{{ workOrder()!.description || 'No description provided' }}</div>
                  </div>

                  <div class="info-item">
                    <label>Assigned Contractor</label>
                    <div class="value">{{ workOrder()!.assignedContractorName || 'Not assigned' }}</div>
                  </div>

                  <div class="info-item">
                    <label>Scheduled Start</label>
                    <div class="value">
                      {{ workOrder()!.scheduledStartDate ? (workOrder()!.scheduledStartDate | date:'medium') : 'Not scheduled' }}
                    </div>
                  </div>

                  <div class="info-item">
                    <label>Scheduled End</label>
                    <div class="value">
                      {{ workOrder()!.scheduledEndDate ? (workOrder()!.scheduledEndDate | date:'medium') : 'Not set' }}
                    </div>
                  </div>

                  <div class="info-item">
                    <label>Actual Start</label>
                    <div class="value">
                      {{ workOrder()!.actualStartDate ? (workOrder()!.actualStartDate | date:'medium') : '-' }}
                    </div>
                  </div>

                  <div class="info-item">
                    <label>Actual End</label>
                    <div class="value">
                      {{ workOrder()!.actualEndDate ? (workOrder()!.actualEndDate | date:'medium') : '-' }}
                    </div>
                  </div>

                  <div class="info-item">
                    <label>Created</label>
                    <div class="value">{{ workOrder()!.createdAt | date:'medium' }}</div>
                  </div>

                  <div class="info-item">
                    <label>Last Updated</label>
                    <div class="value">{{ workOrder()!.updatedAt | date:'medium' }}</div>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>

            @if (relatedTicket()) {
              <mat-card class="ticket-card">
                <mat-card-header>
                  <mat-card-title>Related Ticket</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="ticket-info">
                    <div class="ticket-header">
                      <a [routerLink]="['/tickets', relatedTicket()!.id]" class="ticket-link">
                        {{ relatedTicket()!.ticketNumber }}
                      </a>
                      <mat-chip [class]="'status-' + relatedTicket()!.status.toLowerCase()">
                        {{ relatedTicket()!.status }}
                      </mat-chip>
                    </div>
                    <h3>{{ relatedTicket()!.title }}</h3>
                    <div class="ticket-meta">
                      <div><strong>Unit:</strong> {{ relatedTicket()!.unitName }}</div>
                      <div><strong>Property:</strong> {{ relatedTicket()!.propertyAddress }}</div>
                      <div><strong>Category:</strong> {{ relatedTicket()!.category }}</div>
                      <div><strong>Priority:</strong> {{ relatedTicket()!.priority }}</div>
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>
            }

            <mat-card class="quotes-card">
              <mat-card-header>
                <mat-card-title>Quotes</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                @if (quotes().length > 0) {
                  <div class="quotes-list">
                    @for (quote of quotes(); track quote.id) {
                      <div class="quote-item" [routerLink]="['/quotes', quote.id]">
                        <div class="quote-header">
                          <span class="quote-number">{{ quote.quoteNumber }}</span>
                          <mat-chip [class]="'status-' + quote.status.toLowerCase()">
                            {{ quote.status }}
                          </mat-chip>
                        </div>
                        <div class="quote-details">
                          <span><strong>Submitted by:</strong> {{ quote.submittedByEmail }}</span>
                          <span><strong>Total:</strong> {{ quote.totalGBP | currency:'GBP':'symbol':'1.2-2' }}</span>
                          @if (quote.expiresAt) {
                            <span><strong>Expires:</strong> {{ quote.expiresAt | date:'short' }}</span>
                          }
                        </div>
                      </div>
                    }
                  </div>
                } @else {
                  <p class="empty-message">No quotes for this work order yet.</p>
                }
              </mat-card-content>
            </mat-card>

            <mat-card class="invoices-card">
              <mat-card-header>
                <mat-card-title>Invoices</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                @if (invoices().length > 0) {
                  <div class="invoices-list">
                    @for (invoice of invoices(); track invoice.id) {
                      <div class="invoice-item" [routerLink]="['/invoices', invoice.id]">
                        <div class="invoice-header">
                          <span class="invoice-number">{{ invoice.invoiceNumber }}</span>
                          <mat-chip [class]="'status-' + invoice.status.toLowerCase()">
                            {{ invoice.status }}
                          </mat-chip>
                        </div>
                        <div class="invoice-details">
                          <span><strong>Submitted by:</strong> {{ invoice.submittedByName }}</span>
                          <span><strong>Total:</strong> {{ invoice.totalGBP | currency:'GBP':'symbol':'1.2-2' }}</span>
                          @if (invoice.dueDate) {
                            <span [class.overdue-text]="isInvoiceOverdue(invoice)">
                              <strong>Due:</strong> {{ invoice.dueDate | date:'short' }}
                              @if (isInvoiceOverdue(invoice)) {
                                <mat-icon class="overdue-icon">warning</mat-icon>
                              }
                            </span>
                          }
                          @if (invoice.paidAt) {
                            <span><strong>Paid:</strong> {{ invoice.paidAt | date:'short' }}</span>
                          }
                        </div>
                      </div>
                    }
                  </div>
                } @else {
                  <p class="empty-message">No invoices for this work order yet.</p>
                }
              </mat-card-content>
            </mat-card>
          </div>

          <div class="actions-sidebar">
            @if (successMessage()) {
              <mat-card class="message success-message">
                <mat-icon>check_circle</mat-icon>
                {{ successMessage() }}
              </mat-card>
            }

            @if (errorMessage()) {
              <mat-card class="message error-message">
                <mat-icon>error</mat-icon>
                {{ errorMessage() }}
              </mat-card>
            }

            @if (canAssign()) {
              <mat-card class="action-card">
                <mat-card-header>
                  <mat-card-title>Assign Contractor</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <form [formGroup]="assignForm" (ngSubmit)="onAssign()">
                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Contractor</mat-label>
                      <mat-select formControlName="contractorId" required>
                        @if (loadingContractors()) {
                          <mat-option disabled>Loading contractors...</mat-option>
                        } @else if (contractors().length === 0) {
                          <mat-option disabled>No contractors available</mat-option>
                        } @else {
                          @for (contractor of contractors(); track contractor.id) {
                            <mat-option [value]="contractor.id">
                              {{ contractor.firstName }} {{ contractor.lastName }}
                              <span class="contractor-email">({{ contractor.email }})</span>
                            </mat-option>
                          }
                        }
                      </mat-select>
                    </mat-form-field>
                    <button
                      mat-raised-button
                      color="primary"
                      type="submit"
                      [disabled]="assignForm.invalid || submitting()"
                      class="full-width">
                      @if (submitting()) {
                        <mat-spinner diameter="20"></mat-spinner>
                      } @else {
                        Assign Contractor
                      }
                    </button>
                  </form>
                </mat-card-content>
              </mat-card>
            }

            @if (canSchedule()) {
              <mat-card class="action-card">
                <mat-card-header>
                  <mat-card-title>Schedule Work</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <form [formGroup]="scheduleForm" (ngSubmit)="onSchedule()">
                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Start Date & Time</mat-label>
                      <input matInput type="datetime-local" formControlName="scheduledStartDate" required>
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>End Date & Time (Optional)</mat-label>
                      <input matInput type="datetime-local" formControlName="scheduledEndDate">
                    </mat-form-field>
                    <button
                      mat-raised-button
                      color="primary"
                      type="submit"
                      [disabled]="scheduleForm.invalid || submitting()"
                      class="full-width">
                      @if (submitting()) {
                        <mat-spinner diameter="20"></mat-spinner>
                      } @else {
                        Schedule Work Order
                      }
                    </button>
                  </form>
                </mat-card-content>
              </mat-card>
            }

            @if (canComplete()) {
              <mat-card class="action-card">
                <mat-card-header>
                  <mat-card-title>Complete Work Order</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <form [formGroup]="completeForm" (ngSubmit)="onComplete()">
                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Completion Notes (Optional)</mat-label>
                      <textarea matInput formControlName="notes" rows="4"></textarea>
                      <mat-hint>Add any final notes about the completed work</mat-hint>
                    </mat-form-field>
                    <button
                      mat-raised-button
                      color="primary"
                      type="submit"
                      [disabled]="submitting()"
                      class="full-width">
                      @if (submitting()) {
                        <mat-spinner diameter="20"></mat-spinner>
                      } @else {
                        Mark as Complete
                      }
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
    .work-order-detail-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: 48px;
    }

    .header {
      margin-bottom: 24px;
    }

    .title-section {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    h1 {
      margin: 0;
      font-size: 2rem;
      font-weight: 500;
    }

    .content-grid {
      display: grid;
      grid-template-columns: 1fr 400px;
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

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-top: 16px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .info-item.full-width {
      grid-column: 1 / -1;
    }

    .info-item label {
      font-size: 0.875rem;
      color: #666;
      font-weight: 500;
    }

    .info-item .value {
      font-size: 1rem;
      color: #333;
    }

    .ticket-info {
      margin-top: 16px;
    }

    .ticket-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }

    .ticket-link {
      color: #667eea;
      text-decoration: none;
      font-weight: 500;
      font-size: 1.125rem;
    }

    .ticket-link:hover {
      text-decoration: underline;
    }

    .ticket-info h3 {
      margin: 0 0 16px 0;
      font-size: 1.25rem;
      font-weight: 400;
    }

    .ticket-meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      font-size: 0.875rem;
      color: #666;
    }

    .actions-sidebar {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .action-card {
      position: sticky;
      top: 24px;
    }

    .full-width {
      width: 100%;
    }

    .contractor-email {
      font-size: 0.875rem;
      color: #666;
      margin-left: 4px;
    }

    .message {
      padding: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.875rem;
    }

    .success-message {
      background: #e8f5e9;
      color: #2e7d32;
    }

    .error-message {
      background: #ffebee;
      color: #c62828;
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

    .quotes-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 16px;
    }

    .quote-item {
      padding: 12px;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .quote-item:hover {
      background: #f5f5f5;
    }

    .quote-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .quote-number {
      font-weight: 600;
      color: #667eea;
    }

    .quote-details {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 0.875rem;
      color: #666;
    }

    .empty-message {
      color: #999;
      font-style: italic;
      margin: 16px 0 0 0;
    }

    .status-draft { background: #e3f2fd; color: #1976d2; }
    .status-submitted, .status-underreview { background: #fff3e0; color: #ef6c00; }
    .status-approved { background: #e8f5e9; color: #2e7d32; }
    .status-rejected { background: #ffebee; color: #c62828; }
    .status-expired { background: #fafafa; color: #757575; }
    .status-paid { background: #1de9b6; color: #004d40; }
    .status-overdue { background: #ff5252; color: #ffffff; }
    .status-cancelled { background: #fafafa; color: #757575; }

    .invoices-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 16px;
    }

    .invoice-item {
      padding: 12px;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .invoice-item:hover {
      background: #f5f5f5;
    }

    .invoice-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .invoice-number {
      font-weight: 600;
      color: #667eea;
    }

    .invoice-details {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 0.875rem;
      color: #666;
    }

    .overdue-text {
      color: #c62828;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .overdue-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
  `]
})
export class WorkOrderDetailComponent implements OnInit {
  private workOrderService = inject(WorkOrderService);
  private ticketService = inject(TicketService);
  private contractorService = inject(ContractorService);
  private quoteService = inject(QuoteService);
  private invoiceService = inject(InvoiceService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  workOrder = signal<WorkOrder | null>(null);
  relatedTicket = signal<TicketDetail | null>(null);
  quotes = signal<Quote[]>([]);
  invoices = signal<Invoice[]>([]);
  contractors = signal<Contractor[]>([]);
  loading = signal(true);
  loadingContractors = signal(false);
  submitting = signal(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  assignForm = this.fb.group({
    contractorId: ['', Validators.required]
  });

  scheduleForm = this.fb.group({
    scheduledStartDate: ['', Validators.required],
    scheduledEndDate: ['']
  });

  completeForm = this.fb.group({
    notes: ['']
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadWorkOrder(id);
      this.loadContractors();
    }
  }

  loadWorkOrder(id: string): void {
    this.loading.set(true);

    forkJoin({
      workOrder: this.workOrderService.getWorkOrder(id),
      quotes: this.quoteService.listQuotes({ workOrderId: id }),
      invoices: this.invoiceService.listInvoices()
    }).subscribe({
      next: ({ workOrder, quotes, invoices }) => {
        if (workOrder.data) {
          this.workOrder.set(workOrder.data);
          this.loadRelatedTicket(workOrder.data.ticketId);
        }
        if (quotes.data) {
          this.quotes.set(quotes.data);
        }
        if (invoices.data) {
          // Filter invoices for this work order (backend doesn't support workOrderId filter)
          const filtered = invoices.data.filter(inv => inv.workOrderId === id);
          this.invoices.set(filtered);
        }
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('Failed to load work order');
      }
    });
  }

  loadRelatedTicket(ticketId: string): void {
    this.ticketService.getTicket(ticketId).subscribe({
      next: (response) => {
        if (response.data) {
          this.relatedTicket.set(response.data);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  loadContractors(): void {
    this.loadingContractors.set(true);
    this.contractorService.listContractors().subscribe({
      next: (response) => {
        if (response.data) {
          this.contractors.set(response.data);
        }
        this.loadingContractors.set(false);
      },
      error: () => {
        this.loadingContractors.set(false);
      }
    });
  }

  canAssign(): boolean {
    const status = this.workOrder()?.status;
    return status === 'Draft' || status === 'Pending' || status === 'Scheduled';
  }

  canSchedule(): boolean {
    const status = this.workOrder()?.status;
    return status === 'Draft' || status === 'Pending' || status === 'Assigned';
  }

  canComplete(): boolean {
    const status = this.workOrder()?.status;
    return status === 'InProgress' || status === 'AwaitingApproval';
  }

  onAssign(): void {
    if (this.assignForm.invalid || !this.workOrder()) return;

    this.submitting.set(true);
    this.clearMessages();

    const request = {
      contractorId: this.assignForm.value.contractorId!
    };

    this.workOrderService.assignContractor(this.workOrder()!.id, request).subscribe({
      next: (response) => {
        if (response.data) {
          this.workOrder.set(response.data);
          this.successMessage.set('Contractor assigned successfully');
          this.assignForm.reset();
        }
        this.submitting.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to assign contractor');
        this.submitting.set(false);
      }
    });
  }

  onSchedule(): void {
    if (this.scheduleForm.invalid || !this.workOrder()) return;

    this.submitting.set(true);
    this.clearMessages();

    const request = {
      scheduledStartDate: new Date(this.scheduleForm.value.scheduledStartDate!).toISOString(),
      scheduledEndDate: this.scheduleForm.value.scheduledEndDate
        ? new Date(this.scheduleForm.value.scheduledEndDate).toISOString()
        : undefined
    };

    this.workOrderService.scheduleWorkOrder(this.workOrder()!.id, request).subscribe({
      next: (response) => {
        if (response.data) {
          this.workOrder.set(response.data);
          this.successMessage.set('Work order scheduled successfully');
          this.scheduleForm.reset();
        }
        this.submitting.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to schedule work order');
        this.submitting.set(false);
      }
    });
  }

  onComplete(): void {
    if (!this.workOrder()) return;

    this.submitting.set(true);
    this.clearMessages();

    const request = {
      notes: this.completeForm.value.notes || undefined
    };

    this.workOrderService.completeWorkOrder(this.workOrder()!.id, request).subscribe({
      next: (response) => {
        if (response.data) {
          this.workOrder.set(response.data);
          this.successMessage.set('Work order marked as complete');
          this.completeForm.reset();
        }
        this.submitting.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to complete work order');
        this.submitting.set(false);
      }
    });
  }

  clearMessages(): void {
    this.successMessage.set(null);
    this.errorMessage.set(null);
  }

  isInvoiceOverdue(invoice: Invoice): boolean {
    if (!invoice.dueDate || invoice.status === 'Paid') {
      return false;
    }
    return new Date(invoice.dueDate) < new Date();
  }
}
