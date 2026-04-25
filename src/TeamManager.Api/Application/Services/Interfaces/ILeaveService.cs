using TeamManager.Api.Application.DTOs.LeaveRecord;

namespace TeamManager.Api.Application.Services.Interfaces;

public interface ILeaveService
{
    Task<IReadOnlyList<LeaveRecordDto>> GetAllAsync(Guid? teamMemberId, Guid? sprintId, DateOnly? from = null, DateOnly? to = null);
    Task<ImportLeaveResult> ImportAsync(ImportLeaveRequest request);
    Task<IReadOnlyList<ImportLeaveRecord>> FetchPreviewAsync(FetchLeaveRequest request);
    Task<ImportLeaveResult> FetchAndImportAsync(FetchLeaveRequest request);
    Task<LeaveRecordDto> CreateAsync(CreateLeaveRecordRequest request);
    Task<LeaveRecordDto?> UpdateAsync(Guid id, CreateLeaveRecordRequest request);
    Task<bool> DeleteAsync(Guid id);
}
