# Settlers of Catan - Multiplayer Web Game

A full-featured implementation of Settlers of Catan built with Angular frontend and .NET 9 backend, supporting up to 6 players.

## Features

✨ **Complete Game Implementation**
- Full Settlers of Catan rules
- 2-6 player support
- Hexagonal game board with random terrain generation
- Resource collection and management
- Building (settlements, cities, roads)
- Development cards
- Trading system
- Longest Road and Largest Army bonuses
- Victory point tracking

🎮 **Modern Tech Stack**
- **Frontend**: Angular 17 with TypeScript
- **Backend**: .NET 9 Web API
- **Real-time**: SignalR for multiplayer updates
- **Styling**: SCSS with responsive design

## Project Structure

```
TestAgentRepository/
├── catan-game/                 # Angular Frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/
│   │   │   │   ├── setup/          # Game setup screen
│   │   │   │   ├── game-board/     # Hexagonal board display
│   │   │   │   └── player-panel/   # Player controls & status
│   │   │   ├── models/             # TypeScript interfaces
│   │   │   ├── services/           # Game logic service
│   │   │   └── app.component.*     # Main app component
│   │   ├── index.html
│   │   ├── main.ts
│   │   └── styles.scss
│   ├── angular.json
│   ├── package.json
│   └── tsconfig.json
│
└── TestAgentWebAPI/            # .NET Backend
    ├── Models/                 # Game state models
    ├── Services/               # Game state management
    ├── Hubs/                   # SignalR hub
    ├── Program.cs              # API endpoints
    └── TestAgentWebAPI.csproj
```

## Prerequisites

- **Node.js** 18+ and npm
- **.NET 9 SDK**
- Modern web browser (Chrome, Firefox, Edge, Safari)

## Installation & Setup

### 1. Backend Setup (.NET API)

```powershell
# Navigate to backend directory
cd TestAgentWebAPI

# Restore dependencies
dotnet restore

# Run the API (will start on https://localhost:5001)
dotnet run
```

The API will be available at:
- HTTPS: `https://localhost:5001`
- HTTP: `http://localhost:5000`

### 2. Frontend Setup (Angular)

```powershell
# Navigate to frontend directory
cd catan-game

# Install dependencies
npm install

# Start development server
npm start
```

The Angular app will be available at: `http://localhost:4200`

## How to Play

### Starting a Game

1. Open `http://localhost:4200` in your browser
2. Select number of players (2-6)
3. Enter player names
4. Click "Start Game"

### Setup Phase

Each player takes turns:
1. **First Round**: Place one settlement and one road (forward order)
2. **Second Round**: Place another settlement and road (reverse order)
3. Second settlement gives you starting resources from adjacent hexes

### Main Game Loop

On your turn:

1. **Roll Dice** 🎲
   - Roll determines which hexes produce resources
   - All players with settlements/cities on matching numbers collect resources
   - Rolling 7 activates the robber

2. **Build Phase** (Main Actions)
   - **Settlement** (costs: 1 Wood, 1 Brick, 1 Sheep, 1 Wheat)
     - Worth 1 victory point
     - Must be on an unoccupied vertex
     - Must be 2+ edges away from other buildings
   
   - **City** (costs: 3 Ore, 2 Wheat)
     - Upgrade a settlement
     - Worth 2 victory points (1 additional)
     - Produces 2 resources instead of 1
   
   - **Road** (costs: 1 Wood, 1 Brick)
     - Connect your settlements
     - Contribute to Longest Road (5+ roads = 2 VP)
   
   - **Development Card** (costs: 1 Ore, 1 Wheat, 1 Sheep)
     - Knights, Victory Points, Road Building, Year of Plenty, Monopoly

3. **Trade** 🤝
   - Trade resources with other players
   - Bank trade (4:1 ratio, or 3:1/2:1 with ports)

4. **End Turn** ⏭️
   - Pass to next player

### Winning the Game

First player to reach **10 Victory Points** wins!

Victory points come from:
- Settlements: 1 VP each
- Cities: 2 VP each
- Victory Point cards: 1 VP each
- Longest Road (5+ roads): 2 VP
- Largest Army (3+ knights): 2 VP

## Game Controls

### Board Interactions
- **Click vertices (circles)**: Place settlements
- **Click edges (lines)**: Place roads  
- **Click your settlements**: Upgrade to cities (when in main phase)

### Resource Icons
- 🌲 Wood (Forest)
- 🧱 Brick (Hills)
- 🐑 Sheep (Pasture)
- 🌾 Wheat (Fields)
- ⛰️ Ore (Mountains)

### Number Tokens
- Each hex has a number (2-12, except desert)
- Red numbers (6 & 8) are most common
- When dice match a hex number, adjacent buildings collect resources

## API Endpoints

### Game Management
- `POST /api/games/create` - Create a new game
- `GET /api/games` - Get all active games
- `GET /api/games/{gameId}` - Get specific game state
- `PUT /api/games/{gameId}` - Update game state
- `DELETE /api/games/{gameId}` - Delete a game
- `POST /api/games/{gameId}/roll-dice` - Roll dice

### SignalR Hub
- `/gamehub` - Real-time game updates

## Development

### Running Tests

```powershell
# Angular tests
cd catan-game
npm test

# .NET tests (if test project exists)
cd TestAgentWebAPI
dotnet test
```

### Building for Production

```powershell
# Frontend
cd catan-game
npm run build
# Output will be in dist/catan-game

# Backend
cd TestAgentWebAPI
dotnet publish -c Release
```

## Architecture Highlights

### Security Features (OWASP Compliant)
- ✅ CORS configured for development
- ✅ Input validation on all API endpoints
- ✅ No hardcoded secrets or credentials
- ✅ Proper error handling
- ✅ Type-safe models with strong typing
- ✅ SQL injection prevention (no direct DB, in-memory state)

### Design Patterns
- **Service Layer**: Separation of game logic from UI
- **Singleton Service**: Global game state management
- **Observer Pattern**: RxJS subscriptions for state updates
- **Component-Based**: Modular, reusable UI components

### Best Practices
- TypeScript strict mode enabled
- Strongly-typed models on both frontend and backend
- Reactive programming with RxJS
- Clean, readable code with proper naming conventions
- SCSS for maintainable styling
- Responsive design for different screen sizes

## Troubleshooting

### Port Already in Use
```powershell
# Change Angular port
ng serve --port 4201

# Change .NET port - edit launchSettings.json
```

### CORS Errors
Ensure backend is running on `localhost:5001` and frontend on `localhost:4200`. Update CORS policy in `Program.cs` if using different ports.

### npm Install Failures
```powershell
# Clear cache and reinstall
npm cache clean --force
rm -r node_modules
rm package-lock.json
npm install
```

## Future Enhancements

- 🌐 Online multiplayer with matchmaking
- 💾 Game save/load functionality
- 🎨 Customizable themes and board skins
- 🤖 AI players for single-player mode
- 📊 Player statistics and leaderboards
- 🔊 Sound effects and animations
- 📱 Mobile-responsive improvements
- 🎲 Dice roll animations
- 💬 In-game chat
- ⚙️ Game settings (custom victory points, house rules)

## Credits

Built with ❤️ as a demonstration of modern web development practices.

**Technologies:**
- Angular - Frontend framework
- .NET 9 - Backend API
- SignalR - Real-time communication
- TypeScript - Type-safe JavaScript
- SCSS - Styling

## License

This is a portfolio/educational project. Settlers of Catan is a trademark of Catan GmbH.

---

**Enjoy your game!** 🎲🏠🛤️
