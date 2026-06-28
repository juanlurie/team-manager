using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class GameThreesParticipantConfiguration : IEntityTypeConfiguration<GameThreesParticipant>
{
    public void Configure(EntityTypeBuilder<GameThreesParticipant> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.DisplayName).HasMaxLength(100).IsRequired();
        b.Property(x => x.BoardJson).HasMaxLength(500).IsRequired();
        b.HasOne(x => x.Member).WithMany().HasForeignKey(x => x.MemberId).OnDelete(DeleteBehavior.Restrict);
    }
}
