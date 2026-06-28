using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class QuizGameSessionConfiguration : IEntityTypeConfiguration<QuizGameSession>
{
    public void Configure(EntityTypeBuilder<QuizGameSession> builder)
    {
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(s => s.Title).HasMaxLength(200);

        builder.HasIndex(s => s.CreatedByMemberId).HasDatabaseName("IX_QuizGameSession_CreatedByMemberId");
        builder.HasIndex(s => s.Status).HasDatabaseName("IX_QuizGameSession_Status");

        builder.HasOne(s => s.CreatedByMember)
            .WithMany()
            .HasForeignKey(s => s.CreatedByMemberId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(s => s.Participants)
            .WithOne(p => p.Session)
            .HasForeignKey(p => p.SessionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(s => s.Answers)
            .WithOne(a => a.Session)
            .HasForeignKey(a => a.SessionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(s => s.MillionaireRounds)
            .WithOne(r => r.Session)
            .HasForeignKey(r => r.SessionId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
