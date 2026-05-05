using System.Net;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace TeamManager.Api.Middleware;

public class GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger, IHostEnvironment env)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException pgEx)
        {
            logger.LogWarning(ex, "Database constraint violation: {SqlState}", pgEx.SqlState);
            context.Response.StatusCode = (int)HttpStatusCode.Conflict;
            context.Response.ContentType = "application/problem+json";
            var problem = new
            {
                type = "https://tools.ietf.org/html/rfc7807",
                title = "Database constraint violation",
                status = 409,
                detail = pgEx.SqlState switch
                {
                    "23505" => GetDuplicateKeyMessage(pgEx),
                    "23503" => "Cannot delete because related records exist.",
                    "23502" => "A required field is missing.",
                    _ => $"Database error: {pgEx.MessageText}"
                }
            };
            await context.Response.WriteAsync(JsonSerializer.Serialize(problem));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled exception");
            context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
            context.Response.ContentType = "application/problem+json";
            var problem = new
            {
                type = "https://tools.ietf.org/html/rfc7807",
                title = "An unexpected error occurred.",
                status = 500,
                detail = env.IsDevelopment() ? ex.ToString() : ex.Message
            };
            await context.Response.WriteAsync(JsonSerializer.Serialize(problem));
        }
    }

    private static string GetDuplicateKeyMessage(PostgresException ex)
    {
        var message = ex.MessageText ?? string.Empty;
        var detail = ex.Detail ?? string.Empty;
        var constraint = ex.ConstraintName ?? string.Empty;

        if (constraint.Contains("IX_TeamMembers_Email", StringComparison.OrdinalIgnoreCase) ||
            message.Contains("IX_TeamMembers_Email", StringComparison.OrdinalIgnoreCase))
            return "A team member with this email address already exists.";

        if (constraint.Contains("IX_DiscussionPoints", StringComparison.OrdinalIgnoreCase) ||
            message.Contains("IX_DiscussionPoints", StringComparison.OrdinalIgnoreCase))
            return "A record with these values already exists.";

        if (constraint.Contains("IX_", StringComparison.OrdinalIgnoreCase) ||
            message.Contains("IX_", StringComparison.OrdinalIgnoreCase))
        {
            var keyMatch = System.Text.RegularExpressions.Regex.Match(detail, @"key \(([^)]+)\)");
            if (keyMatch.Success)
                return $"A record already exists with {keyMatch.Groups[1].Value}.";
            return $"A duplicate record already exists.";
        }

        return "A duplicate record already exists.";
    }
}
