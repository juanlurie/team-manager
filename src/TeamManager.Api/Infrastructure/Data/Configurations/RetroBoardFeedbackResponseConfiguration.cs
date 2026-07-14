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

        builder.HasOne(r => r.Member)
            .WithMany()
            .HasForeignKey(r => r.MemberId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(r => new { r.RetroBoardFeedbackPromptId, r.MemberId })
            .IsUnique()
            .HasDatabaseName("IX_RetroBoardFeedbackResponse_PromptId_MemberId");
    }
}
