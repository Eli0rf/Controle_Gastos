# EMERGENCY RAILWAY DEPLOYMENT FIX

## Quick Fixes for "Cannot find module 'express'" Error

### Solution 1: Use Dockerfile deployment (Recommended)
1. Go to Railway dashboard
2. Click on your service
3. Go to Settings > Deploy
4. Change Source to "Deploy from Git repository"
5. Set Dockerfile path to: `DeMarchi/backend/Dockerfile.railway`

### Solution 2: Force dependency reinstall
Add these to Railway environment variables:
```
NIXPACKS_NO_CACHE=1
NPM_CONFIG_PREFER_OFFLINE=false
NIXPACKS_INSTALL_CMD=npm ci --force
```

### Solution 3: Manual package.json fix
If still failing, temporarily add to package.json scripts:
```json
{
  "scripts": {
    "railway-build": "npm install --force && npm start",
    "start": "node server.js"
  }
}
```
Then set Railway start command to: `npm run railway-build`

### Solution 4: Minimal dependencies approach
Replace package.json dependencies with:
```json
{
  "dependencies": {
    "express": "^4.19.2",
    "cors": "^2.8.5",
    "mysql2": "^3.9.1",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "multer": "^1.4.5-lts.1"
  }
}
```

### Debug Commands for Railway Console
If you can access Railway console:
```bash
ls -la node_modules/
npm list
node -e "console.log(require.resolve('express'))"
```

### Last Resort: Environment Variables
Set in Railway:
```
NODE_PATH=/app/node_modules
FORCE_INSTALL=true
```

## Current Status
✅ All configuration files updated
✅ Startup script created with dependency checks  
✅ Dockerfile.railway created as fallback
✅ Environment variable validation improved

## Next Steps
1. Try deploying with current configuration
2. If fails, switch to Dockerfile deployment
3. If still fails, apply emergency fixes above
4. Monitor Railway deployment logs closely
