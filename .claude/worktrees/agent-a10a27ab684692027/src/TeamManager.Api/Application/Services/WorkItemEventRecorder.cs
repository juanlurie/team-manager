using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Domain.Enums;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

public class WorkItemEventRecorder
{
    private readonly AppDbContext _db;
    private readonly IHttpContextAccessor _http;

    public WorkItemEventRecorder(AppDbContext db, IHttpContextAccessor http)
    {
        _db = db;
        _http = http;
    }

    public void Append(Guid workItemId, WorkItemEventType eventType, string? fromValue = null, string? toValue = null, object? metadata = null)
    {
        var actorId = GetActorId();
        var evt = new WorkItemEvent
        {
            WorkItemId = workItemId,
            EventType = eventType,
            FromValue = fromValue,
            ToValue = toValue,
            ActorId = actorId,
        };

        if (metadata != null)
        {
            evt.SetMetadata(metadata);
        }

        _db.WorkItemEvents.Add(evt);
    }

    private Guid? GetActorId()
    {
        var tmid = _http.HttpContext?.User.FindFirst("TMID")?.Value;
        if (Guid.TryParse(tmid, out var id)) return id;
        return null;
    }
}
