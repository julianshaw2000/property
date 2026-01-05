import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService, ApiResponse } from '../../../core/services/api.service';

export interface Ticket {
  id: string;
  ticketNumber: string;
  orgId: string;
  unitId: string;
  unitName: string;
  propertyAddress: string;
  category: string;
  priority: string;
  status: string;
  title: string;
  description: string | null;
  reportedByName: string | null;
  assignedToUserId: string | null;
  assignedToName: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TicketDetail extends Ticket {
  reportedByPhone: string | null;
  reportedByEmail: string | null;
  resolutionNotes: string | null;
  timeline: TimelineEvent[];
}

export interface TimelineEvent {
  id: string;
  eventType: string;
  description: string | null;
  actorUserId: string | null;
  actorName: string | null;
  createdAt: string;
}

export interface CreateTicketRequest {
  unitId: string;
  category: string;
  priority: string;
  title: string;
  description?: string;
  reportedByName?: string;
  reportedByPhone?: string;
  reportedByEmail?: string;
}

export interface UpdateTicketRequest {
  status?: string;
  priority?: string;
  assignedToUserId?: string;
  resolutionNotes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TicketService {
  private api = inject(ApiService);

  listTickets(filters?: {
    status?: string;
    priority?: string;
    skip?: number;
    take?: number;
  }): Observable<ApiResponse<Ticket[]>> {
    return this.api.get<Ticket[]>('/tickets', filters);
  }

  getTicket(id: string): Observable<ApiResponse<TicketDetail>> {
    return this.api.get<TicketDetail>(`/tickets/${id}`);
  }

  createTicket(request: CreateTicketRequest): Observable<ApiResponse<TicketDetail>> {
    return this.api.post<TicketDetail>('/tickets', request);
  }

  updateTicket(id: string, request: UpdateTicketRequest): Observable<ApiResponse<TicketDetail>> {
    return this.api.patch<TicketDetail>(`/tickets/${id}`, request);
  }

  deleteTicket(id: string): Observable<ApiResponse<any>> {
    return this.api.delete(`/tickets/${id}`);
  }
}

