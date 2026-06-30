import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class MobileService {
  private forceDesktop = false;
  isMobile = signal(false);

  constructor() {
    if (new URLSearchParams(window.location.search).get('desktop') === 'true') {
      this.forceDesktop = true;
      sessionStorage.setItem('force-desktop', 'true');
    } else if (sessionStorage.getItem('force-desktop') === 'true') {
      this.forceDesktop = true;
    }
    this.check();
    window.addEventListener('resize', () => this.check());
  }

  private check() {
    this.isMobile.set(!this.forceDesktop && window.innerWidth < 768);
  }
}
