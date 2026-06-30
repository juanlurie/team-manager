using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class Game2048SessionConfiguration : IEntityTypeConfiguration<Game2048Session>
{
    public void Configure(EntityTypeBuilder<Game2048Session> builder)
    {
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.HasOne(s => s.CreatedBy).WithMany()
            .HasForeignKey(s => s.CreatedByMemberId).OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(s => s.Participants).WithOne(p => p.Session)
            .HasForeignKey(p => p.SessionId).OnDelete(DeleteBehavior.Cascade);
    }
}
