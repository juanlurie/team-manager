using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class WinVoteConfiguration : IEntityTypeConfiguration<WinVote>
{
    public void Configure(EntityTypeBuilder<WinVote> builder)
    {
        builder.HasKey(v => v.Id);
        builder.Property(v => v.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.HasIndex(v => new { v.WinNominationId, v.TeamMemberId }).IsUnique();

        builder.HasOne(v => v.WinNomination)
            .WithMany(n => n.Votes)
            .HasForeignKey(v => v.WinNominationId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(v => v.TeamMember)
            .WithMany()
            .HasForeignKey(v => v.TeamMemberId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
