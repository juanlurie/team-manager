using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class RetroVoteConfiguration : IEntityTypeConfiguration<RetroVote>
{
    public void Configure(EntityTypeBuilder<RetroVote> builder)
    {
        builder.HasKey(v => v.Id);
        builder.Property(v => v.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.HasOne(v => v.Card)
            .WithMany(c => c.Votes)
            .HasForeignKey(v => v.CardId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(v => v.CardId);
        builder.HasIndex(v => new { v.CardId, v.VoterId }).IsUnique();
    }
}
