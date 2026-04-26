using System;

namespace TeamManager.Api.Core.Models
{
    public class Invitation
    {
        public Guid Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public Role Role { get; set; }
        public DateTime SentAt { get; set; }
        public DateTime? AcceptedAt { get; set; }
        public string ExternalSubjectId { get; set; } = string.Empty;
    }
}
