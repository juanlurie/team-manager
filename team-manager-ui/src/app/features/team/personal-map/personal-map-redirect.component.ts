import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { filter, take } from 'rxjs/operators';
import { AuthService } from '../../../core/auth/auth.service';

/**
 * Bridges the old /pulse/personal-maps[/:id] links to the member-scoped location. Personal maps are
 * owned by their creator, so "my maps" is the only sensible target for a bare legacy link -- which
 * means the member id has to come from /api/auth/me rather than a static redirectTo.
 */
@Component({
  selector: 'app-personal-map-redirect',
  standalone: true,
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PersonalMapRedirectComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  ngOnInit(): void {
    const mapId = this.route.snapshot.params['id'];
    this.auth.me$.pipe(filter(me => me !== null), take(1)).subscribe(me => {
      const base = ['/team', me!.id, 'personal-maps'];
      this.router.navigate(mapId ? [...base, mapId] : base, { replaceUrl: true });
    });
  }
}
