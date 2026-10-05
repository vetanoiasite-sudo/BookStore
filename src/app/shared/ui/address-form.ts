import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import type { Address, SaveAddressRequest } from '../../core/models/order';

/**
 * The delivery address form, written once and used by both the addresses page and
 * checkout. A buyer adding their first address in the middle of a purchase fills in
 * exactly the same fields, in the same order, as one editing it later.
 */
@Component({
  selector: 'address-form',
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './address-form.html',
  styleUrl: './address-form.scss',
})
export class AddressForm {
  private readonly builder = inject(FormBuilder);

  /** An address to edit, or null to add a new one. */
  readonly address = input<Address | null>(null);

  /** Whether the form is being saved, so the button can say so. */
  readonly saving = input(false);

  /** Shows a cancel button. Off on a page whose only purpose is this form. */
  readonly cancellable = input(true);

  readonly save = output<SaveAddressRequest>();
  readonly cancelled = output<void>();

  protected readonly form = this.builder.nonNullable.group({
    label: ['', [Validators.required, Validators.maxLength(60)]],
    recipientName: ['', [Validators.required, Validators.maxLength(150)]],
    phoneNumber: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(30)]],
    country: ['مصر', [Validators.required, Validators.maxLength(100)]],
    city: ['', [Validators.required, Validators.maxLength(100)]],
    district: ['', Validators.maxLength(100)],
    street: ['', [Validators.required, Validators.maxLength(300)]],
    buildingNumber: ['', Validators.maxLength(50)],
    apartment: ['', Validators.maxLength(50)],
    postalCode: ['', Validators.maxLength(20)],
    notes: ['', Validators.maxLength(500)],
    isDefault: [false],
  });

  /** True once the reader has tried to submit, so nothing turns red before then. */
  protected readonly attempted = signal(false);

  constructor() {
    // Reacting to the input rather than reading it once: the addresses page reuses
    // one form for whichever address is opened next.
    effect(() => {
      const address = this.address();

      if (!address) {
        return;
      }

      this.form.reset({
        label: address.label,
        recipientName: address.recipientName,
        phoneNumber: address.phoneNumber,
        country: address.country,
        city: address.city,
        district: address.district ?? '',
        street: address.street,
        buildingNumber: address.buildingNumber ?? '',
        apartment: address.apartment ?? '',
        postalCode: address.postalCode ?? '',
        notes: address.notes ?? '',
        isDefault: address.isDefault,
      });
    });
  }

  protected invalid(field: string): boolean {
    const control = this.form.get(field);
    return !!control && control.invalid && (control.touched || this.attempted());
  }

  protected submit(): void {
    this.attempted.set(true);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    this.save.emit({
      ...value,
      district: blankToNull(value.district),
      buildingNumber: blankToNull(value.buildingNumber),
      apartment: blankToNull(value.apartment),
      postalCode: blankToNull(value.postalCode),
      notes: blankToNull(value.notes),
    });
  }
}

/** An empty optional field is absent rather than an empty string. */
function blankToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
