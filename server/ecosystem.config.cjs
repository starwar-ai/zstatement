// PM2 ecosystem config — used by deploy/remote.sh to start the Express server.
// Must be .cjs because server/package.json has "type": "module".
module.exports = {
  apps: [
    {
      name: 'zstatement',
      script: 'src/index.js',
      cwd: '/home/ubuntu/zstatement/server',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
    },
  ],
}
