#!/bin/bash

# ElectionCaffe - Start All Tenant Instances
# This script starts all tenant web applications on separate ports

echo "🚀 Starting ElectionCaffe - All Tenant Instances"
echo "=================================================="
echo ""

# Set PATH to include Node binaries
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin:$PATH"

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm not found in PATH"
    echo "Please install Node.js and npm first"
    exit 1
fi

# Check if we're in the correct directory
if [ ! -d "apps/web" ]; then
    echo "❌ Error: apps/web directory not found"
    echo "Please run this script from the ElectionCaffe root directory"
    exit 1
fi

echo "📋 Tenant URLs:"
echo "  • Demo:           http://localhost:5180/"
echo "  • BJP Tamil Nadu: http://localhost:5181/"
echo "  • BJP Uttar Pradesh: http://localhost:5182/"
echo "  • AIDMK Tamil Nadu: http://localhost:5183/"
echo ""
echo "Other running apps:"
echo "  • Super Admin:    http://localhost:5176/"
echo "  • Default Web:    http://localhost:5177/ (Demo tenant)"
echo ""
echo "🔐 Login credentials available in TENANT_ACCESS_GUIDE.md"
echo ""
echo "Starting all tenant instances..."
echo ""

# Navigate to web app directory
cd apps/web

# Start all tenants using concurrently
npm run dev:all-tenants
