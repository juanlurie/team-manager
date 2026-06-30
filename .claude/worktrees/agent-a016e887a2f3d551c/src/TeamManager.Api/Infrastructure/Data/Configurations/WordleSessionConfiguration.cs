using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class WordleSessionConfiguration : IEntityTypeConfiguration<WordleSession>
{
    public void Configure(EntityTypeBuilder<WordleSession> builder)
    {
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(s => s.Title).HasMaxLength(200);
        builder.Property(s => s.Word).HasMaxLength(10).IsRequired();

        builder.HasIndex(s => s.CreatedByMemberId).HasDatabaseName("IX_WordleSession_CreatedByMemberId");
        builder.HasIndex(s => s.Status).HasDatabaseName("IX_WordleSession_Status");

        builder.HasOne(s => s.CreatedByMember)
            .WithMany()
            .HasForeignKey(s => s.CreatedByMemberId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(s => s.Participants)
            .WithOne(p => p.Session)
            .HasForeignKey(p => p.SessionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(s => s.Guesses)
            .WithOne(g => g.Session)
            .HasForeignKey(g => g.SessionId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
