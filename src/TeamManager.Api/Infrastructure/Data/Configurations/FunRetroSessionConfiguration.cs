using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class FunRetroSessionConfiguration : IEntityTypeConfiguration<FunRetroSession>
{
    public void Configure(EntityTypeBuilder<FunRetroSession> builder)
    {
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.HasOne(s => s.CreatedBy)
            .WithMany()
            .HasForeignKey(s => s.CreatedByMemberId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(s => s.Sprint)
            .WithMany()
            .HasForeignKey(s => s.SprintId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(s => s.CreatedByMemberId).HasDatabaseName("IX_FunRetroSession_CreatedByMemberId");

        // Partial index -- older sessions have a null Slug (backfilled lazily on next fetch,
        // not via a data migration), and only non-null slugs need to be unique.
        builder.HasIndex(s => s.Slug).IsUnique()
            .HasFilter("\"Slug\" IS NOT NULL")
            .HasDatabaseName("IX_FunRetroSession_Slug");
    }
}
