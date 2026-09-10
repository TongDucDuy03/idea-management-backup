const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function setupProxy(app) {
  // Preserve the browser Origin for login CSRF checks. CRA's package.json proxy
  // rewrites Origin to the backend target, which breaks origin validation.
  app.use(createProxyMiddleware({
    pathFilter: ['/api', '/uploads'],
    target: process.env.DEV_API_TARGET || 'http://127.0.0.1:5000',
    changeOrigin: true,
  }));
};
