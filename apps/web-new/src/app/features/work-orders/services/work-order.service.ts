import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService, ApiResponse } from '../../../core/services/api.service';

export interface WorkOrder {
  id: string;
  workOrderNumber: string;
  ticketId: string;
  ticketNumber: string;
  status: WorkOrderStatus;
  description: string | null;
  assignedContractorId: string | null;
  assignedContractorName: string | null;
  scheduledStartDate: string | null;
  scheduledEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export type WorkOrderStatus =
  | 'Draft'
  | 'Pending'
  | 'Assigned'
  | 'Scheduled'
  | 'InProgress'
  | 'AwaitingApproval'
  | 'Completed'
  | 'Cancelled';

export interface CreateWorkOrderRequest {
  ticketId: string;
  description?: string;
  scheduledStartDate?: string;
  scheduledEndDate?: string;
}

export interface AssignWorkOrderRequest {
  contractorId: string;
}

export interface ScheduleWorkOrderRequest {
  scheduledStartDate: string;
  scheduledEndDate?: string;
}

export interface CompleteWorkOrderRequest {
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class WorkOrderService {
  private api = inject(ApiService);

  listWorkOrders(filters?: {
    status?: string;
    ticketId?: string;
    skip?: number;
    take?: number;
  }): Observable<ApiResponse<WorkOrder[]>> {
    return this.api.get<WorkOrder[]>('/work-orders', filters);
  }

  getWorkOrder(id: string): Observable<ApiResponse<WorkOrder>> {
    return this.api.get<WorkOrder>(`/work-orders/${id}`);
  }

  createWorkOrder(request: CreateWorkOrderRequest): Observable<ApiResponse<WorkOrder>> {
    return this.api.post<WorkOrder>('/work-orders', request);
  }

  assignContractor(id: string, request: AssignWorkOrderRequest): Observable<ApiResponse<WorkOrder>> {
    return this.api.patch<WorkOrder>(`/work-orders/${id}/assign`, request);
  }

  scheduleWorkOrder(id: string, request: ScheduleWorkOrderRequest): Observable<ApiResponse<WorkOrder>> {
    return this.api.patch<WorkOrder>(`/work-orders/${id}/schedule`, request);
  }

  completeWorkOrder(id: string, request: CompleteWorkOrderRequest): Observable<ApiResponse<WorkOrder>> {
    return this.api.post<WorkOrder>(`/work-orders/${id}/complete`, request);
  }
}
