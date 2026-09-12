import { preview } from 'vite';

await preview({
  preview: {
    host: '127.0.0.1',
    port: 17896,
    strictPort: true,
  },
});
