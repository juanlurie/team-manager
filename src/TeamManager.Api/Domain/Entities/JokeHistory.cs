using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Domain.Entities;

public class JokeHistory
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    public string JokeTypeId { get; set; } = "";
    public string JokeText { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
