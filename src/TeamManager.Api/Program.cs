using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using TeamManager.Api.Application.Services;
using TeamManager.Api.Application.Services.Interfaces;
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
builder.Services.AddScoped<IAchievementService, AchievementService>();
builder.Services.AddScoped<ILeaderboardService, LeaderboardService>();
builder.Services.AddScoped<ProgressService>();
builder.Services.AddScoped<IWheelService, WheelService>();
builder.Services.AddScoped<IMemberPersonalService, MemberPersonalService>();
builder.Services.AddScoped<ITimesheetService, TimesheetService>();
builder.Services.AddScoped<ITimesheetConfigService, TimesheetConfigService>();
builder.Services.AddScoped<ISprintVoteService, SprintVoteService>();
builder.Services.AddScoped<IInvitationService, InvitationService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<SquadService>();
builder.Services.AddScoped<IMeetingSessionService, MeetingSessionService>();
builder.Services.AddScoped<IMeetingSeriesService, MeetingSeriesService>();
builder.Services.AddScoped<IWinOfTheWeekService, WinOfTheWeekService>();
builder.Services.AddScoped<IWinOfMonthService, WinOfMonthService>();
builder.Services.AddScoped<ICoffeeRunService, CoffeeRunService>();

builder.Services.AddScoped<ILeaveFetcher, ConfigurableLeaveFetcher>();

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
app.UseMiddleware<WebSocketMiddleware>();

app.UseAuthentication();
app.UseMiddleware<TeamMemberRequiredMiddleware>();
app.UseAuthorization();
app.MapHealthChecks("/health").AllowAnonymous();
app.MapControllers();

app.Run();
