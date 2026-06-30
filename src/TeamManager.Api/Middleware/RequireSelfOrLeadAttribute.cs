using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace TeamManager.Api.Middleware;

/// <summary>
/// Restricts an action whose route includes {memberId:guid} to that member themselves,
/// or to any TeamLead/TechLead. Everyone else gets 403.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false)]
public class RequireSelfOrLeadAttribute : Attribute, IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        if (context.HttpContext.User.IsInRole("TeamLead") || context.HttpContext.User.IsInRole("TechLead"))
        {
            await next();
            return;
        }

        var currentMemberId = context.HttpContext.GetCurrentMemberId();
        var targetMemberId = context.ActionArguments.TryGetValue("memberId", out var value) && value is Guid guid
            ? guid
            : Guid.Empty;

        if (currentMemberId != Guid.Empty && currentMemberId == targetMemberId)
        {
            await next();
            return;
        }

        context.HttpContext.Response.StatusCode = StatusCodes.Status403Forbidden;
        context.HttpContext.Response.ContentType = "application/json";
        await context.HttpContext.Response.WriteAsJsonAsync(new { error = "forbidden", message = "You can only access your own data." });
        context.Result = new EmptyResult();
    }
}
