using TeamManager.Api.Application.DTOs.CoffeeRun;

namespace TeamManager.Api.Application.Services.Interfaces;

public interface ICoffeeRunService
{
    Task<IReadOnlyList<CoffeeRunListDto>> GetAllAsync();
    Task<CoffeeRunDetailDto> CreateAsync(Guid initiatorId, Guid? copyMenuFromRunId = null, Guid? fromTemplateId = null);
    Task<CoffeeRunDetailDto?> GetByIdAsync(Guid id, Guid currentUserId);
    Task<bool> DeleteAsync(Guid id, Guid currentUserId, bool isTeamLead);
    Task<CoffeeRunDetailDto?> CloseAsync(Guid id, Guid currentUserId);
    Task<CoffeeRunDetailDto?> AddMenuItemAsync(Guid runId, CreateMenuItemRequest request, Guid currentUserId);
    Task<CoffeeRunDetailDto?> UpdateMenuItemAsync(Guid runId, Guid itemId, UpdateMenuItemRequest request, Guid currentUserId);
    Task<DeleteMenuItemResult> DeleteMenuItemAsync(Guid runId, Guid itemId, Guid currentUserId);
    Task<(CoffeeRunDetailDto? Result, bool IsDuplicate)> CreateOrderAsync(Guid runId, CreateOrderRequest request, Guid currentUserId);
    Task<CoffeeRunDetailDto?> UpdateOrderAsync(Guid runId, Guid orderId, UpdateOrderRequest request, Guid currentUserId);
    Task<CoffeeRunDetailDto?> DeleteOrderAsync(Guid runId, Guid orderId, Guid currentUserId);

    Task<IReadOnlyList<CoffeeRunMenuTemplateListDto>> GetTemplatesAsync();
    Task<CoffeeRunMenuTemplateDetailDto> GetTemplateDetailAsync(Guid templateId, Guid memberId);
    Task<CoffeeRunMenuTemplateDetailDto> CreateTemplateAsync(Guid memberId, CreateMenuTemplateRequest request);
    Task<CoffeeRunMenuTemplateDetailDto> ImportTemplateAsync(Guid memberId, ImportMenuTemplateRequest request);
    Task<CoffeeRunMenuTemplateDetailDto> UpdateTemplateAsync(Guid templateId, Guid memberId, UpdateMenuTemplateRequest request);
    Task<bool> DeleteTemplateAsync(Guid templateId, Guid memberId);

    Task<CoffeeRunMenuTemplateDetailDto> AddTemplateItemAsync(Guid templateId, Guid memberId, CreateTemplateItemRequest request);
    Task<CoffeeRunMenuTemplateDetailDto> UpdateTemplateItemAsync(Guid templateId, Guid itemId, Guid memberId, UpdateTemplateItemRequest request);
    Task<bool> DeleteTemplateItemAsync(Guid templateId, Guid itemId, Guid memberId);
}
