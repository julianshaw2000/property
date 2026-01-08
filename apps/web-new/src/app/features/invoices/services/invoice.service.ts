import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService, ApiResponse } from '../../../core/services/api.service';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  workOrderId: string;
  workOrderNumber: string;
  status: InvoiceStatus;
  submittedByUserId: string;
  submittedByName: string;
  subtotalGBP: number;
  vatGBP: number;
  totalGBP: number;
  fileKey: string | null;
  submittedAt: string | null;
  dueDate: string | null;
  paidAt: string | null;
  createdAt: string;
}

export type InvoiceStatus =
  | 'Draft'
  | 'Submitted'
  | 'UnderReview'
  | 'Approved'
  | 'Rejected'
  | 'Paid'
  | 'Overdue'
  | 'Cancelled';

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface CreateInvoiceRequest {
  workOrderId: string;
  invoiceNumber: string;
  subtotalGBP: number;
  vatGBP: number;
  totalGBP: number;
  lineItemsJson?: string;
  fileKey?: string;
  dueDate?: string;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {
  private api = inject(ApiService);

  listInvoices(filters?: {
    skip?: number;
    take?: number;
  }): Observable<ApiResponse<Invoice[]>> {
    return this.api.get<Invoice[]>('/invoices', filters);
  }

  getInvoice(id: string): Observable<ApiResponse<Invoice>> {
    return this.api.get<Invoice>(`/invoices/${id}`);
  }

  createInvoice(request: CreateInvoiceRequest): Observable<ApiResponse<Invoice>> {
    return this.api.post<Invoice>('/invoices', request);
  }

  approveInvoice(id: string): Observable<ApiResponse<Invoice>> {
    return this.api.post<Invoice>(`/invoices/${id}/approve`, {});
  }

  markAsPaid(id: string): Observable<ApiResponse<Invoice>> {
    return this.api.post<Invoice>(`/invoices/${id}/mark-paid`, {});
  }
}
