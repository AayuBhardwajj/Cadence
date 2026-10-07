import { defineConfig } from '@playwright/test';
import path from 'path';

const fixturesDir = path.resolve(__dirname, 'fixtures');
const faceVideoPath = path.join(fixturesDir, 'face.mjpeg');
const audioPath = path.join(fixturesDir, 'assessment.wav');

export default defineConfig({
  testDir: './tests',
  timeout: 420_000, // 420s — ML pipeline can take 2-3min on its own
  expect: {
    timeout: 30_000,
  },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'e2e-report', open: 'never' }],
  ],
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'retain-on-failure',
    video: 'retain-on-failure',
    permissions: ['camera', 'microphone'],
    viewport: { width: 1280, height: 800 },
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        headless: true,
        launchOptions: {
          args: [
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
            `--use-file-for-fake-video-capture=${faceVideoPath}`,
            `--use-file-for-fake-audio-capture=${audioPath}`,
            '--allow-file-access',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--use-gl=angle',
            '--use-angle=swiftshader',
          ],
        },
      },
    },
  ],
});
