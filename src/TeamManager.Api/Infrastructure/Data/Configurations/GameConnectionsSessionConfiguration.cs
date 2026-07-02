using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class GameConnectionsSessionConfiguration : IEntityTypeConfiguration<GameConnectionsSession>
{
    public void Configure(EntityTypeBuilder<GameConnectionsSession> builder)
    {
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.HasOne(s => s.CreatedByMember).WithMany()
            .HasForeignKey(s => s.CreatedByMemberId).OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(s => s.Participants).WithOne(p => p.Session)
            .HasForeignKey(p => p.SessionId).OnDelete(DeleteBehavior.Cascade);

        // Guesses are collaborative -- any participant can submit against the same shared
        // MistakesUsed/SolvedGroupsJson fields at any time, unlike DotsAndBoxes' turn-gating
        // or Wordle's per-participant isolation. Guard the resulting race with Postgres's
        // built-in xmin column as an optimistic-concurrency token (zero migration cost --
        // this Npgsql EF Core version doesn't ship the UseXminAsConcurrencyToken() sugar
        // method, so map the shadow property manually).
        builder.Property<uint>("xmin")
            .IsRowVersion()
            .HasColumnName("xmin")
            .HasColumnType("xid");
    }
}
