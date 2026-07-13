using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class RetroBoardCheckinQuestionConfiguration : IEntityTypeConfiguration<RetroBoardCheckinQuestion>
{
    public void Configure(EntityTypeBuilder<RetroBoardCheckinQuestion> builder)
    {
        builder.HasKey(q => q.Id);
        builder.Property(q => q.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.HasOne(q => q.Session)
            .WithMany(s => s.CheckinQuestions)
            .HasForeignKey(q => q.RetroBoardSessionId)
            .OnDelete(DeleteBehavior.Cascade);

        // Points at an action from a *previous* session; break the link if that action is deleted.
        builder.HasOne(q => q.SourceAction)
            .WithMany()
            .HasForeignKey(q => q.SourceActionId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(q => q.RetroBoardSessionId).HasDatabaseName("IX_RetroBoardCheckinQuestion_SessionId");
    }
}
