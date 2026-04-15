using TestAgentWebAPI.Services;
using TestAgentWebAPI.Models;
using TestAgentWebAPI.Hubs;
using Microsoft.AspNetCore.SignalR;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddOpenApi();
builder.Services.AddSignalR();
builder.Services.AddSingleton<GameStateService>();

// Add CORS for Angular app
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngularApp", policy =>
    {
        policy.WithOrigins("http://localhost:4200")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("AllowAngularApp");
app.UseHttpsRedirection();

var gameService = app.Services.GetRequiredService<GameStateService>();

// Game API Endpoints
app.MapPost("/api/games/create", (CreateGameRequest request, GameStateService service) =>
{
    var game = service.CreateGame(request.PlayerNames);
    return game != null ? Results.Ok(game) : Results.BadRequest("Invalid player count (2-6 required)");
})
.WithName("CreateGame");

app.MapGet("/api/games", (GameStateService service) =>
{
    return Results.Ok(service.GetAllGames());
})
.WithName("GetAllGames");

app.MapGet("/api/games/{gameId}", (string gameId, GameStateService service) =>
{
    var game = service.GetGame(gameId);
    return game != null ? Results.Ok(game) : Results.NotFound();
})
.WithName("GetGame");

app.MapPut("/api/games/{gameId}", (string gameId, GameState gameState, GameStateService service) =>
{
    var updated = service.UpdateGameState(gameId, gameState);
    return updated != null ? Results.Ok(updated) : Results.NotFound();
})
.WithName("UpdateGameState");

app.MapPost("/api/games/{gameId}/roll-dice", (string gameId, GameStateService service) =>
{
    var result = service.RollDice(gameId);
    return Results.Ok(new { dice1 = result.dice1, dice2 = result.dice2, total = result.dice1 + result.dice2 });
})
.WithName("RollDice");

app.MapDelete("/api/games/{gameId}", (string gameId, GameStateService service) =>
{
    var deleted = service.DeleteGame(gameId);
    return deleted ? Results.Ok() : Results.NotFound();
})
.WithName("DeleteGame");

// Map SignalR hub
app.MapHub<GameHub>("/gamehub");

app.Run();
