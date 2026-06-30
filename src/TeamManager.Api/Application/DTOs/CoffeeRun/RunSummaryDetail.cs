namespace TeamManager.Api.Application.DTOs.CoffeeRun;

public record RunSummaryDetail(
    Guid RunId,
    decimal GrandTotal,
    int TotalItems,
    List<PersonSummary> People,
    List<ItemSummary> Items
);

public record PersonSummary(
    Guid MemberId,
    string MemberName,
    decimal Total,
    int ItemCount
);

public record ItemSummary(
    string Name,
    string? Category,
    int TotalQuantity,
    decimal TotalAmount
);
