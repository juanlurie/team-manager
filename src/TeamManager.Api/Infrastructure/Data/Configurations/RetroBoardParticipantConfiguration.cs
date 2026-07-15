using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class RetroBoardParticipantConfiguration : IEntityTypeConfiguration<RetroBoardParticipant>
{
    public void Configure(EntityTypeBuilder<RetroBoardParticipant> builder)
    {
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.HasOne(p => p.Session)
            .WithMany(s => s.Participants)
            .HasForeignKey(p => p.RetroBoardSessionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(p => p.Member)
            .WithMany()
            .HasForeignKey(p => p.MemberId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(p => new { p.RetroBoardSessionId, p.MemberId })
            .IsUnique()
            .HasDatabaseName("IX_RetroBoardParticipant_SessionId_MemberId");
    }
}
