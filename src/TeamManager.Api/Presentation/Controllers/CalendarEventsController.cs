using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.Services;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[Route("api/v1/integrations/calendar-events")]
[Authorize]
public class CalendarEventsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetEvents([FromQuery] string start, [FromQuery] string end)
    {
        if (string.IsNullOrWhiteSpace(start) || string.IsNullOrWhiteSpace(end))
            return BadRequest(new { error = "start and end are required." });

        var fetcher = new ConfigurableCalendarEventFetcher(db);
        var events = await fetcher.FetchAsync(start, end);

        return Ok(events.Select(e => new
        {
            subject        = e.Subject,
            start          = e.Start,
            end            = e.End,
            isAllDay       = e.IsAllDay,
            location       = e.Location,
            isOnlineMeeting = false,
            joinUrl        = (string?)null,
        }));
    }
}
