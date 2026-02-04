#!/bin/bash

# ElectionCaffe Development Start Script
# This script starts all services for local development

set -e

echo "=========================================="
echo "     ElectionCaffe Development Server    "
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Warning: .env file not found. Copying from .env.example...${NC}"
    cp .env.example .env
    echo -e "${GREEN}Created .env file. Please update it with your settings.${NC}"
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
fi

# Check PostgreSQL connection
echo -e "${BLUE}Checking PostgreSQL connection...${NC}"
if command -v psql &> /dev/null; then
    if psql -h localhost -U postgres -c '\q' 2>/dev/null; then
        echo -e "${GREEN}PostgreSQL is running${NC}"
    else
        echo -e "${RED}PostgreSQL is not running. Please start PostgreSQL first.${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}psql not found. Assuming PostgreSQL is running...${NC}"
fi

# Generate Prisma client
echo -e "${BLUE}Generating Prisma client...${NC}"
npm run db:generate

# Run migrations
echo -e "${BLUE}Running database migrations...${NC}"
npm run db:push

# Seed database (optional - only if database is empty)
echo -e "${YELLOW}Do you want to seed the database? (y/n)${NC}"
read -r seed_choice
if [ "$seed_choice" = "y" ] || [ "$seed_choice" = "Y" ]; then
    echo -e "${BLUE}Seeding database...${NC}"
    npm run db:seed
fi

echo ""
echo -e "${GREEN}=========================================="
echo "Starting all services..."
echo "==========================================${NC}"
echo ""
echo "Services will be available at:"
echo -e "  ${BLUE}Gateway API:${NC}      http://localhost:3000"
echo -e "  ${BLUE}Auth Service:${NC}     http://localhost:3001"
echo -e "  ${BLUE}Election Service:${NC} http://localhost:3002"
echo -e "  ${BLUE}Voter Service:${NC}    http://localhost:3003"
echo -e "  ${BLUE}Cadre Service:${NC}    http://localhost:3004"
echo -e "  ${BLUE}Analytics Service:${NC} http://localhost:3005"
echo -e "  ${BLUE}Reporting Service:${NC} http://localhost:3006"
echo -e "  ${BLUE}AI Analytics:${NC}     http://localhost:3007"
echo -e "  ${GREEN}Web App:${NC}          http://localhost:5173"
echo ""

# Start all services
npm run dev
