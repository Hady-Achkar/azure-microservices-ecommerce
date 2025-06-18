FROM node:18-alpine


# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Install cuid2 for ID generation
RUN pnpm add @paralleldrive/cuid2

# Build TypeScript
RUN pnpm run build

# Expose port
EXPOSE 3001

# Start the application
CMD ["pnpm", "start"]