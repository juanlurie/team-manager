using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class DotsAndBoxesSessionConfiguration : IEntityTypeConfiguration<DotsAndBoxesSession>
{
    public void Configure(EntityTypeBuilder<DotsAndBoxesSession> builder)
    {
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.HasOne(s => s.CreatedBy).WithMany()
            .HasForeignKey(s => s.CreatedByMemberId).OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(s => s.CurrentParticipant).WithMany()
            .HasForeignKey(s => s.CurrentParticipantId).OnDelete(DeleteBehavior.SetNull);

        builder.HasMany(s => s.Participants).WithOne(p => p.Session)
            .HasForeignKey(p => p.SessionId).OnDelete(DeleteBehavior.Cascade);
    }
}
