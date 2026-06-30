// Production values are injected via Docker build-arg GOOGLE_CLIENT_ID.
// This file is the fallback — do not put real credentials here.
export const environment = {
  production: true,
  googleClientId: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
};
