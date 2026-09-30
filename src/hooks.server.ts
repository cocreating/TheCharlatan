import { redirect, type Handle } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

/** The only public home of the app. */
const CANONICAL_URL = 'https://themostimportant.page/about/charlatans';

/**
 * Vercel is kept for PR previews only. Its production deployment
 * (the-charlatan.vercel.app, rebuilt on every push to master) sends visitors
 * to the canonical URL; previews and the VPS are left alone.
 */
export const handle: Handle = async ({ event, resolve }) => {
  if (env.VERCEL_ENV === 'production' || event.url.hostname === 'the-charlatan.vercel.app') {
    redirect(308, CANONICAL_URL);
  }
  return resolve(event);
};
