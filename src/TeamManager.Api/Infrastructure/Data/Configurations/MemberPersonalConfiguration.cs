using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class MemberPersonalConfiguration : IEntityTypeConfiguration<MemberPersonal>
{
    public void Configure(EntityTypeBuilder<MemberPersonal> builder)
    {
        builder.HasKey(p => p.TeamMemberId);

        builder.HasOne(p => p.TeamMember)
            .WithOne()
            .HasForeignKey<MemberPersonal>(p => p.TeamMemberId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
