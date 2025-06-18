#!/bin/bash

set -e

echo "Setting up databases for Azure Microservices..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Installing dependencies...${NC}"

# Install dependencies for products-service
cd products-service
npm install drizzle-kit tsx --save-dev
echo -e "${GREEN}Products service dependencies installed${NC}"

# Install dependencies for orders-service
cd ../orders-service
npm install drizzle-kit tsx --save-dev
echo -e "${GREEN}Orders service dependencies installed${NC}"

cd ..

# Wait for databases to be ready
echo -e "${BLUE}Waiting for databases to be ready...${NC}"
sleep 10

# Run migrations for products-service
echo -e "${BLUE}Running migrations for products-service...${NC}"
cd products-service
npm run db:migrate
echo -e "${GREEN}Products service migrations completed${NC}"

# Run migrations for orders-service
echo -e "${BLUE}Running migrations for orders-service...${NC}"
cd ../orders-service
npm run db:migrate
echo -e "${GREEN}Orders service migrations completed${NC}"

cd ..

echo -e "${GREEN}Database setup completed successfully!${NC}"