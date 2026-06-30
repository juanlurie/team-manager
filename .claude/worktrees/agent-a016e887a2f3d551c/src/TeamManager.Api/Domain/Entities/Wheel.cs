namespace TeamManager.Api.Domain.Entities;

public class Wheel
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<WheelParticipant> Participants { get; set; } = new List<WheelParticipant>();
}
