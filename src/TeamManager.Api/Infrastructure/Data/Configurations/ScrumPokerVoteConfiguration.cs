using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class ScrumPokerVoteConfiguration : IEntityTypeConfiguration<ScrumPokerVote>
{
    public void Configure(EntityTypeBuilder<ScrumPokerVote> builder)
    {
        builder.HasKey(v => v.Id);
        builder.Property(v => v.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(v => v.Value).HasMaxLength(20);

        builder.HasIndex(v => v.SessionId).HasDatabaseName("IX_ScrumPokerVote_SessionId");
        builder.HasIndex(v => v.MemberId).HasDatabaseName("IX_ScrumPokerVote_MemberId");
        builder.HasIndex(v => new { v.SessionId, v.MemberId }).IsUnique().HasDatabaseName("IX_ScrumPokerVote_SessionId_MemberId");

        builder.HasOne(v => v.Session)
            .WithMany(s => s.Votes)
            .HasForeignKey(v => v.SessionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(v => v.Member)
            .WithMany()
            .HasForeignKey(v => v.MemberId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
