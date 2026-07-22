using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class RetroBoardFeedbackResponseConfiguration : IEntityTypeConfiguration<RetroBoardFeedbackResponse>
{
    public void Configure(EntityTypeBuilder<RetroBoardFeedbackResponse> builder)
    {
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.HasOne(r => r.Prompt)
            .WithMany(p => p.Responses)
            .HasForeignKey(r => r.RetroBoardFeedbackPromptId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Property(r => r.GuestSessionId).HasMaxLength(64);

        // Optional now that guests (no member) can respond; inferred from the nullable MemberId, stated
        // for clarity.
        builder.HasOne(r => r.Member)
            .WithMany()
            .HasForeignKey(r => r.MemberId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.Restrict);

        // One response per responder per prompt, per responder kind. Filtered so the NULL id of the
        // other kind never trips the uniqueness (a member row has a null GuestSessionId and vice versa).
        builder.HasIndex(r => new { r.RetroBoardFeedbackPromptId, r.MemberId })
            .IsUnique()
            .HasFilter("\"MemberId\" IS NOT NULL")
            .HasDatabaseName("IX_RetroBoardFeedbackResponse_PromptId_MemberId");
        builder.HasIndex(r => new { r.RetroBoardFeedbackPromptId, r.GuestSessionId })
            .IsUnique()
            .HasFilter("\"GuestSessionId\" IS NOT NULL")
            .HasDatabaseName("IX_RetroBoardFeedbackResponse_PromptId_GuestSessionId");
    }
}
