using Microsoft.AspNetCore.SignalR;

namespace TestAgentWebAPI.Hubs;

public class GameHub : Hub
{
    public async Task JoinGame(string gameId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, gameId);
        await Clients.Group(gameId).SendAsync("PlayerJoined", Context.ConnectionId);
    }

    public async Task LeaveGame(string gameId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, gameId);
        await Clients.Group(gameId).SendAsync("PlayerLeft", Context.ConnectionId);
    }

    public async Task SendGameUpdate(string gameId, object gameState)
    {
        await Clients.Group(gameId).SendAsync("GameStateUpdated", gameState);
    }

    public async Task SendChatMessage(string gameId, string playerName, string message)
    {
        await Clients.Group(gameId).SendAsync("ChatMessage", playerName, message);
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        await base.OnDisconnectedAsync(exception);
    }
}
