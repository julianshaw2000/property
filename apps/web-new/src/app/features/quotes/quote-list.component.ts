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
import { QuoteService, Quote } from './services/quote.service';

@Component({
    selector: 'app-quote-list',
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
    <div class="quote-list-container">
      <div class="header">
        <h1>Quotes</h1>
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
              <mat-option value="Expired">Expired</mat-option>
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
          <table mat-table [dataSource]="quotes()" class="quotes-table">
            <ng-container matColumnDef="quoteNumber">
              <th mat-header-cell *matHeaderCellDef>Quote #</th>
              <td mat-cell *matCellDef="let quote">
                <a [routerLink]="['/quotes', quote.id]" class="quote-link">
                  {{ quote.quoteNumber }}
                </a>
              </td>
            </ng-container>

            <ng-container matColumnDef="workOrderNumber">
              <th mat-header-cell *matHeaderCellDef>Work Order #</th>
              <td mat-cell *matCellDef="let quote">
                <a [routerLink]="['/work-orders', quote.workOrderId]" class="work-order-link">
                  {{ quote.workOrderNumber }}
                </a>
              </td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let quote">
                <mat-chip [class]="'status-' + quote.status.toLowerCase()">
                  {{ quote.status }}
                </mat-chip>
              </td>
            </ng-container>

            <ng-container matColumnDef="submittedBy">
              <th mat-header-cell *matHeaderCellDef>Submitted By</th>
              <td mat-cell *matCellDef="let quote">
                {{ quote.submittedByEmail }}
              </td>
            </ng-container>

            <ng-container matColumnDef="totalGBP">
              <th mat-header-cell *matHeaderCellDef>Total</th>
              <td mat-cell *matCellDef="let quote">
                {{ quote.totalGBP | currency:'GBP':'symbol':'1.2-2' }}
              </td>
            </ng-container>

            <ng-container matColumnDef="expiresAt">
              <th mat-header-cell *matHeaderCellDef>Expires</th>
              <td mat-cell *matCellDef="let quote">
                {{ quote.expiresAt ? (quote.expiresAt | date:'short') : '-' }}
              </td>
            </ng-container>

            <ng-container matColumnDef="created">
              <th mat-header-cell *matHeaderCellDef>Created</th>
              <td mat-cell *matCellDef="let quote">
                {{ quote.createdAt | date:'short' }}
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="quote-row"></tr>
          </table>

          @if (quotes().length === 0) {
            <div class="no-data">
              <mat-icon>description</mat-icon>
              <p>No quotes found</p>
            </div>
          }
        </mat-card>
      }
    </div>
  `,
    styles: [`
    .quote-list-container {
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

    .quotes-table {
      width: 100%;
    }

    .quote-link, .work-order-link {
      color: #667eea;
      text-decoration: none;
      font-weight: 500;
    }

    .quote-link:hover, .work-order-link:hover {
      text-decoration: underline;
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

    .status-rejected {
      background: #ffebee;
      color: #c62828;
    }

    .status-expired {
      background: #fafafa;
      color: #757575;
    }

    .quote-row {
      cursor: pointer;
    }

    .quote-row:hover {
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
export class QuoteListComponent implements OnInit {
  private quoteService = inject(QuoteService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  quotes = signal<Quote[]>([]);
  loading = signal(true);
  displayedColumns = ['quoteNumber', 'workOrderNumber', 'status', 'submittedBy', 'totalGBP', 'expiresAt', 'created'];

  filterForm = this.fb.group({
    status: ['']
  });

  ngOnInit(): void {
    this.loadQuotes();
  }

  loadQuotes(): void {
    this.loading.set(true);
    const filters = this.filterForm.value;

    this.quoteService.listQuotes({
      status: filters.status || undefined
    }).subscribe({
      next: (response) => {
        if (response.data) {
          this.quotes.set(response.data);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  onFilterChange(): void {
    this.loadQuotes();
  }
}
