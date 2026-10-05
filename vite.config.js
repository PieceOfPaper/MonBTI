import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages project sites are served from /<repository>/, not the domain root.
  base: '/MonBTI/',
  test: {
    environment: 'node',
    include: ['src/**/*.test.js', 'scripts/**/*.test.js'],
  },
});
