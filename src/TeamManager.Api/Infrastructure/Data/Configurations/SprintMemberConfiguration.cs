using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class SprintMemberConfiguration : IEntityTypeConfiguration<SprintMember>
{
    public void Configure(EntityTypeBuilder<SprintMember> builder)
    {
        builder.HasKey(sm => sm.Id);
        builder.Property(sm => sm.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.HasIndex(sm => new { sm.SprintId, sm.TeamMemberId }).IsUnique();

        builder.HasOne(sm => sm.Sprint)
            .WithMany(s => s.SprintMembers)
            .HasForeignKey(sm => sm.SprintId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(sm => sm.TeamMember)
            .WithMany(m => m.SprintMemberships)
            .HasForeignKey(sm => sm.TeamMemberId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
