import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Using '.' instead of process.cwd() to avoid type errors if @types/node is missing.
  const env = loadEnv(mode, '.', '');
  
  return {
    plugins: [react()],
    define: {
      // Manually define process.env.API_KEY to map the server-side env var to the client.
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  };
});