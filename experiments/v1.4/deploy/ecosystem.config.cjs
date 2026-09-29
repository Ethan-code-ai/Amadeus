module.exports = {
  apps: [
    {
      name: "amadeus-v13",
      cwd: "/var/www/Amadeus-v1.3",
      script: "./node_modules/vinext/dist/cli.js",
      args: "start --hostname 127.0.0.1 --port 3013",
      interpreter: "node",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "600M",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
