import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TicketService } from '../services/ticket.service';
import { UnitService, Unit } from '../../../core/services/unit.service';

@Component({
    selector: 'app-ticket-form',
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
        <button mat-icon-button routerLink="/app/tickets">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1>Create New Ticket</h1>
      </div>

      <mat-card>
        <mat-card-content>
          <form [formGroup]="ticketForm" (ngSubmit)="onSubmit()">
            <div class="form-grid">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Unit</mat-label>
                <mat-select formControlName="unitId" required>
                  @if (loadingUnits()) {
                    <mat-option disabled>Loading units...</mat-option>
                  } @else if (units().length === 0) {
                    <mat-option disabled>No units available</mat-option>
                  } @else {
                    @for (unit of units(); track unit.id) {
                      <mat-option [value]="unit.id">
                        {{ unit.unitNumber }} - {{ unit.name }}
                        @if (unit.bedrooms || unit.bathrooms) {
                          <span class="unit-details">
                            ({{ unit.bedrooms || 0 }} bed, {{ unit.bathrooms || 0 }} bath)
                          </span>
                        }
                      </mat-option>
                    }
                  }
                </mat-select>
                @if (units().length === 0 && !loadingUnits()) {
                  <mat-hint>
                    No units found.
                    <a href="javascript:void(0)" (click)="seedTestData()" style="color: #3f51b5; text-decoration: underline;">
                      Click here to create test units
                    </a>
                  </mat-hint>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Title</mat-label>
                <input matInput formControlName="title" placeholder="Brief description" required>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Category</mat-label>
                <mat-select formControlName="category" required>
                  <mat-option value="PLUMBING">Plumbing</mat-option>
                  <mat-option value="ELECTRICAL">Electrical</mat-option>
                  <mat-option value="HEATING">Heating</mat-option>
                  <mat-option value="APPLIANCE">Appliance</mat-option>
                  <mat-option value="STRUCTURAL">Structural</mat-option>
                  <mat-option value="PEST_CONTROL">Pest Control</mat-option>
                  <mat-option value="CLEANING">Cleaning</mat-option>
                  <mat-option value="LOCKOUT">Lockout</mat-option>
                  <mat-option value="OTHER">Other</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Priority</mat-label>
                <mat-select formControlName="priority" required>
                  <mat-option value="ROUTINE">Routine</mat-option>
                  <mat-option value="URGENT">Urgent</mat-option>
                  <mat-option value="EMERGENCY">Emergency</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Description</mat-label>
                <textarea matInput formControlName="description" rows="5" placeholder="Detailed description of the issue"></textarea>
              </mat-form-field>

              <div class="section-header full-width">
                <h3>Reporter Information (Optional)</h3>
              </div>

              <mat-form-field appearance="outline">
                <mat-label>Reporter Name</mat-label>
                <input matInput formControlName="reportedByName">
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Reporter Phone</mat-label>
                <input matInput formControlName="reportedByPhone" placeholder="+44...">
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Reporter Email</mat-label>
                <input matInput type="email" formControlName="reportedByEmail">
              </mat-form-field>
            </div>

            @if (errorMessage()) {
              <div class="error-message">{{ errorMessage() }}</div>
            }

            <div class="actions">
              <button mat-button type="button" routerLink="/app/tickets">
                Cancel
              </button>
              <button
                mat-raised-button
                color="primary"
                type="submit"
                [disabled]="loading() || ticketForm.invalid">
                @if (loading()) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  Create Ticket
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
      max-width: 900px;
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

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }

    .full-width {
      grid-column: 1 / -1;
    }

    .section-header {
      margin-top: 16px;
    }

    .section-header h3 {
      margin: 0;
      font-size: 1.125rem;
      color: #666;
    }

    .error-message {
      color: #f44336;
      margin-bottom: 16px;
      padding: 12px;
      background: #ffebee;
      border-radius: 4px;
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 16px;
    }

    .unit-details {
      color: #666;
      font-size: 0.875rem;
      margin-left: 8px;
    }

    @media (max-width: 768px) {
      .form-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class TicketFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private ticketService = inject(TicketService);
  private unitService = inject(UnitService);
  private router = inject(Router);

  loading = signal(false);
  loadingUnits = signal(false);
  errorMessage = signal<string | null>(null);
  units = signal<Unit[]>([]);

  ticketForm = this.fb.group({
    unitId: ['', Validators.required],
    title: ['', Validators.required],
    category: ['', Validators.required],
    priority: ['ROUTINE', Validators.required],
    description: [''],
    reportedByName: [''],
    reportedByPhone: [''],
    reportedByEmail: ['']
  });

  ngOnInit(): void {
    this.loadUnits();
  }

  loadUnits(): void {
    this.loadingUnits.set(true);
    this.unitService.listUnits().subscribe({
      next: (response) => {
        if (response.data) {
          this.units.set(response.data);
        }
        this.loadingUnits.set(false);
      },
      error: (err) => {
        console.error('Failed to load units:', err);
        this.loadingUnits.set(false);
      }
    });
  }

  seedTestData(): void {
    this.loadingUnits.set(true);
    this.unitService.seedTestData().subscribe({
      next: (response) => {
        console.log('Test data seeded:', response.data);
        this.loadUnits(); // Reload units after seeding
      },
      error: (err) => {
        console.error('Failed to seed test data:', err);
        this.loadingUnits.set(false);
      }
    });
  }

  onSubmit(): void {
    if (this.ticketForm.invalid) return;

    this.loading.set(true);
    this.errorMessage.set(null);

    const formValue = this.ticketForm.value;
    const request = {
      unitId: formValue.unitId!,
      title: formValue.title!,
      category: formValue.category!,
      priority: formValue.priority!,
      description: formValue.description || undefined,
      reportedByName: formValue.reportedByName || undefined,
      reportedByPhone: formValue.reportedByPhone || undefined,
      reportedByEmail: formValue.reportedByEmail || undefined
    };

    this.ticketService.createTicket(request).subscribe({
      next: (response) => {
        if (response.data) {
          this.router.navigate(['/tickets', response.data.id]);
        } else if (response.error) {
          this.errorMessage.set(response.error.message);
          this.loading.set(false);
        }
      },
      error: (err) => {
        this.errorMessage.set('Failed to create ticket. Please try again.');
        this.loading.set(false);
      }
    });
  }
}

