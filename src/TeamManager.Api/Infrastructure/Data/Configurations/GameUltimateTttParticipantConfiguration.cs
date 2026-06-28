using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class GameUltimateTttParticipantConfiguration : IEntityTypeConfiguration<GameUltimateTttParticipant>
{
    public void Configure(EntityTypeBuilder<GameUltimateTttParticipant> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.DisplayName).HasMaxLength(100).IsRequired();
        b.HasOne(x => x.Member).WithMany().HasForeignKey(x => x.MemberId).IsRequired(false).OnDelete(DeleteBehavior.Restrict);
    }
}
