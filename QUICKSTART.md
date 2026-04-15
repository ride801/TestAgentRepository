# 🎲 Quick Start Guide - Settlers of Catan

Follow these steps to get the game running in minutes!

## Step 1: Start the Backend API

Open a PowerShell terminal and run:

```powershell
cd TestAgentWebAPI
dotnet restore
dotnet run
```

✅ You should see: `Now listening on: http://localhost:5000`

Keep this terminal window open!

## Step 2: Start the Frontend

Open a **NEW** PowerShell terminal and run:

```powershell
cd catan-game
npm install
npm start
```

✅ You should see: `Angular Live Development Server is listening on localhost:4200`

## Step 3: Play!

1. Open your browser to: **http://localhost:4200**
2. Select number of players (2-6)
3. Enter player names
4. Click **Start Game**
5. Have fun! 🎉

## Game Controls Quick Reference

### Setup Phase
- Click **vertices (circles)** to place settlements
- Click **edges (lines)** to place roads

### Main Game
1. **Roll Dice** - Click the dice button
2. **Build** - Use action buttons in left panel
   - Settlement: 1 Wood, 1 Brick, 1 Sheep, 1 Wheat
   - City: 3 Ore, 2 Wheat
   - Road: 1 Wood, 1 Brick
   - Dev Card: 1 Ore, 1 Wheat, 1 Sheep
3. **Trade** - Click Trade button to propose trades
4. **End Turn** - Pass to next player

### Goal
First to **10 Victory Points** wins! 🏆

## Troubleshooting

**Port 5000 in use?**
```powershell
# Edit TestAgentWebAPI/Properties/launchSettings.json
# Change port 5000 to 5001 or another available port
```

**Port 4200 in use?**
```powershell
ng serve --port 4201
```

**npm install errors?**
```powershell
npm cache clean --force
npm install
```

---

**Need more details?** See the full [README.md](README.md)

**Enjoy the game!** 🎲🏠🛤️
