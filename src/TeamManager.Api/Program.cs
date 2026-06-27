using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using TeamManager.Api.Application.Services;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.BackgroundServices;
using TeamManager.Api.Infrastructure.Data;
using TeamManager.Api.Middleware;

// Migrate-only mode: apply EF migrations and exit without wiring up the full app.
if (args.Contains("--migrate"))
{
    var migrateBuilder = WebApplication.CreateBuilder(args);
    migrateBuilder.Services.AddDbContext<AppDbContext>(options =>
        options.UseNpgsql(migrateBuilder.Configuration.GetConnectionString("DefaultConnection"))
               .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning)));
    var migrateApp = migrateBuilder.Build();
    using var migrateScope = migrateApp.Services.CreateScope();
    var migrateDb = migrateScope.ServiceProvider.GetRequiredService<AppDbContext>();
    migrateDb.Database.Migrate();
    await SeedFeaturePermissionsAsync(migrateDb);
    Console.WriteLine("Migrations applied.");
    return;
}

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter()));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHttpContextAccessor();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"))
           .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning)));

builder.Services.AddScoped<ITeamMemberService, TeamMemberService>();
builder.Services.AddScoped<IPIService, PIService>();
builder.Services.AddScoped<ISprintService, SprintService>();
builder.Services.AddScoped<IWorkItemService, WorkItemService>();
builder.Services.AddScoped<WorkItemEventRecorder>();
builder.Services.AddScoped<IFeatureService, FeatureService>();
builder.Services.AddScoped<IMilestoneService, MilestoneService>();
builder.Services.AddScoped<ILeaveService, LeaveService>();
builder.Services.AddHttpClient();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<IPptxExportService, PptxExportService>();
builder.Services.AddScoped<IDiscussionPointService, DiscussionPointService>();
builder.Services.AddScoped<IRetroActionService, RetroActionService>();
builder.Services.AddScoped<IRetroCardService, RetroCardService>();
builder.Services.AddScoped<IAchievementService, AchievementService>();
builder.Services.AddScoped<ILeaderboardService, LeaderboardService>();
builder.Services.AddScoped<ProgressService>();
builder.Services.AddScoped<IWheelService, WheelService>();
builder.Services.AddScoped<IMemberPersonalService, MemberPersonalService>();
builder.Services.AddScoped<ITimesheetService, TimesheetService>();
builder.Services.AddScoped<ITimesheetConfigService, TimesheetConfigService>();
builder.Services.AddScoped<ITimesheetEventPublisher, TimesheetEventPublisher>();
builder.Services.AddHostedService<TimesheetWebhookWorker>();
builder.Services.AddScoped<ISprintVoteService, SprintVoteService>();
builder.Services.AddScoped<IInvitationService, InvitationService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<SquadService>();
builder.Services.AddScoped<IMeetingSessionService, MeetingSessionService>();
builder.Services.AddScoped<IMeetingSeriesService, MeetingSeriesService>();
builder.Services.AddScoped<AiPromptExecutorService>();
builder.Services.AddScoped<QuizQuestionGeneratorService>();
builder.Services.AddScoped<QuizGameService>();
builder.Services.AddScoped<PollService>();
builder.Services.AddScoped<WordleWordGeneratorService>();
builder.Services.AddScoped<WordleService>();
builder.Services.AddScoped<WordleRoyaleService>();
builder.Services.AddScoped<FunRetroService>();
builder.Services.AddScoped<DotsAndBoxesService>();
builder.Services.AddScoped<IWinOfTheWeekService, WinOfTheWeekService>();
builder.Services.AddScoped<GuestWinOfTheWeekService>();
builder.Services.AddScoped<WinSeriesService>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<IWinOfMonthService, WinOfMonthService>();
builder.Services.AddScoped<ICoffeeRunService, CoffeeRunService>();
builder.Services.AddScoped<IScrumPokerService, ScrumPokerService>();
builder.Services.AddScoped<IFeaturePermissionService, FeaturePermissionService>();
builder.Services.AddHostedService<RunDeadlineWorker>();
builder.Services.AddHostedService<QuizGameProgressWorker>();
builder.Services.AddHostedService<WowQuizDuelProgressWorker>();
builder.Services.AddHostedService<PollProgressWorker>();

builder.Services.AddScoped<ILeaveFetcher, ConfigurableLeaveFetcher>();
builder.Services.AddScoped<ITimesheetApprovalFetcher, ConfigurableTimesheetApprovalFetcher>();
builder.Services.AddScoped<ITimesheetApprovalService, TimesheetApprovalService>();

builder.Services.AddHealthChecks()
    .AddDbContextCheck<AppDbContext>();

