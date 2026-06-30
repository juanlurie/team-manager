using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class WinMonthVoteConfiguration : IEntityTypeConfiguration<WinMonthVote>
{
    public void Configure(EntityTypeBuilder<WinMonthVote> builder)
    {
        builder.HasKey(v => v.Id);
        builder.Property(v => v.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.HasIndex(v => new { v.WinMonthNominationId, v.TeamMemberId }).IsUnique();

        builder.HasOne(v => v.Nomination)
            .WithMany(n => n.Votes)
            .HasForeignKey(v => v.WinMonthNominationId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(v => v.TeamMember)
            .WithMany()
            .HasForeignKey(v => v.TeamMemberId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
