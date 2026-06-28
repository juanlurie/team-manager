using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class WordleGuessConfiguration : IEntityTypeConfiguration<WordleGuess>
{
    public void Configure(EntityTypeBuilder<WordleGuess> builder)
    {
        builder.HasKey(g => g.Id);
        builder.Property(g => g.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(g => g.Word).HasMaxLength(10).IsRequired();

        builder.HasIndex(g => new { g.SessionId, g.MemberId, g.GuessIndex }).IsUnique()
            .HasDatabaseName("IX_WordleGuess_SessionId_MemberId_GuessIndex");
    }
}