builder.Services.AddCors(options =>
    options.AddPolicy("AllowAll", policy =>
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

var jwtSection = builder.Configuration.GetSection("Jwt");
var authority = jwtSection["Authority"];
var audience  = jwtSection["Audience"];

if (!string.IsNullOrEmpty(authority) && !string.IsNullOrEmpty(audience))
{
    builder.Services
        .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(o =>
        {
            o.Authority = authority;
            o.Audience  = audience;
            o.TokenValidationParameters = new TokenValidationParameters
            {
                NameClaimType = "name",
                RoleClaimType = "role"
            };
            o.Events = new Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerEvents
            {
                OnMessageReceived = ctx =>
                {
                    var token = ctx.Request.Query["token"].FirstOrDefault();
                    if (!string.IsNullOrEmpty(token) && ctx.HttpContext.WebSockets.IsWebSocketRequest)
                        ctx.Token = token;
                    return Task.CompletedTask;
                }
            };
        })
        .AddScheme<AuthenticationSchemeOptions, ApiKeyAuthenticationHandler>("ApiKey", _ => { });

    builder.Services.AddAuthorization(o =>
    {
        o.FallbackPolicy = new AuthorizationPolicyBuilder(JwtBearerDefaults.AuthenticationScheme, "ApiKey")
            .RequireAuthenticatedUser()
            .Build();
        o.DefaultPolicy = new AuthorizationPolicyBuilder(JwtBearerDefaults.AuthenticationScheme, "ApiKey")
            .RequireAuthenticatedUser()
            .Build();
    });

    builder.Services.AddScoped<IClaimsTransformation, TeamMemberClaimsTransformer>();
}
else
{
    builder.Services.AddAuthentication("Development")
        .AddScheme<AuthenticationSchemeOptions, DevelopmentAuthHandler>("Development", _ => { })
        .AddScheme<AuthenticationSchemeOptions, ApiKeyAuthenticationHandler>("ApiKey", _ => { });
    builder.Services.AddAuthorization(o =>
        o.FallbackPolicy = new AuthorizationPolicyBuilder("Development", "ApiKey")
            .RequireAuthenticatedUser()
            .Build());
    builder.Services.AddScoped<IClaimsTransformation, TeamMemberClaimsTransformer>();
}

var app = builder.Build();

app.UseMiddleware<GlobalExceptionMiddleware>();

app.UseSwagger();
app.UseSwaggerUI();

app.UseCors("AllowAll");

app.UseWebSockets(new WebSocketOptions { KeepAliveInterval = TimeSpan.FromMinutes(2) });

app.UseRouting();
app.UseAuthentication();
app.UseMiddleware<TeamMemberRequiredMiddleware>();
app.UseMiddleware<WebSocketMiddleware>();

app.UseAuthorization();
app.MapHealthChecks("/health").AllowAnonymous();
app.MapGet("/ws-status", () => Results.Ok(new { connections = TeamManager.Api.Middleware.WebSocketMiddleware.GetConnectedMemberCount(), total = TeamManager.Api.Middleware.WebSocketMiddleware.GetTotalConnectionCount() })).AllowAnonymous();
app.MapPost("/ws-test", async () => { await TeamManager.Api.Middleware.WebSocketMiddleware.BroadcastAsync("ws_test", new { message = "ping", ts = DateTimeOffset.UtcNow }, guestAllowed: true); return Results.Ok(new { sent = true }); }).AllowAnonymous();
app.MapControllers();

app.Run();

static async Task SeedFeaturePermissionsAsync(AppDbContext db)
{
    var features = new List<(string Key, string Category, string Label)>
    {
        ("dashboard", "Core", "Dashboard"),
        ("sprints", "Core", "Sprints"),
        ("features", "Core", "Features"),
        ("progress", "Core", "Progress"),
        ("discussion", "Collaboration", "Discussion"),
        ("meetings", "Collaboration", "Meetings"),
        ("fun-hub", "Fun Hub", "Fun Hub"),
        ("coffee-run", "Fun Hub", "Coffee Run"),
        ("scrum-poker", "Fun Hub", "Scrum Poker"),
        ("wheel", "Fun Hub", "Spin Wheel"),
        ("leaderboard", "Fun Hub", "Leaderboard"),
        ("win-of-week", "Fun Hub", "Win of the Week"),
        ("polls", "Fun Hub", "Polls"),
        ("quiz-game", "Fun Hub", "Quiz Game"),
        ("wordle", "Fun Hub", "Wordle"),
        ("retro", "Fun Hub", "Retro"),
        ("dots-and-boxes", "Fun Hub", "Dots & Boxes"),
        ("team", "Team", "Team Management"),
        // wow-host/polls-host/quiz-game-host/wordle-host are seeded separately with role-specific defaults

        ("leave", "Team", "Leave"),
        ("export", "Admin", "Export"),
        ("settings", "Admin", "Settings"),
        ("api-keys", "Admin", "API Keys"),
        ("access-requests", "Admin", "Access Requests"),
    };

    var roles = new[] { "Member", "TeamLead", "TechLead" };

    foreach (var (key, category, label) in features)
    {
        foreach (var role in roles)
        {
            var exists = await db.FeaturePermissions.AnyAsync(p => p.FeatureKey == key && p.Role == role);
            if (!exists)
            {
                db.FeaturePermissions.Add(new TeamManager.Api.Domain.Entities.FeaturePermission
                {
                    FeatureKey = key,
                    Category = category,
                    Label = label,
                    Role = role,
                    IsEnabled = true,
                });
            }
        }
    }

    // Host-style features: on for TeamLead/TechLead, off for Member -- explicitly seeded per role
    // (rather than relying on DefaultOffFeatures' fallback) since some permission lookups default
    // unseeded features to enabled regardless of that list.
    var hostFeatures = new[]
    {
        ("wow-host", "Win of the Week — Host"),
        ("polls-host", "Polls — Host"),
        ("quiz-game-host", "Quiz Game — Host"),
        ("wordle-host", "Wordle — Host"),
        ("retro-host", "Retro — Host"),
        ("dots-and-boxes-host", "Dots & Boxes — Host"),
    };
    var hostRoleDefaults = new[] { ("Member", false), ("TeamLead", true), ("TechLead", true) };
    foreach (var (key, label) in hostFeatures)
    {
        foreach (var (role, enabled) in hostRoleDefaults)
        {
            var exists = await db.FeaturePermissions.AnyAsync(p => p.FeatureKey == key && p.Role == role);
            if (!exists)
            {
                db.FeaturePermissions.Add(new TeamManager.Api.Domain.Entities.FeaturePermission
                {
                    FeatureKey = key,
                    Category = "Fun Hub",
                    Label = label,
                    Role = role,
                    IsEnabled = enabled,
                });
            }
        }
    }

    await db.SaveChangesAsync();
}
