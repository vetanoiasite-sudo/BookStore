import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../http/api-client';
import type { Address, SaveAddressRequest } from '../models/order';

/**
 * The buyer's delivery addresses. Not held as a signal: unlike the basket, an
 * address is read on the two screens that need one and nowhere else, so a shared
 * cache would only be a second thing to keep in step.
 */
@Injectable({ providedIn: 'root' })
export class AddressService {
  private readonly api = inject(ApiClient);

  /** Every saved address, the default one first. */
  list(): Observable<Address[]> {
    return this.api.get<Address[]>('/addresses');
  }

  get(id: string): Observable<Address> {
    return this.api.get<Address>(`/addresses/${encodeURIComponent(id)}`);
  }

  create(request: SaveAddressRequest): Observable<Address> {
    return this.api.post<Address>('/addresses', request);
  }

  update(id: string, request: SaveAddressRequest): Observable<Address> {
    return this.api.put<Address>(`/addresses/${encodeURIComponent(id)}`, request);
  }

  /** Makes this the address checkout pre-selects. */
  makeDefault(id: string): Observable<Address> {
    return this.api.post<Address>(`/addresses/${encodeURIComponent(id)}/default`);
  }

  remove(id: string): Observable<void> {
    return this.api.delete<void>(`/addresses/${encodeURIComponent(id)}`);
  }
}
