using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.DTOs.Personal;
using TeamManager.Api.Application.Services.Interfaces;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[Route("api/v1/team-members/{memberId:guid}")]
public class MemberPersonalController(IMemberPersonalService service) : ControllerBase
{
    [HttpGet("personal")]
    public async Task<IActionResult> GetPersonal(Guid memberId)
        => Ok(await service.GetPersonalAsync(memberId));

    [HttpPut("personal")]
    public async Task<IActionResult> UpsertPersonal(Guid memberId, [FromBody] UpsertPersonalRequest request)
        => Ok(await service.UpsertPersonalAsync(memberId, request));

    [HttpGet("skills")]
    public async Task<IActionResult> GetSkills(Guid memberId)
        => Ok(await service.GetSkillsAsync(memberId));

    [HttpPost("skills")]
    public async Task<IActionResult> CreateSkill(Guid memberId, [FromBody] CreateSkillRequest request)
        => Created("", await service.CreateSkillAsync(memberId, request));

    [HttpPost("skills/{skillId:guid}/ratings")]
    public async Task<IActionResult> AddSkillRating(Guid memberId, Guid skillId, [FromBody] AddSkillRatingRequest request)
    {
        var result = await service.AddSkillRatingAsync(memberId, skillId, request);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpDelete("skills/{skillId:guid}")]
    public async Task<IActionResult> DeleteSkill(Guid memberId, Guid skillId)
    {
        var success = await service.DeleteSkillAsync(memberId, skillId);
        return success ? NoContent() : NotFound();
    }

    [HttpGet("notes")]
    public async Task<IActionResult> GetNotes(Guid memberId)
        => Ok(await service.GetNotesAsync(memberId));

    [HttpPost("notes")]
    public async Task<IActionResult> CreateNote(Guid memberId, [FromBody] CreateNoteRequest request)
        => Created("", await service.CreateNoteAsync(memberId, request));

    [HttpDelete("notes/{noteId:guid}")]
    public async Task<IActionResult> DeleteNote(Guid memberId, Guid noteId)
    {
        var success = await service.DeleteNoteAsync(memberId, noteId);
        return success ? NoContent() : NotFound();
    }

    [HttpGet("tasks")]
    public async Task<IActionResult> GetTasks(Guid memberId)
        => Ok(await service.GetTasksAsync(memberId));

    [HttpPost("tasks")]
    public async Task<IActionResult> CreateTask(Guid memberId, [FromBody] CreateTaskRequest request)
        => Created("", await service.CreateTaskAsync(memberId, request));

    [HttpPatch("tasks/{taskId:guid}")]
    public async Task<IActionResult> UpdateTask(Guid memberId, Guid taskId, [FromBody] UpdateTaskRequest request)
    {
        var result = await service.UpdateTaskAsync(memberId, taskId, request);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpDelete("tasks/{taskId:guid}")]
    public async Task<IActionResult> DeleteTask(Guid memberId, Guid taskId)
    {
        var success = await service.DeleteTaskAsync(memberId, taskId);
        return success ? NoContent() : NotFound();
    }
}
