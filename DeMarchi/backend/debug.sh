#!/bin/bash

echo "🔍 Railway Debugging Script"
echo "=========================="
echo "Timestamp: $(date)"
echo "Environment: ${RAILWAY_ENVIRONMENT:-unknown}"
echo "Project ID: ${RAILWAY_PROJECT_ID:-unknown}"
echo "Service ID: ${RAILWAY_SERVICE_ID:-unknown}"
echo ""

echo "📊 System Information:"
echo "- Node.js: $(node --version)"
echo "- NPM: $(npm --version)"
echo "- Working directory: $(pwd)"
echo "- User: $(whoami)"
echo "- Platform: $(uname -a)"
echo ""

echo "📁 Directory Structure:"
ls -la
echo ""

echo "📦 Package.json exists: $([ -f package.json ] && echo 'YES' || echo 'NO')"
if [ -f package.json ]; then
    echo "📋 Package.json content:"
    cat package.json | head -30
    echo ""
fi

echo "📂 node_modules exists: $([ -d node_modules ] && echo 'YES' || echo 'NO')"
if [ -d node_modules ]; then
    echo "📦 node_modules size: $(du -sh node_modules/ | cut -f1)"
    echo "📦 Main modules:"
    ls -la node_modules/ | grep -E "(express|cors|mysql2|bcryptjs|jsonwebtoken)" || echo "Main modules not found"
    echo ""
    
    echo "🔍 Express module check:"
    if [ -d "node_modules/express" ]; then
        echo "✅ Express directory exists"
        echo "📦 Express version: $(cat node_modules/express/package.json | grep version | head -1)"
        echo "📂 Express files:"
        ls -la node_modules/express/ | head -10
    else
        echo "❌ Express directory not found"
    fi
fi

echo ""
echo "🧪 Module Resolution Test:"
node -e "
console.log('Testing module resolution...');
const modules = ['express', 'cors', 'mysql2', 'bcryptjs', 'jsonwebtoken'];
modules.forEach(mod => {
    try {
        require(mod);
        console.log('✅', mod, 'OK');
    } catch (e) {
        console.log('❌', mod, 'FAIL:', e.message);
    }
});
" 2>&1

echo ""
echo "🌐 Environment Variables:"
env | grep -E "(NODE|NPM|RAILWAY)" | sort

echo ""
echo "💾 Memory Information:"
free -h 2>/dev/null || echo "Memory info not available"

echo ""
echo "💿 Disk Space:"
df -h . 2>/dev/null || echo "Disk info not available"

echo ""
echo "🔚 Debug complete"
