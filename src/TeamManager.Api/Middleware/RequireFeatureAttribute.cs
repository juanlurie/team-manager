using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.DependencyInjection;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Middleware;

namespace TeamManager.Api.Middleware;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false)]
public class RequireFeatureAttribute : Attribute, IAsyncActionFilter
{
    public string FeatureKey { get; }

    public RequireFeatureAttribute(string featureKey)
    {
        FeatureKey = featureKey;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var memberId = context.HttpContext.GetCurrentMemberId();
        if (memberId == Guid.Empty)
        {
            // An [AllowAnonymous] action (guest WoW reactions, access-request submission) is meant
            // to be reachable with no team member at all -- TeamMemberRequiredMiddleware already
            // lets these through unauthenticated. A feature gate on top of that isn't an
            // authorization decision for a caller who was never going to have a member row, so it
            // doesn't apply here; let the action run.
            var allowAnonymous = context.ActionDescriptor.EndpointMetadata.OfType<IAllowAnonymous>().Any();
            if (allowAnonymous)
            {
                await next();
                return;
            }

            // Fail closed: a request with no resolvable team member has no business behind a
            // feature gate. The global auth policy + TeamMemberRequiredMiddleware should already
            // have stopped it; denying here keeps this filter safe if that ordering ever changes.
            context.HttpContext.Response.StatusCode = StatusCodes.Status403Forbidden;
            context.HttpContext.Response.ContentType = "application/json";
            await context.HttpContext.Response.WriteAsJsonAsync(new { error = "not_a_team_member" });
            context.Result = new EmptyResult();
            return;
        }

        var service = context.HttpContext.RequestServices.GetRequiredService<IFeaturePermissionService>();
        var enabled = await service.IsFeatureEnabledForMemberAsync(memberId, FeatureKey);

        if (!enabled)
        {
            context.HttpContext.Response.StatusCode = StatusCodes.Status403Forbidden;
            context.HttpContext.Response.ContentType = "application/json";
            await context.HttpContext.Response.WriteAsJsonAsync(new { error = "feature_disabled", featureKey = FeatureKey });
            context.Result = new EmptyResult();
            return;
        }

        await next();
    }
}
