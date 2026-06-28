using TeamManager.Api.Application.DTOs.Personal;

namespace TeamManager.Api.Application.Services.Interfaces;

public interface IMemberPersonalService
{
    Task<MemberPersonalDto> GetPersonalAsync(Guid memberId);
    Task<MemberPersonalDto> UpsertPersonalAsync(Guid memberId, UpsertPersonalRequest request);

    Task<IReadOnlyList<MemberSkillDto>> GetSkillsAsync(Guid memberId);
    Task<MemberSkillDto> CreateSkillAsync(Guid memberId, CreateSkillRequest request);
    Task<MemberSkillDto?> AddSkillRatingAsync(Guid memberId, Guid skillId, AddSkillRatingRequest request);
    Task<bool> DeleteSkillAsync(Guid memberId, Guid skillId);

    Task<IReadOnlyList<MemberNoteDto>> GetNotesAsync(Guid memberId);
    Task<MemberNoteDto> CreateNoteAsync(Guid memberId, CreateNoteRequest request);
    Task<bool> DeleteNoteAsync(Guid memberId, Guid noteId);

    Task<IReadOnlyList<MemberTaskDto>> GetTasksAsync(Guid memberId);
    Task<MemberTaskDto> CreateTaskAsync(Guid memberId, CreateTaskRequest request);
    Task<MemberTaskDto?> UpdateTaskAsync(Guid memberId, Guid taskId, UpdateTaskRequest request);
    Task<bool> DeleteTaskAsync(Guid memberId, Guid taskId);
}
