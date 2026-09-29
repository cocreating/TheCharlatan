import adapterNode from '@sveltejs/adapter-node';
import adapterVercel from '@sveltejs/adapter-vercel';

// Vercel sets VERCEL=1 during its builds (used for PR preview deployments).
const onVercel = Boolean(process.env.VERCEL);

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    // Production runs as a Node server on the VPS; previews build for Vercel.
    adapter: onVercel ? adapterVercel() : adapterNode(),
    paths: {
      // Served from https://themostimportant.page/about/charlatans.
      // Vercel previews are served from their own domain root.
      // Set BASE_PATH to override (e.g. BASE_PATH='' for another host's root).
      base: process.env.BASE_PATH ?? (onVercel ? '' : '/about/charlatans'),
    },
  },
};

export default config;
