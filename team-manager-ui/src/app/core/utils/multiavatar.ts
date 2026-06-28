import multiavatar from '@multiavatar/multiavatar';

export function generateAvatar(seed: string): string {
  return multiavatar(seed);
}

export function avatarDataUrl(seed: string): string {
  const svg = multiavatar(seed);
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}
