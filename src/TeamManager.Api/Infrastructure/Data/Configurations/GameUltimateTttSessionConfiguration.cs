using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class GameUltimateTttSessionConfiguration : IEntityTypeConfiguration<GameUltimateTttSession>
{
    public void Configure(EntityTypeBuilder<GameUltimateTttSession> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Title).HasMaxLength(100);
        b.Property(x => x.Status).HasMaxLength(20).IsRequired();
        b.Property(x => x.CellsJson).HasMaxLength(300).IsRequired();
        b.Property(x => x.BigBoardJson).HasMaxLength(50).IsRequired();
        b.HasOne(x => x.CreatedBy).WithMany().HasForeignKey(x => x.CreatedByMemberId).OnDelete(DeleteBehavior.Restrict);
        b.HasMany(x => x.Participants).WithOne(x => x.Session).HasForeignKey(x => x.SessionId).OnDelete(DeleteBehavior.Cascade);
    }
}
