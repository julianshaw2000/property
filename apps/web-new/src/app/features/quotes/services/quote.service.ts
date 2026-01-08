import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService, ApiResponse } from '../../../core/services/api.service';

export interface Quote {
  id: string;
  quoteNumber: string;
  workOrderId: string;
  workOrderNumber: string;
  status: QuoteStatus;
  submittedByUserId: string;
  submittedByEmail: string;
  subtotalGBP: number;
  vatGBP: number;
  totalGBP: number;
  lineItemsJson: string;
  notes: string | null;
  submittedAt: string;
  expiresAt: string | null;
  reviewedAt: string | null;
  reviewedByUserId: string | null;
  reviewNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type QuoteStatus =
  | 'Draft'
  | 'Submitted'
  | 'UnderReview'
  | 'Approved'
  | 'Rejected'
  | 'Expired';

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface CreateQuoteRequest {
  workOrderId: string;
  subtotalGBP: number;
  vatGBP: number;
  totalGBP: number;
  lineItemsJson: string;
  notes?: string;
  expiresAt?: string;
}

export interface RejectQuoteRequest {
  reviewNotes: string;
}

@Injectable({
  providedIn: 'root'
})
export class QuoteService {
  private api = inject(ApiService);

  listQuotes(filters?: {
    status?: string;
    workOrderId?: string;
    skip?: number;
    take?: number;
  }): Observable<ApiResponse<Quote[]>> {
    return this.api.get<Quote[]>('/quotes', filters);
  }

  getQuote(id: string): Observable<ApiResponse<Quote>> {
    return this.api.get<Quote>(`/quotes/${id}`);
  }

  createQuote(request: CreateQuoteRequest): Observable<ApiResponse<Quote>> {
    return this.api.post<Quote>('/quotes', request);
  }

  approveQuote(id: string): Observable<ApiResponse<Quote>> {
    return this.api.post<Quote>(`/quotes/${id}/approve`, {});
  }

  rejectQuote(id: string, request: RejectQuoteRequest): Observable<ApiResponse<Quote>> {
    return this.api.post<Quote>(`/quotes/${id}/reject`, request);
  }
}
