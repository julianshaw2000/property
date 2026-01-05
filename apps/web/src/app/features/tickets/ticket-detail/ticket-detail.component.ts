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
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { TicketService, TicketDetail } from '../services/ticket.service';
import { WorkOrderService, WorkOrder } from '../../work-orders/services/work-order.service';

@Component({
  selector: 'app-ticket-detail',
  standalone: true,
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
    MatSelectModule,
    MatInputModule,
    MatDividerModule
  ],
  template: `
    <div class="ticket-detail-container">
      @if (loading()) {
        <div class="loading">
          <mat-spinner></mat-spinner>
        </div>
      } @else if (ticket()) {
        <div class="header">
          <button mat-icon-button routerLink="/tickets">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <h1>{{ ticket()!.ticketNumber }}</h1>
          <div class="spacer"></div>
          <button mat-raised-button color="warn" (click)="deleteTicket()">
            <mat-icon>delete</mat-icon>
            Delete
          </button>
        </div>

        <div class="content-grid">
          <div class="main-content">
            <mat-card>
              <mat-card-header>
                <mat-card-title>{{ ticket()!.title }}</mat-card-title>
                <div class="badges">
                  <mat-chip [class]="'priority-' + ticket()!.priority.toLowerCase()">
                    {{ ticket()!.priority }}
                  </mat-chip>
                  <mat-chip [class]="'status-' + ticket()!.status.toLowerCase()">
                    {{ ticket()!.status }}
                  </mat-chip>
                </div>
              </mat-card-header>

              <mat-card-content>
                <div class="info-section">
                  <h3>Property Information</h3>
                  <div class="info-row">
                    <span class="label">Unit:</span>
                    <span class="value">{{ ticket()!.unitName }}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">Address:</span>
                    <span class="value">{{ ticket()!.propertyAddress }}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">Category:</span>
                    <span class="value">{{ ticket()!.category }}</span>
                  </div>
                </div>

                <mat-divider></mat-divider>

                <div class="info-section">
                  <h3>Description</h3>
                  <p>{{ ticket()!.description || 'No description provided' }}</p>
                </div>

                @if (ticket()!.reportedByName) {
                  <mat-divider></mat-divider>
                  <div class="info-section">
                    <h3>Reported By</h3>
                    <div class="info-row">
                      <span class="label">Name:</span>
                      <span class="value">{{ ticket()!.reportedByName }}</span>
                    </div>
                    @if (ticket()!.reportedByPhone) {
                      <div class="info-row">
                        <span class="label">Phone:</span>
                        <span class="value">{{ ticket()!.reportedByPhone }}</span>
                      </div>
                    }
                    @if (ticket()!.reportedByEmail) {
                      <div class="info-row">
                        <span class="label">Email:</span>
                        <span class="value">{{ ticket()!.reportedByEmail }}</span>
                      </div>
                    }
                  </div>
                }

                @if (ticket()!.resolutionNotes) {
                  <mat-divider></mat-divider>
                  <div class="info-section">
                    <h3>Resolution Notes</h3>
                    <p>{{ ticket()!.resolutionNotes }}</p>
                  </div>
                }
              </mat-card-content>
            </mat-card>

            <mat-card class="work-orders-card">
              <mat-card-header>
                <mat-card-title>Work Orders</mat-card-title>
                <button
                  mat-raised-button
                  color="primary"
                  [routerLink]="['/work-orders/create']"
                  [queryParams]="{ ticketId: ticket()!.id }">
                  <mat-icon>add</mat-icon>
                  Create Work Order
                </button>
              </mat-card-header>
              <mat-card-content>
                @if (workOrders().length > 0) {
                  <div class="work-orders-list">
                    @for (wo of workOrders(); track wo.id) {
                      <div class="work-order-item" [routerLink]="['/work-orders', wo.id]">
                        <div class="wo-header">
                          <span class="wo-number">{{ wo.workOrderNumber }}</span>
                          <mat-chip [class]="'status-' + wo.status.toLowerCase()">
                            {{ wo.status }}
                          </mat-chip>
                        </div>
                        <div class="wo-details">
                          @if (wo.assignedContractorName) {
                            <span><strong>Contractor:</strong> {{ wo.assignedContractorName }}</span>
                          }
                          @if (wo.scheduledStartDate) {
                            <span><strong>Scheduled:</strong> {{ wo.scheduledStartDate | date:'short' }}</span>
                          }
                        </div>
                      </div>
                    }
                  </div>
                } @else {
                  <p class="empty-message">No work orders for this ticket yet.</p>
                }
              </mat-card-content>
            </mat-card>

            <mat-card class="timeline-card">
              <mat-card-header>
                <mat-card-title>Timeline</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="timeline">
                  @for (event of ticket()!.timeline; track event.id) {
                    <div class="timeline-item">
                      <div class="timeline-marker"></div>
                      <div class="timeline-content">
                        <div class="event-type">{{ event.eventType }}</div>
                        @if (event.description) {
                          <div class="event-description">{{ event.description }}</div>
                        }
                        <div class="event-meta">
                          @if (event.actorName) {
                            <span>{{ event.actorName }}</span> •
                          }
                          <span>{{ event.createdAt | date:'medium' }}</span>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              </mat-card-content>
            </mat-card>
          </div>

          <div class="sidebar">
            <mat-card class="update-card">
              <mat-card-header>
                <mat-card-title>Update Ticket</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <form [formGroup]="updateForm" (ngSubmit)="onSubmit()">
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Status</mat-label>
                    <mat-select formControlName="status">
                      <mat-option value="NEW">New</mat-option>
                      <mat-option value="ASSIGNED">Assigned</mat-option>
                      <mat-option value="IN_PROGRESS">In Progress</mat-option>
                      <mat-option value="Resolved">Resolved</mat-option>
                      <mat-option value="CLOSED">Closed</mat-option>
                    </mat-select>
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Priority</mat-label>
                    <mat-select formControlName="priority">
                      <mat-option value="ROUTINE">Routine</mat-option>
                      <mat-option value="URGENT">Urgent</mat-option>
                      <mat-option value="EMERGENCY">Emergency</mat-option>
                    </mat-select>
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Resolution Notes</mat-label>
                    <textarea matInput formControlName="resolutionNotes" rows="4"></textarea>
                  </mat-form-field>

                  <button
                    mat-raised-button
                    color="primary"
                    type="submit"
                    class="full-width"
                    [disabled]="updating()">
                    @if (updating()) {
                      <mat-spinner diameter="20"></mat-spinner>
                    } @else {
                      Update Ticket
                    }
                  </button>
                </form>
              </mat-card-content>
            </mat-card>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .ticket-detail-container {
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

    .badges {
      display: flex;
      gap: 8px;
      margin-left: auto;
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
    }

    .label {
      font-weight: 500;
      min-width: 100px;
      color: #666;
    }

    .value {
      flex: 1;
    }

    .timeline {
      position: relative;
      padding: 16px 0;
    }

    .timeline-item {
      position: relative;
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
    }

    .timeline-marker {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #667eea;
      margin-top: 4px;
      position: relative;
    }

    .timeline-marker::after {
      content: '';
      position: absolute;
      top: 12px;
      left: 5px;
      width: 2px;
      height: calc(100% + 24px);
      background: #e0e0e0;
    }

    .timeline-item:last-child .timeline-marker::after {
      display: none;
    }

    .timeline-content {
      flex: 1;
    }

    .event-type {
      font-weight: 600;
      margin-bottom: 4px;
    }

    .event-description {
      margin-bottom: 8px;
      color: #666;
    }

    .event-meta {
      font-size: 0.875rem;
      color: #999;
    }

    .update-card form {
      display: flex;
      flex-direction: column;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .priority-routine { background: #e8f5e9; color: #2e7d32; }
    .priority-urgent { background: #fff3e0; color: #ef6c00; }
    .priority-emergency { background: #ffebee; color: #c62828; }
    .status-new { background: #e3f2fd; color: #1976d2; }
    .status-assigned, .status-in_progress { background: #fff3e0; color: #ef6c00; }
    .status-resolved, .status-closed { background: #e8f5e9; color: #2e7d32; }

    .work-orders-card mat-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .work-orders-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .work-order-item {
      padding: 12px;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .work-order-item:hover {
      background: #f5f5f5;
    }

    .wo-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .wo-number {
      font-weight: 600;
      color: #667eea;
    }

    .wo-details {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 0.875rem;
      color: #666;
    }

    .empty-message {
      color: #999;
      font-style: italic;
      margin: 0;
    }

    .status-draft, .status-pending { background: #e3f2fd; color: #1976d2; }
    .status-scheduled { background: #fff3e0; color: #ef6c00; }
    .status-inprogress { background: #fce4ec; color: #c2185b; }
    .status-awaitingapproval { background: #f3e5f5; color: #7b1fa2; }
    .status-completed { background: #e8f5e9; color: #2e7d32; }
    .status-cancelled { background: #fafafa; color: #757575; }
  `]
})
export class TicketDetailComponent implements OnInit {
  private ticketService = inject(TicketService);
  private workOrderService = inject(WorkOrderService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  ticket = signal<TicketDetail | null>(null);
  workOrders = signal<WorkOrder[]>([]);
  loading = signal(true);
  updating = signal(false);

  updateForm = this.fb.group({
    status: [''],
    priority: [''],
    resolutionNotes: ['']
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadTicket(id);
    }
  }

  loadTicket(id: string): void {
    this.loading.set(true);
    forkJoin({
      ticket: this.ticketService.getTicket(id),
      workOrders: this.workOrderService.listWorkOrders({ ticketId: id })
    }).subscribe({
      next: ({ ticket, workOrders }) => {
        if (ticket.data) {
          this.ticket.set(ticket.data);
          this.updateForm.patchValue({
            status: ticket.data.status,
            priority: ticket.data.priority,
            resolutionNotes: ticket.data.resolutionNotes || ''
          });
        }
        if (workOrders.data) {
          this.workOrders.set(workOrders.data);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.router.navigate(['/tickets']);
      }
    });
  }

  onSubmit(): void {
    const ticketId = this.ticket()?.id;
    if (!ticketId) return;

    this.updating.set(true);
    this.ticketService.updateTicket(ticketId, this.updateForm.value as any).subscribe({
      next: (response) => {
        if (response.data) {
          this.ticket.set(response.data);
        }
        this.updating.set(false);
      },
      error: () => {
        this.updating.set(false);
      }
    });
  }

  deleteTicket(): void {
    if (!confirm('Are you sure you want to delete this ticket?')) return;

    const ticketId = this.ticket()?.id;
    if (!ticketId) return;

    this.ticketService.deleteTicket(ticketId).subscribe({
      next: () => {
        this.router.navigate(['/tickets']);
      }
    });
  }
}

