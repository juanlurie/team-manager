using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class QuizMillionaireRoundConfiguration : IEntityTypeConfiguration<QuizMillionaireRound>
{
    public void Configure(EntityTypeBuilder<QuizMillionaireRound> builder)
    {
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.HasIndex(r => new { r.SessionId, r.RoundIndex }).IsUnique()
            .HasDatabaseName("IX_QuizMillionaireRound_SessionId_RoundIndex");
    }
}
