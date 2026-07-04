import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { of, tap } from 'rxjs';

const cache = new Map<string, { response: HttpResponse<unknown>; expires: number }>();
const TTL_MS = 60_000;

const SKIP_PATTERNS = [
  '/api/auth', '/api-keys', '/api/auth-mode', '/api/accessrequests',
  // Actively-polled, time-sensitive endpoints -- caching these makes live games/timers look stuck.
  '/quiz-game/sessions', '/win-of-the-week/current', '/guest/wow/', '/scrum-poker/sessions', '/polls',
  // Fun Retro's WS handlers call getSession() as their refetch-after-broadcast step (silentRefresh) --
  // serving a cached response there means every card/vote/phase/reveal update goes silently stale for
  // up to TTL_MS after the first fetch, since the WS-triggered GET never actually reaches the server.
  '/fun-retro',
];

export function clearCacheForPattern(pattern: string): void {
  for (const key of cache.keys()) {
    if (key.includes(pattern)) cache.delete(key);
  }
}

export const httpCacheInterceptor: HttpInterceptorFn = (req, next) => {
  // Mutations invalidate all cached data for the same base path
  if (req.method !== 'GET') {
    const basePath = req.url.split('/').slice(0, 4).join('/');
    for (const key of cache.keys()) {
      if (key.includes(basePath)) cache.delete(key);
    }
    return next(req);
  }

  if (SKIP_PATTERNS.some(p => req.url.includes(p))) return next(req);

  const key = req.urlWithParams;
  const cached = cache.get(key);

  if (cached && Date.now() < cached.expires) {
    return of(cached.response.clone());
  }

  return next(req).pipe(
    tap(event => {
      if (event instanceof HttpResponse && event.status === 200) {
        cache.set(key, { response: event.clone(), expires: Date.now() + TTL_MS });
      }
    }),
  );
};
