using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class ScrumPokerSessionConfiguration : IEntityTypeConfiguration<ScrumPokerSession>
{
    public void Configure(EntityTypeBuilder<ScrumPokerSession> builder)
    {
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(s => s.Title).IsRequired().HasMaxLength(200);
        builder.Property(s => s.StoryTitle).HasMaxLength(500);
        builder.Property(s => s.Description).HasMaxLength(2000);
        builder.Property(s => s.Scale).IsRequired().HasMaxLength(50);

        builder.HasIndex(s => s.CreatedByMemberId).HasDatabaseName("IX_ScrumPokerSession_CreatedByMemberId");
        builder.HasIndex(s => s.CreatedAt).HasDatabaseName("IX_ScrumPokerSession_CreatedAt");

        builder.HasOne(s => s.CreatedByMember)
            .WithMany()
            .HasForeignKey(s => s.CreatedByMemberId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(s => s.Votes)
            .WithOne(v => v.Session)
            .HasForeignKey(v => v.SessionId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
