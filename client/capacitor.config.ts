import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ritmika.operacao',
  appName: 'Ritmika Operação',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
