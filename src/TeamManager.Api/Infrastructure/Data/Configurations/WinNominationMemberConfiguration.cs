using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class WinNominationMemberConfiguration : IEntityTypeConfiguration<WinNominationMember>
{
    public void Configure(EntityTypeBuilder<WinNominationMember> builder)
    {
        builder.HasKey(x => new { x.WinNominationId, x.TeamMemberId });
        builder.HasOne(x => x.WinNomination)
            .WithMany(x => x.Nominees)
            .HasForeignKey(x => x.WinNominationId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(x => x.TeamMember)
            .WithMany()
            .HasForeignKey(x => x.TeamMemberId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
