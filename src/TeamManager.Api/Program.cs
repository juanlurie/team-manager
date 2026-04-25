using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.Services;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Infrastructure.Data;
using TeamManager.Api.Middleware;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter()));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"))
           .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning)));

builder.Services.AddScoped<ITeamMemberService, TeamMemberService>();
builder.Services.AddScoped<IPIService, PIService>();
builder.Services.AddScoped<ISprintService, SprintService>();
builder.Services.AddScoped<IWorkItemService, WorkItemService>();
builder.Services.AddScoped<IFeatureService, FeatureService>();
builder.Services.AddScoped<ILeaveService, LeaveService>();
builder.Services.AddHttpClient("entelect").ConfigurePrimaryHttpMessageHandler(() =>
    new HttpClientHandler { AllowAutoRedirect = false });
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<IPptxExportService, PptxExportService>();
builder.Services.AddScoped<IDiscussionPointService, DiscussionPointService>();
builder.Services.AddScoped<IAchievementService, AchievementService>();
builder.Services.AddScoped<ILeaderboardService, LeaderboardService>();
builder.Services.AddScoped<ProgressService>();
builder.Services.AddScoped<IWheelService, WheelService>();
builder.Services.AddScoped<IMemberPersonalService, MemberPersonalService>();
builder.Services.AddScoped<ISprintVoteService, SprintVoteService>();

builder.Services.AddHealthChecks()
    .AddDbContextCheck<AppDbContext>();

builder.Services.AddCors(options =>
    options.AddPolicy("AllowAll", policy =>
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

app.UseMiddleware<GlobalExceptionMiddleware>();

app.UseSwagger();
app.UseSwaggerUI();

app.UseCors("AllowAll");
app.MapHealthChecks("/health");
app.MapControllers();

// When invoked with --migrate, apply pending migrations and exit.
// In production this runs as a separate init container before the API starts.
if (args.Contains("--migrate"))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
    Console.WriteLine("Migrations applied.");
    return;
}

app.Run();
