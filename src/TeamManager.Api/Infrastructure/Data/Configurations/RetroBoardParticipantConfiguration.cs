using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class RetroBoardParticipantConfiguration : IEntityTypeConfiguration<RetroBoardParticipant>
{
    public void Configure(EntityTypeBuilder<RetroBoardParticipant> builder)
    {
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.HasOne(p => p.Session)
            .WithMany(s => s.Participants)
            .HasForeignKey(p => p.RetroBoardSessionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Property(p => p.DisplayName).HasMaxLength(100);
        builder.Property(p => p.GuestSessionId).HasMaxLength(64);

        // Optional now that guests (no member) can be participants; EF infers this from the nullable
        // MemberId, but state it so the intent is explicit.
        builder.HasOne(p => p.Member)
            .WithMany()
            .HasForeignKey(p => p.MemberId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.Restrict);

        // One participant row per member per session. Filtered so the many guest rows (MemberId NULL)
        // are exempt rather than colliding.
        builder.HasIndex(p => new { p.RetroBoardSessionId, p.MemberId })
            .IsUnique()
            .HasFilter("\"MemberId\" IS NOT NULL")
            .HasDatabaseName("IX_RetroBoardParticipant_SessionId_MemberId");

        // The guest equivalent: one row per guest token per session, so rejoining with the same
        // token recognizes the returning guest instead of duplicating them.
        builder.HasIndex(p => new { p.RetroBoardSessionId, p.GuestSessionId })
            .IsUnique()
            .HasFilter("\"GuestSessionId\" IS NOT NULL")
            .HasDatabaseName("IX_RetroBoardParticipant_SessionId_GuestSessionId");
    }
}
