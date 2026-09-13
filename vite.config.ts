import { defineConfig, type Plugin, type PreviewServer, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';
import { createWallpaperBridge } from './wallpaper-bridge.mjs';

function managerContract(): Plugin {
  const install = (server: ViteDevServer | PreviewServer) => {
    server.middlewares.use(createWallpaperBridge());
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
