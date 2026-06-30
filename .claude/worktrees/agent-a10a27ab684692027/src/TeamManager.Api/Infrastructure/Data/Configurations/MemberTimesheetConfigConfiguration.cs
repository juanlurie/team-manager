using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class MemberTimesheetConfigConfiguration : IEntityTypeConfiguration<MemberTimesheetConfig>
{
    public void Configure(EntityTypeBuilder<MemberTimesheetConfig> builder)
    {
        builder.HasKey(c => c.TeamMemberId);

        builder.HasOne(c => c.TeamMember)
            .WithOne()
            .HasForeignKey<MemberTimesheetConfig>(c => c.TeamMemberId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
