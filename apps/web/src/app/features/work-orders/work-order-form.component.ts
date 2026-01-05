import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { WorkOrderService } from './services/work-order.service';
import { TicketService, Ticket } from '../tickets/services/ticket.service';

@Component({
  selector: 'app-work-order-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="form-container">
      <div class="header">
        <button mat-icon-button routerLink="/work-orders">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1>Create Work Order</h1>
      </div>

      <mat-card>
        <mat-card-content>
          <form [formGroup]="workOrderForm" (ngSubmit)="onSubmit()">
            <div class="form-grid">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Ticket</mat-label>
                <mat-select formControlName="ticketId" required>
                  @if (loadingTickets()) {
                    <mat-option disabled>Loading tickets...</mat-option>
                  } @else if (tickets().length === 0) {
                    <mat-option disabled>No open tickets available</mat-option>
                  } @else {
                    @for (ticket of tickets(); track ticket.id) {
                      <mat-option [value]="ticket.id">
                        {{ ticket.ticketNumber }} - {{ ticket.title }}
                        <span class="ticket-property">{{ ticket.propertyAddress }}</span>
                      </mat-option>
                    }
                  }
                </mat-select>
                <mat-hint>Select the ticket for this work order</mat-hint>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Description (Optional)</mat-label>
                <textarea
                  matInput
                  formControlName="description"
                  rows="4"
                  placeholder="Add specific work order instructions..."></textarea>
                <mat-hint>Provide additional details about the work to be done</mat-hint>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Scheduled Start Date (Optional)</mat-label>
                <input matInput type="datetime-local" formControlName="scheduledStartDate">
                <mat-hint>When should the work begin?</mat-hint>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Scheduled End Date (Optional)</mat-label>
                <input matInput type="datetime-local" formControlName="scheduledEndDate">
                <mat-hint>Expected completion date</mat-hint>
              </mat-form-field>
            </div>

            @if (errorMessage()) {
              <div class="error-message">
                <mat-icon>error</mat-icon>
                {{ errorMessage() }}
              </div>
            }

            <div class="actions">
              <button
                mat-button
                type="button"
                routerLink="/work-orders">
                Cancel
              </button>
              <button
                mat-raised-button
                color="primary"
                type="submit"
                [disabled]="workOrderForm.invalid || loading()">
                @if (loading()) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  Create Work Order
                }
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .form-container {
      padding: 24px;
      max-width: 800px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
    }

    h1 {
      margin: 0;
      font-size: 2rem;
      font-weight: 500;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }

    .full-width {
      grid-column: 1 / -1;
    }

    @media (max-width: 768px) {
      .form-grid {
        grid-template-columns: 1fr;
      }
    }

    .ticket-property {
      font-size: 0.875rem;
      color: #666;
      display: block;
      margin-top: 2px;
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

    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }
  `]
})
export class WorkOrderFormComponent implements OnInit {
  private workOrderService = inject(WorkOrderService);
  private ticketService = inject(TicketService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  tickets = signal<Ticket[]>([]);
  loading = signal(false);
  loadingTickets = signal(false);
  errorMessage = signal<string | null>(null);

  workOrderForm = this.fb.group({
    ticketId: ['', Validators.required],
    description: [''],
    scheduledStartDate: [''],
    scheduledEndDate: ['']
  });

  ngOnInit(): void {
    // Check if ticketId is provided via query param
    const ticketId = this.route.snapshot.queryParamMap.get('ticketId');
    if (ticketId) {
      this.workOrderForm.patchValue({ ticketId });
    }

    this.loadTickets();
  }

  loadTickets(): void {
    this.loadingTickets.set(true);
    // Load only open/in-progress tickets (not resolved or closed)
    this.ticketService.listTickets({
      status: 'NEW,Open,ASSIGNED,IN_PROGRESS'
    }).subscribe({
      next: (response) => {
        if (response.data) {
          this.tickets.set(response.data);
        }
        this.loadingTickets.set(false);
      },
      error: () => {
        this.loadingTickets.set(false);
      }
    });
  }

  onSubmit(): void {
    if (this.workOrderForm.invalid) return;

    this.loading.set(true);
    this.errorMessage.set(null);

    const formValue = this.workOrderForm.value;
    const request = {
      ticketId: formValue.ticketId!,
      description: formValue.description || undefined,
      scheduledStartDate: formValue.scheduledStartDate
        ? new Date(formValue.scheduledStartDate).toISOString()
        : undefined,
      scheduledEndDate: formValue.scheduledEndDate
        ? new Date(formValue.scheduledEndDate).toISOString()
        : undefined
    };

    this.workOrderService.createWorkOrder(request).subscribe({
      next: (response) => {
        if (response.data) {
          this.router.navigate(['/work-orders', response.data.id]);
        }
      },
      error: (err) => {
        this.errorMessage.set('Failed to create work order. Please try again.');
        this.loading.set(false);
      }
    });
  }
}
