using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class MemberFeatureOverrideConfiguration : IEntityTypeConfiguration<MemberFeatureOverride>
{
    public void Configure(EntityTypeBuilder<MemberFeatureOverride> builder)
    {
        builder.HasKey(o => o.Id);
        builder.Property(o => o.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(o => o.FeatureKey).IsRequired().HasMaxLength(50);

        builder.HasIndex(o => new { o.TeamMemberId, o.FeatureKey }).IsUnique().HasDatabaseName("IX_MemberFeatureOverride_MemberId_FeatureKey");

        builder.HasOne(o => o.TeamMember)
            .WithMany()
            .HasForeignKey(o => o.TeamMemberId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
