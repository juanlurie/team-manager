using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class RetroBoardActionConfiguration : IEntityTypeConfiguration<RetroBoardAction>
{
    public void Configure(EntityTypeBuilder<RetroBoardAction> builder)
    {
        builder.HasKey(a => a.Id);
        builder.Property(a => a.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.HasOne(a => a.Session)
            .WithMany(s => s.Actions)
            .HasForeignKey(a => a.RetroBoardSessionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(a => a.SourceNote)
            .WithMany()
            .HasForeignKey(a => a.SourceNoteId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(a => a.Owner)
            .WithMany()
            .HasForeignKey(a => a.OwnerMemberId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(a => a.RetroBoardSessionId).HasDatabaseName("IX_RetroBoardAction_SessionId");
    }
}
