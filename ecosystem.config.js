/**
 * PM2 Ecosystem Config
 * Runs two processes on the VPS:
 *   1. kids018-crm     — Next.js web server  (existing)
 *   2. kids018-worker  — Email queue worker  (new)
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 save
 *   pm2 startup
 */

module.exports = {
  apps: [
    {
      name:        'kids018-crm',
      script:      'node_modules/.bin/next',
      args:        'start',
      cwd:         '/var/www/kids018-crm',
      instances:   1,
      autorestart: true,
      watch:       false,
      env: {
        NODE_ENV: 'production',
        PORT:     3000,
      },
    },
    {
      name:        'kids018-worker',
      script:      'node_modules/.bin/tsx',
      args:        'worker.ts',
      cwd:         '/var/www/kids018-crm',
      instances:   1,
      autorestart: true,
      watch:       false,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
}
