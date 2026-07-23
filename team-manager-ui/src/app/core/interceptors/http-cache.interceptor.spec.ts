import { HttpRequest, HttpResponse, HttpHandlerFn } from '@angular/common/http';
import { of } from 'rxjs';
import { httpCacheInterceptor } from './http-cache.interceptor';

// The cache interceptor freezes real-time features when it caches a GET that a WebSocket handler
// refetches after every broadcast: the refetch is served from cache and the view goes stale until
// something clears it (a mutation). RetroBoard — member and guest — refetches exactly like that, so
// its endpoints must never be cached. These tests pin that, and prove the interceptor still caches
// an ordinary GET so the skip list, not a broken interceptor, is what's being verified.

function get(url: string) { return new HttpRequest('GET', url); }

/** A handler that counts how many requests actually reach the server, tagging each response so a
 *  cached hit (which never increments) is distinguishable from a fresh one. */
function countingHandler(): { next: HttpHandlerFn; calls: () => number } {
  let calls = 0;
  const next: HttpHandlerFn = () => { calls++; return of(new HttpResponse({ status: 200, body: { call: calls } })); };
  return { next, calls: () => calls };
}

describe('httpCacheInterceptor', () => {
  it('caches an ordinary GET — a second identical request is served without hitting the handler', () => {
    const { next, calls } = countingHandler();
    const url = '/api/v1/squads';
    httpCacheInterceptor(get(url), next).subscribe();
    httpCacheInterceptor(get(url), next).subscribe();
    expect(calls()).toBe(1);   // the second read came from cache
  });

  it('never caches the RetroBoard member endpoint — every WS-triggered refetch reaches the server', () => {
    const { next, calls } = countingHandler();
    const url = '/api/v1/retro-board/3f2504e0-4f89-41d3-9a0c-0305e82c3301';
    httpCacheInterceptor(get(url), next).subscribe();
    httpCacheInterceptor(get(url), next).subscribe();
    expect(calls()).toBe(2);
  });

  it('never caches the guest RetroBoard endpoint', () => {
    const { next, calls } = countingHandler();
    const url = '/api/v1/guest/retro-board/quiet-lobster';
    httpCacheInterceptor(get(url), next).subscribe();
    httpCacheInterceptor(get(url), next).subscribe();
    expect(calls()).toBe(2);
  });
});
