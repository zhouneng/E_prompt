import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // Manually define process.env.API_KEY to map the server-side env var to the client.
      // This replaces 'process.env.API_KEY' in your code with the actual key value during build.
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  };
});