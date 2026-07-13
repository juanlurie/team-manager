using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class RetroBoardParticipantProgressConfiguration : IEntityTypeConfiguration<RetroBoardParticipantProgress>
{
    public void Configure(EntityTypeBuilder<RetroBoardParticipantProgress> builder)
    {
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.HasOne(p => p.Participant)
            .WithMany(x => x.Progress)
            .HasForeignKey(p => p.RetroBoardParticipantId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(p => new { p.RetroBoardParticipantId, p.Phase })
            .IsUnique()
            .HasDatabaseName("IX_RetroBoardParticipantProgress_ParticipantId_Phase");
    }
}
