const NGROK =
  'C:/Users/lnkbiomed/AppData/Local/Microsoft/WinGet/Packages/Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe/ngrok.exe'

const STATIC_DOMAIN = 'operator-agony-itunes.ngrok-free.dev'

module.exports = {
  apps: [
    {
      name: 'daily-report',
      script: 'dist/index.js',
      cwd: 'C:/CLAUDE/2 daily-report/backend',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
    },
    {
      name: 'daily-report-tunnel',
      script: NGROK,
      args: `http 4000 --url=${STATIC_DOMAIN} --log=stdout`,
      interpreter: 'none',
      autorestart: true,
      watch: false,
    },
  ],
}
