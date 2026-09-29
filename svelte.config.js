import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter(),
    paths: {
      // Served from https://themostimportant.page/about/charlatans.
      // Set BASE_PATH='' to serve from the root (e.g. another host).
      base: process.env.BASE_PATH ?? '/about/charlatans',
    },
  },
};

export default config;
