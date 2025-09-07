# 🤖 Allcom Discord Bot

<div align="center">

![Bun](https://img.shields.io/badge/Bun-000000?style=for-the-badge&logo=bun&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Discord.js](https://img.shields.io/badge/Discord.js-7289DA?style=for-the-badge&logo=discord&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**Production-ready Discord bot with modular architecture for comprehensive server management**

[Features](#-features) • [Quick Start](#-quick-start) • [Commands](#-available-commands) • [Development](#-development) • [Deployment](#-deployment)

</div>

---

> ⚠️ **Important Configuration Notice**
> 
> This bot contains **hardcoded Discord IDs** for specific servers, channels, and roles in the configuration files (`src/util/config/`). You will need to update these IDs to match your Discord server's structure before deployment.

---

## ✨ Features

### 🎮 Core Systems
- **Virtual Voice Channels** - Automatic temporary voice channel creation and management
- **Rules Verification** - Interactive quiz-based verification system for new members
- **Warning System** - Progressive moderation system with automatic role assignments based on standing
- **Anti-bot Protection** - Specialized rooms for bot detection and prevention
- **Media Forum** - Organized forum for memes, clips, and food posts with automatic tagging
- **Stream Notifications** - Automatic Twitch stream announcements
- **News Embeds** - Formatted news and changelog distribution system
- **Achievement System** - Track and reward user accomplishments

### 💰 Economy System
- **Points System** - Virtual currency for user engagement
- **Daily Rewards** - Claim daily points with streak bonuses
- **Work System** - Earn points through mini-games and activities
- **Leaderboards** - Track top users by points and activity

### 🛡️ Moderation Tools
- **Violation Tracking** - Record and manage user violations
- **Standing System** - Calculate user standing based on behavior
- **Review System** - Allow users to request moderation reviews
- **Suspension Management** - Temporary account restrictions

---

## 📋 Prerequisites

- **Bun** runtime (latest version)
- **Discord Bot Token** from Discord Developer Portal
- **API Server** running (see `api` repository)

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/evobug-com/bot.git
   cd bot
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your configuration:
   ```env
   # Required
   DISCORD_TOKEN=your_discord_bot_token
   DISCORD_CLIENT_ID=your_discord_client_id
   
   # Optional (for development)
   DISCORD_GUILD_ID=your_test_guild_id
   NODE_ENV=development
   ```

4. **Update Discord IDs**
   
   Update the hardcoded IDs in these configuration files to match your server:
   - `src/util/config/channels.ts` - Channel IDs and names
   - `src/util/config/roles.ts` - Role IDs and names

5. **Start the API server**
   ```bash
   cd ../api
   bun run dev
   ```

6. **Run the bot**
   ```bash
   cd ../bots
   bun run dev
   ```

---

## 📁 Project Structure

```
bot/
├── src/
│   ├── bot.ts                 # Main bot entry point
│   ├── achievements/           # Achievement system modules
│   ├── client/                 # ORPC client for API communication
│   ├── commands/               # Slash command implementations
│   ├── data/                   # Static data (rules, violations)
│   ├── handlers/               # Event and feature handlers
│   ├── test/                   # Test utilities
│   └── util/                   # Utility functions and configs
│       └── config/             # Channel and role configurations
├── .env.example                # Environment variables template
├── ecosystem.config.cjs        # PM2 configuration
├── package.json               
└── tsconfig.json              
```

## 📝 Available Commands

### Economy Commands
- `/daily` - Claim daily points reward
- `/work` - Complete work activities for points
- `/points [user]` - Check point balance
- `/top` - View server leaderboard

### Moderation Commands
- `/violation <action> <user>` - Manage user violations
- `/violations [user]` - View violation history
- `/standing [user]` - Check user standing
- `/review <type>` - Request moderation review

### Utility Commands
- `/send <message>` - Send formatted messages
- `/send-rules` - Display server rules
- `/news` - Show latest news
- `/changelog` - Display bot changelog

---

## 🛠️ Development

### Running Tests
```bash
bun test                  # Run all tests
bun test --watch         # Run tests in watch mode
```

### Type Checking
```bash
bunx tsgo --noEmit       # Check TypeScript errors
```

### Linting & Formatting
```bash
bunx biome check --write .  # Lint and format code
bunx biome lint            # Check for lint errors only
```

### Development Mode
```bash
bun run dev              # Start with auto-reload
```

## 🔗 API Integration

The bot communicates with the API server using ORPC (Object RPC):
- **API Endpoint**: `http://127.0.0.1:3001`
- **Client Location**: `src/client/client.ts`
- **Contract Types**: Shared between bot and API via TypeScript (located in API repo only)

### Key API Features
- User registration and management
- Stats tracking and persistence
- Violation and suspension management
- Standing calculation
- Review system processing

---

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DISCORD_TOKEN` | Discord bot authentication token | ✅ |
| `DISCORD_CLIENT_ID` | Discord application client ID | ✅ |
| `DISCORD_GUILD_ID` | Guild ID for development (limits commands to one server) | ❌ |
| `NODE_ENV` | Environment mode (`development` or `production`) | ❌ |


## 🚢 Deployment

### Using Bunctl

```bash
# Just start the bot, this will create bunctl.json if it doesn't exist
bunctl start src/bot.ts
```

### Using PM2
```bash
# Start the bot
pm2 start ecosystem.config.cjs

# View logs
pm2 logs allcom-bot

# Stop the bot
pm2 stop allcom-bot
```

### Direct Execution
```bash
bun run src/bot.ts
```

---

## 🐛 Troubleshooting

### Common Issues

1. **"Channel/Role not found" errors**
   - Update IDs in `src/util/config/` files
   - Ensure bot has proper permissions

2. **API connection failed**
   - Verify API server is running on port 3001
   - Check `DATABASE_URL` in API's `.env`

3. **Commands not appearing**
   - Wait for command registration (can take up to 1 hour globally)
   - Use `DISCORD_GUILD_ID` for instant updates in development

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Run tests and linting before committing
4. Commit your changes (`git commit -m 'feat: Add amazing feature'`) - use conventional commits format
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

### Code Style
- Use TypeScript strict mode
- Follow Biome linting rules
- Maintain test coverage for new features
- Document complex logic with comments

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 💬 Support

For issues, questions, or contributions, please open an issue on GitHub or contact the development team.

---

Built with ❤️ using [Discord.js](https://discord.js.org/), [Bun](https://bun.sh/), and [ORPC](https://github.com/unnoq/orpc)