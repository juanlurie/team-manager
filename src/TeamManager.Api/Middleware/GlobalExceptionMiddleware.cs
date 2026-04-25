using System.Net;
using System.Text.Json;

namespace TeamManager.Api.Middleware;

public class GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger, IHostEnvironment env)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
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
                detail = env.IsProduction() ? "An unexpected error occurred." : ex.Message
            };
            await context.Response.WriteAsync(JsonSerializer.Serialize(problem));
        }
    }
}
