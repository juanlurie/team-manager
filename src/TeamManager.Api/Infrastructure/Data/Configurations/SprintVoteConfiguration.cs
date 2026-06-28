using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class SprintVoteConfiguration : IEntityTypeConfiguration<SprintVote>
{
    public void Configure(EntityTypeBuilder<SprintVote> builder)
    {
        builder.HasKey(v => v.Id);
        builder.Property(v => v.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.HasIndex(v => new { v.SprintId, v.VoterSprintMemberId }).IsUnique();
        builder.HasIndex(v => v.NomineeSprintMemberId);

        builder.HasOne(v => v.Sprint)
            .WithMany()
            .HasForeignKey(v => v.SprintId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(v => v.Voter)
            .WithMany()
            .HasForeignKey(v => v.VoterSprintMemberId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(v => v.Nominee)
            .WithMany()
            .HasForeignKey(v => v.NomineeSprintMemberId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
