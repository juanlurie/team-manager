using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class WordleParticipantConfiguration : IEntityTypeConfiguration<WordleParticipant>
{
    public void Configure(EntityTypeBuilder<WordleParticipant> builder)
    {
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.HasIndex(p => new { p.SessionId, p.MemberId }).IsUnique()
            .HasDatabaseName("IX_WordleParticipant_SessionId_MemberId");

        builder.HasOne(p => p.Member)
            .WithMany()
            .HasForeignKey(p => p.MemberId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
