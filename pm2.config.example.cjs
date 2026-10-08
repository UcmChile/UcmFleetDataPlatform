// Copiar a pm2.config.cjs en el servidor y ajustar UCM_FLEET_APP_ROOT si la ruta difiere.
const path = require('path')

const appRoot = process.env.UCM_FLEET_APP_ROOT || 'C:/inetpub/Apps/UCMFleet'
const backendDir = path.join(appRoot, 'backend').replace(/\\/g, '/')
const logsDir = path.join(appRoot, 'logs').replace(/\\/g, '/')

module.exports = {
  apps: [
    {
      name: 'UCMFleet-Backend',
      script: 'src/server.js',
      cwd: backendDir,
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 4010,
        CORS_ALLOW_LOCALHOST: 'false',
        CORS_ORIGIN: 'https://flota.ucmchile.cl',
      },
      error_file: `${logsDir}/error.log`,
      out_file: `${logsDir}/out.log`,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '768M',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
}
