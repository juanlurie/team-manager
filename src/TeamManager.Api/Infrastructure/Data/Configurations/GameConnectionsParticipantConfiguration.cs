using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class GameConnectionsParticipantConfiguration : IEntityTypeConfiguration<GameConnectionsParticipant>
{
    public void Configure(EntityTypeBuilder<GameConnectionsParticipant> builder)
    {
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.HasOne(p => p.Member).WithMany()
            .HasForeignKey(p => p.MemberId).OnDelete(DeleteBehavior.Restrict);
    }
}
