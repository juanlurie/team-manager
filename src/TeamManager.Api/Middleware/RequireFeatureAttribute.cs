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
            await next();
            return;
        }

        var service = context.HttpContext.RequestServices.GetRequiredService<IFeaturePermissionService>();
        var enabled = await service.IsFeatureEnabledForMemberAsync(memberId, FeatureKey);

        if (!enabled)
        {
            context.Result = new ForbidResult();
            return;
        }

        await next();
    }
}
