import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService, ApiResponse } from './api.service';

export interface Contractor {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

@Injectable({
  providedIn: 'root'
})
export class ContractorService {
  private api = inject(ApiService);

  listContractors(): Observable<ApiResponse<Contractor[]>> {
    return this.api.get<Contractor[]>('/users', { role: 'Contractor' });
  }
}
