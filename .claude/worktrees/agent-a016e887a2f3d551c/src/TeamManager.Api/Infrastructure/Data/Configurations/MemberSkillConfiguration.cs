using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class MemberSkillConfiguration : IEntityTypeConfiguration<MemberSkill>
{
    public void Configure(EntityTypeBuilder<MemberSkill> builder)
    {
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(s => s.Name).IsRequired().HasMaxLength(100);
        builder.Property(s => s.Category).HasMaxLength(50);

        builder.HasOne(s => s.TeamMember)
            .WithMany()
            .HasForeignKey(s => s.TeamMemberId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(s => s.Ratings)
            .WithOne(r => r.MemberSkill)
            .HasForeignKey(r => r.MemberSkillId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
