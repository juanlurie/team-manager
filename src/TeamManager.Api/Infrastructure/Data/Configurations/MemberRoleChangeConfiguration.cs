using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class MemberRoleChangeConfiguration : IEntityTypeConfiguration<MemberRoleChange>
{
    public void Configure(EntityTypeBuilder<MemberRoleChange> builder)
    {
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).HasDefaultValueSql("gen_random_uuid()");
        // Stored as names, like TeamMember.Role -- an audit row read months later should not
        // depend on the enum's ordinals still meaning what they did when it was written.
        builder.Property(c => c.FromRole).HasConversion<string>().HasMaxLength(50);
        builder.Property(c => c.ToRole).HasConversion<string>().HasMaxLength(50);
        builder.HasIndex(c => new { c.MemberId, c.CreatedAt });

        // No FK to TeamMember in either direction: an audit row must outlive the rows it
        // describes, and must never be the reason a delete fails.
    }
}
