using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class RetroBoardSessionConfiguration : IEntityTypeConfiguration<RetroBoardSession>
{
    public void Configure(EntityTypeBuilder<RetroBoardSession> builder)
    {
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.HasOne(s => s.CreatedBy)
            .WithMany()
            .HasForeignKey(s => s.CreatedByMemberId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(s => s.Squad)
            .WithMany()
            .HasForeignKey(s => s.SquadId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(s => s.Sprint)
            .WithMany()
            .HasForeignKey(s => s.SprintId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(s => s.CreatedByMemberId).HasDatabaseName("IX_RetroBoardSession_CreatedByMemberId");
        builder.HasIndex(s => s.SquadId).HasDatabaseName("IX_RetroBoardSession_SquadId");

        // Only non-null slugs need to be unique (matches FunRetroSession).
        builder.HasIndex(s => s.Slug).IsUnique()
            .HasFilter("\"Slug\" IS NOT NULL")
            .HasDatabaseName("IX_RetroBoardSession_Slug");
    }
}
