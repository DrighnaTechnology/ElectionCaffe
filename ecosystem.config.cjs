// =============================================================================
// ElectionCaffe - PM2 Production Configuration
//
// Services (9 microservices):
//   - gateway              (port 3000) — API Gateway, routes to all services
//   - auth-service         (port 3001) — Authentication & JWT
//   - election-service     (port 3002) — Election management
//   - voter-service        (port 3003) — Voter database & search
//   - cadre-service        (port 3004) — Cadre/party worker management
//   - analytics-service    (port 3005) — Election analytics & dashboards
//   - reporting-service    (port 3006) — Reports & DataCaffe integration
//   - ai-analytics-service (port 3007) — AI-powered analytics
//   - super-admin-service  (port 3008) — Super admin panel API
//
// Usage:
//   pm2 start ecosystem.config.cjs
//   pm2 restart all
//   pm2 logs <service-name>
//   pm2 monit
// =============================================================================

const path = require('path');
const ROOT = __dirname;

function serviceConfig(name, port, scriptPath, memoryLimit) {
  return {
    name,
    script: path.join(ROOT, scriptPath),
    cwd: ROOT,
    instances: 1,
    exec_mode: 'fork',
    node_args: '--enable-source-maps',
    autorestart: true,
    watch: false,
    max_memory_restart: memoryLimit || '512M',
    restart_delay: 3000,
    max_restarts: 10,
    min_uptime: '10s',
    merge_logs: true,
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: path.join(ROOT, 'logs', name, 'pm2-error.log'),
    out_file: path.join(ROOT, 'logs', name, 'pm2-out.log'),
    env_production: {
      NODE_ENV: 'production',
      PORT: port,
    },
    env: {
      NODE_ENV: 'production',
      PORT: port,
    },
  };
}

module.exports = {
  apps: [
    // Gateway gets more memory — it proxies all traffic and handles routing
    serviceConfig('gateway',              3000, 'services/gateway/dist/index.js',              '1G'),
    serviceConfig('auth-service',         3001, 'services/auth-service/dist/index.js',         '512M'),
    serviceConfig('election-service',     3002, 'services/election-service/dist/index.js',     '512M'),
    serviceConfig('voter-service',        3003, 'services/voter-service/dist/index.js',        '1G'),
    serviceConfig('cadre-service',        3004, 'services/cadre-service/dist/index.js',        '512M'),
    serviceConfig('analytics-service',    3005, 'services/analytics-service/dist/index.js',    '1G'),
    serviceConfig('reporting-service',    3006, 'services/reporting-service/dist/index.js',    '512M'),
    serviceConfig('ai-analytics-service', 3007, 'services/ai-analytics-service/dist/index.js', '1G'),
    serviceConfig('super-admin-service',  3008, 'services/super-admin-service/dist/index.js',  '512M'),
  ],
};
