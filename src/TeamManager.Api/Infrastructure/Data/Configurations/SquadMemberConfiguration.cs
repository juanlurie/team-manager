using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class SquadMemberConfiguration : IEntityTypeConfiguration<SquadMember>
{
    public void Configure(EntityTypeBuilder<SquadMember> builder)
    {
        builder.HasKey(sm => sm.Id);
        builder.Property(sm => sm.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.HasIndex(sm => new { sm.SquadId, sm.TeamMemberId }).IsUnique();

        builder.HasOne(sm => sm.Squad)
            .WithMany(s => s.Members)
            .HasForeignKey(sm => sm.SquadId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(sm => sm.TeamMember)
            .WithMany(m => m.SquadMemberships)
            .HasForeignKey(sm => sm.TeamMemberId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
