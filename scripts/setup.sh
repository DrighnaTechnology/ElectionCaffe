#!/bin/bash

# ElectionCaffe Initial Setup Script
# Run this script once to set up the project

set -e

echo "=========================================="
echo "     ElectionCaffe Initial Setup         "
echo "=========================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check Node.js version
echo -e "${BLUE}Checking Node.js version...${NC}"
node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$node_version" -lt 18 ]; then
    echo -e "${RED}Error: Node.js 18 or higher is required. Current version: $(node -v)${NC}"
    exit 1
fi
echo -e "${GREEN}Node.js version: $(node -v)${NC}"

# Check npm
echo -e "${BLUE}Checking npm...${NC}"
echo -e "${GREEN}npm version: $(npm -v)${NC}"

# Install dependencies
echo -e "${BLUE}Installing dependencies...${NC}"
npm install

# Copy environment file
if [ ! -f ".env" ]; then
    echo -e "${BLUE}Creating .env file...${NC}"
    cp .env.example .env
    echo -e "${GREEN}Created .env file. Please update with your settings.${NC}"
else
    echo -e "${YELLOW}.env file already exists${NC}"
fi

# Generate Prisma client
echo -e "${BLUE}Generating Prisma client...${NC}"
npm run db:generate

# Create database (if it doesn't exist)
echo -e "${BLUE}Setting up database...${NC}"
echo -e "${YELLOW}Make sure PostgreSQL is running and the database credentials in .env are correct${NC}"

# Ask user to confirm database setup
echo -e "${YELLOW}Do you want to create/update the database schema? (y/n)${NC}"
read -r db_choice
if [ "$db_choice" = "y" ] || [ "$db_choice" = "Y" ]; then
    npm run db:push
    echo -e "${GREEN}Database schema created${NC}"

    echo -e "${YELLOW}Do you want to seed the database with sample data? (y/n)${NC}"
    read -r seed_choice
    if [ "$seed_choice" = "y" ] || [ "$seed_choice" = "Y" ]; then
        npm run db:seed
        echo -e "${GREEN}Database seeded${NC}"
    fi
fi

# Build packages
echo -e "${BLUE}Building shared packages...${NC}"
npm run build --workspace=packages/shared
npm run build --workspace=packages/database

echo ""
echo -e "${GREEN}=========================================="
echo "Setup complete!"
echo "==========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Update .env file with your database credentials"
echo "2. Run 'npm run dev' to start all services"
echo "3. Open http://localhost:5173 in your browser"
echo ""
echo "Default login credentials (after seeding):"
echo "  Mobile: 9876543210"
echo "  Password: admin123"
echo ""
