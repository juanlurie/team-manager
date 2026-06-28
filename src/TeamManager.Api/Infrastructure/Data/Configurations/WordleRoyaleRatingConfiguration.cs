using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class WordleRoyaleRatingConfiguration : IEntityTypeConfiguration<WordleRoyaleRating>
{
    public void Configure(EntityTypeBuilder<WordleRoyaleRating> builder)
    {
        builder.HasKey(r => r.MemberId);

        builder.HasOne(r => r.Member)
            .WithOne()
            .HasForeignKey<WordleRoyaleRating>(r => r.MemberId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(r => r.Elo).HasDatabaseName("IX_WordleRoyaleRating_Elo");
    }
}
