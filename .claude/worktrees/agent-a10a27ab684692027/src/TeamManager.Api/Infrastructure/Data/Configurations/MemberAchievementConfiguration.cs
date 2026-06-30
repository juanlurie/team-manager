using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class MemberAchievementConfiguration : IEntityTypeConfiguration<MemberAchievement>
{
    public void Configure(EntityTypeBuilder<MemberAchievement> builder)
    {
        builder.HasKey(ma => ma.Id);
        builder.Property(ma => ma.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.HasOne(ma => ma.TeamMember)
            .WithMany(m => m.Achievements)
            .HasForeignKey(ma => ma.TeamMemberId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(ma => ma.Achievement)
            .WithMany(a => a.MemberAchievements)
            .HasForeignKey(ma => ma.AchievementId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
