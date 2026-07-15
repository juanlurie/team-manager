using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class RetroBoardFeedbackPromptConfiguration : IEntityTypeConfiguration<RetroBoardFeedbackPrompt>
{
    public void Configure(EntityTypeBuilder<RetroBoardFeedbackPrompt> builder)
    {
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.HasOne(p => p.Session)
            .WithMany(s => s.FeedbackPrompts)
            .HasForeignKey(p => p.RetroBoardSessionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(p => p.RetroBoardSessionId).HasDatabaseName("IX_RetroBoardFeedbackPrompt_SessionId");
    }
}
