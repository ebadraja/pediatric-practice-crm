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
      exec_mode:   'fork',
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
      // Run the TS worker via npm script (tsx) in fork mode. Cluster mode does
      // not work with tsx — the process shows "online" but never runs the code.
      script:      'npm',
      args:        'run worker',
      cwd:         '/var/www/kids018-crm',
      exec_mode:   'fork',
      instances:   1,
      autorestart: true,
      watch:       false,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
}
