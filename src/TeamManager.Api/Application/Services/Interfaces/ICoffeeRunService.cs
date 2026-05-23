using TeamManager.Api.Application.DTOs.CoffeeRun;
using TeamManager.Api.Application.DTOs.Shared;

namespace TeamManager.Api.Application.Services.Interfaces;

public interface ICoffeeRunService
{
    Task<PagedResult<CoffeeRunListDto>> GetAllAsync(int page = 1, int pageSize = 20, string? status = null, Guid? initiatorId = null, DateTime? from = null, DateTime? to = null);
    Task<CoffeeRunDetailDto> CreateAsync(Guid initiatorId, CreateRunRequest? request = null);
    Task<CoffeeRunDetailDto?> GetByIdAsync(Guid id, Guid currentUserId);
    Task<CoffeeRunDetailDto?> UpdateAsync(Guid id, UpdateRunRequest request, Guid currentUserId, bool isTeamLead);
    Task<bool> DeleteAsync(Guid id, Guid currentUserId, bool isTeamLead);
    Task<CoffeeRunDetailDto?> PublishAsync(Guid id, Guid currentUserId);
    Task<CoffeeRunDetailDto?> CloseAsync(Guid id, Guid currentUserId);
    Task<CoffeeRunDetailDto?> CancelAsync(Guid id, Guid currentUserId, bool isTeamLead);
    Task<RunSummaryDetail?> GetSummaryAsync(Guid id, Guid currentUserId);
    Task<CoffeeRunDetailDto?> AddMenuItemAsync(Guid runId, CreateMenuItemRequest request, Guid currentUserId);
    Task<CoffeeRunDetailDto?> UpdateMenuItemAsync(Guid runId, Guid itemId, UpdateMenuItemRequest request, Guid currentUserId);
    Task<CoffeeRunDetailDto?> ToggleMenuItemAvailabilityAsync(Guid runId, Guid itemId, Guid currentUserId);
    Task<DeleteMenuItemResult> DeleteMenuItemAsync(Guid runId, Guid itemId, Guid currentUserId);
    Task<(CoffeeRunDetailDto? Result, bool IsDuplicate)> CreateOrderAsync(Guid runId, CreateOrderRequest request, Guid currentUserId);
    Task<CoffeeRunDetailDto?> UpdateOrderAsync(Guid runId, Guid orderId, UpdateOrderRequest request, Guid currentUserId);
    Task<CoffeeRunDetailDto?> DeleteOrderAsync(Guid runId, Guid orderId, Guid currentUserId);
    Task<CoffeeRunDetailDto?> UpdateOrderStatusAsync(Guid runId, Guid orderId, UpdateOrderStatusRequest request, Guid currentUserId);

    Task<PagedResult<CoffeeRunMenuTemplateListDto>> GetTemplatesAsync(int page = 1, int pageSize = 20, string? scope = null, bool? includeArchived = null);
    Task<CoffeeRunMenuTemplateDetailDto> GetTemplateDetailAsync(Guid templateId, Guid memberId);
    Task<CoffeeRunMenuTemplateDetailDto> CreateTemplateAsync(Guid memberId, CreateMenuTemplateRequest request);
    Task<CoffeeRunMenuTemplateDetailDto> ImportTemplateAsync(Guid memberId, ImportMenuTemplateRequest request);
    Task<CoffeeRunMenuTemplateDetailDto> UpdateTemplateAsync(Guid templateId, Guid memberId, UpdateMenuTemplateRequest request);
    Task<bool> DeleteTemplateAsync(Guid templateId, Guid memberId, bool isTeamLead);
    Task<bool> ArchiveTemplateAsync(Guid templateId, Guid memberId, bool isTeamLead);
    Task<bool> RestoreTemplateAsync(Guid templateId, Guid memberId, bool isTeamLead);

    Task<CoffeeRunMenuTemplateDetailDto> AddTemplateItemAsync(Guid templateId, Guid memberId, CreateTemplateItemRequest request);
    Task<CoffeeRunMenuTemplateDetailDto> UpdateTemplateItemAsync(Guid templateId, Guid itemId, Guid memberId, UpdateTemplateItemRequest request);
    Task<bool> DeleteTemplateItemAsync(Guid templateId, Guid itemId, Guid memberId);
}
