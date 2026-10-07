import { Component, inject } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { SeoService } from '../../core/services/seo.service';

type ContactIcon = 'phone' | 'email' | 'facebook' | 'linkedin';

interface ContactChannel {
  icon: ContactIcon;
  labelKey: string;
  value: string;
  href: string;
}

/**
 * How to reach the team behind the store. The details are fixed company contacts,
 * so they live here rather than coming from the API.
 */
@Component({
  selector: 'app-contact',
  imports: [TranslatePipe],
  templateUrl: './contact.html',
  styleUrl: './contact.scss',
})
export class Contact {
  private readonly seo = inject(SeoService);

  protected readonly channels: readonly ContactChannel[] = [
    { icon: 'phone', labelKey: 'contact.phone', value: '+20 122 199 2000', href: 'tel:+201221992000' },
    { icon: 'email', labelKey: 'contact.email', value: 'Info@vetanoia.com', href: 'mailto:Info@vetanoia.com' },
    {
      icon: 'facebook',
      labelKey: 'contact.facebook',
      value: 'VETANOIA Solutions',
      href: 'https://www.facebook.com/vetanoia',
    },
    {
      icon: 'linkedin',
      labelKey: 'contact.linkedin',
      value: 'VETANOIA Solutions',
      href: 'https://www.linkedin.com/company/vetanoia-solutions',
    },
  ];

  constructor() {
    this.seo.apply({ titleKey: 'nav.contact', canonicalPath: '/contact' });
  }
}
