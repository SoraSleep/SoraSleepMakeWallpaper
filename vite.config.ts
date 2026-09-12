import { defineConfig, type Plugin, type PreviewServer, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';

function managerContract(): Plugin {
  const install = (server: ViteDevServer | PreviewServer) => {
    server.middlewares.use((request, response, next) => {
      const message = request as unknown as { method?: string; url?: string };
      const pathname = new URL(message.url || '/', 'http://127.0.0.1').pathname;
      if (message.method === 'GET' && pathname === '/health') {
        response.statusCode = 200;
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        response.end(JSON.stringify({ ok: true, service: 'wallpaper', version: '0.1.0', telemetry: 'ui-only', jobTelemetry: 'unavailable' }));
        return;
      }
      if (message.method === 'GET' && pathname === '/jobs') {
        response.statusCode = 501;
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        response.end(JSON.stringify({ error: 'job-telemetry-not-implemented' }));
        return;
      }
      next();
    });
  };

  return {
    name: 'sorasleep-manager-contract',
    configureServer: install,
    configurePreviewServer: install,
  };
}

export default defineConfig({
  plugins: [managerContract(), react()],
});
