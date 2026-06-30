using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class WordleRoyaleMatchConfiguration : IEntityTypeConfiguration<WordleRoyaleMatch>
{
    public void Configure(EntityTypeBuilder<WordleRoyaleMatch> builder)
    {
        builder.HasKey(m => m.Id);
        builder.Property(m => m.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.HasIndex(m => m.SessionId).HasDatabaseName("IX_WordleRoyaleMatch_SessionId");
        builder.HasIndex(m => new { m.Year, m.IsoWeek }).HasDatabaseName("IX_WordleRoyaleMatch_Week");
        builder.HasIndex(m => new { m.Player1Id, m.Year, m.IsoWeek }).HasDatabaseName("IX_WordleRoyaleMatch_Player1Week");
        builder.HasIndex(m => new { m.Player2Id, m.Year, m.IsoWeek }).HasDatabaseName("IX_WordleRoyaleMatch_Player2Week");

        builder.HasOne(m => m.Session)
            .WithMany()
            .HasForeignKey(m => m.SessionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(m => m.Player1)
            .WithMany()
            .HasForeignKey(m => m.Player1Id)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(m => m.Player2)
            .WithMany()
            .HasForeignKey(m => m.Player2Id)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
