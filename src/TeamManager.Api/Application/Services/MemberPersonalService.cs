using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.Personal;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

public class MemberPersonalService(AppDbContext db) : IMemberPersonalService
{
    public async Task<MemberPersonalDto> GetPersonalAsync(Guid memberId)
    {
        var p = await db.MemberPersonals.FindAsync(memberId);
        return p is null
            ? new MemberPersonalDto(null, null)
            : new MemberPersonalDto(p.PersonalMap, p.UpdatedAt);
    }

    public async Task<MemberPersonalDto> UpsertPersonalAsync(Guid memberId, UpsertPersonalRequest request)
    {
        var p = await db.MemberPersonals.FindAsync(memberId);
        if (p is null)
        {
            p = new MemberPersonal { TeamMemberId = memberId };
            db.MemberPersonals.Add(p);
        }
        p.PersonalMap = request.PersonalMap;
        p.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
        return new MemberPersonalDto(p.PersonalMap, p.UpdatedAt);
    }

    public async Task<IReadOnlyList<MemberSkillDto>> GetSkillsAsync(Guid memberId)
    {
        var skills = await db.MemberSkills
            .Where(s => s.TeamMemberId == memberId)
            .Include(s => s.Ratings)
            .OrderBy(s => s.Name)
            .ToListAsync();
        return skills.Select(ToSkillDto).ToList();
    }

    public async Task<MemberSkillDto> CreateSkillAsync(Guid memberId, CreateSkillRequest request)
    {
        var skill = new MemberSkill
        {
            TeamMemberId = memberId,
            Name = request.Name,
            Category = request.Category
        };
        db.MemberSkills.Add(skill);
        await db.SaveChangesAsync();
        return ToSkillDto(skill);
    }

    public async Task<MemberSkillDto?> AddSkillRatingAsync(Guid memberId, Guid skillId, AddSkillRatingRequest request)
    {
        var skill = await db.MemberSkills
            .Include(s => s.Ratings)
            .FirstOrDefaultAsync(s => s.Id == skillId && s.TeamMemberId == memberId);
        if (skill is null) return null;

        skill.Ratings.Add(new MemberSkillRating
        {
            MemberSkillId = skillId,
            Rating = request.Rating,
            Notes = request.Notes,
            RatedAt = request.RatedAt ?? DateOnly.FromDateTime(DateTime.UtcNow)
        });
        await db.SaveChangesAsync();
        return ToSkillDto(skill);
    }

    public async Task<bool> DeleteSkillAsync(Guid memberId, Guid skillId)
    {
        var skill = await db.MemberSkills.FirstOrDefaultAsync(s => s.Id == skillId && s.TeamMemberId == memberId);
        if (skill is null) return false;
        db.MemberSkills.Remove(skill);
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<IReadOnlyList<MemberNoteDto>> GetNotesAsync(Guid memberId)
    {
        var notes = await db.MemberNotes
            .Where(n => n.TeamMemberId == memberId)
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync();
        return notes.Select(n => new MemberNoteDto(n.Id, n.Text, n.CreatedAt)).ToList();
    }

    public async Task<MemberNoteDto> CreateNoteAsync(Guid memberId, CreateNoteRequest request)
    {
        var note = new MemberNote { TeamMemberId = memberId, Text = request.Text };
        db.MemberNotes.Add(note);
        await db.SaveChangesAsync();
        return new MemberNoteDto(note.Id, note.Text, note.CreatedAt);
    }

    public async Task<bool> DeleteNoteAsync(Guid memberId, Guid noteId)
    {
        var note = await db.MemberNotes.FirstOrDefaultAsync(n => n.Id == noteId && n.TeamMemberId == memberId);
        if (note is null) return false;
        db.MemberNotes.Remove(note);
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<IReadOnlyList<MemberTaskDto>> GetTasksAsync(Guid memberId)
    {
        var tasks = await db.MemberTasks
            .Where(t => t.TeamMemberId == memberId)
            .OrderBy(t => t.IsCompleted)
            .ThenBy(t => t.CreatedAt)
            .ToListAsync();
        return tasks.Select(ToTaskDto).ToList();
    }

    public async Task<MemberTaskDto> CreateTaskAsync(Guid memberId, CreateTaskRequest request)
    {
        var task = new MemberTask { TeamMemberId = memberId, Title = request.Title, DueDate = request.DueDate };
        db.MemberTasks.Add(task);
        await db.SaveChangesAsync();
        return ToTaskDto(task);
    }

    public async Task<MemberTaskDto?> UpdateTaskAsync(Guid memberId, Guid taskId, UpdateTaskRequest request)
    {
        var task = await db.MemberTasks.FirstOrDefaultAsync(t => t.Id == taskId && t.TeamMemberId == memberId);
        if (task is null) return null;
        if (request.Title is not null) task.Title = request.Title;
        if (request.IsCompleted is not null)
        {
            var completing = request.IsCompleted.Value && !task.IsCompleted;
            task.IsCompleted = request.IsCompleted.Value;
            task.CompletedAt = completing ? DateTimeOffset.UtcNow : (task.IsCompleted ? task.CompletedAt : null);
        }
        if (request.DueDate is not null) task.DueDate = request.DueDate;
        await db.SaveChangesAsync();
        return ToTaskDto(task);
    }

    public async Task<bool> DeleteTaskAsync(Guid memberId, Guid taskId)
    {
        var task = await db.MemberTasks.FirstOrDefaultAsync(t => t.Id == taskId && t.TeamMemberId == memberId);
        if (task is null) return false;
        db.MemberTasks.Remove(task);
        await db.SaveChangesAsync();
        return true;
    }

    private static MemberSkillDto ToSkillDto(MemberSkill s) => new(
        s.Id,
        s.Name,
        s.Category,
        s.Ratings.OrderBy(r => r.RatedAt).Select(r => new MemberSkillRatingDto(r.Id, r.Rating, r.Notes, r.RatedAt)).ToList()
    );

    private static MemberTaskDto ToTaskDto(MemberTask t) => new(t.Id, t.Title, t.IsCompleted, t.CreatedAt, t.DueDate, t.CompletedAt);
}
