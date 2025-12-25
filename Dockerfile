# Bot - Allcom Discord Bot with voice support
FROM oven/bun:1-alpine

WORKDIR /app

# Install ffmpeg for Discord voice support, and git for submodules
RUN apk add --no-cache ffmpeg git

# Copy package files first for better caching
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy the rest of the application
COPY . .

CMD ["bun", "--bun", "run", "src/bot.ts"]