using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class PointAwardConfiguration : IEntityTypeConfiguration<PointAward>
{
    public void Configure(EntityTypeBuilder<PointAward> builder)
    {
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(p => p.Reason).HasMaxLength(200);

        builder.HasOne(p => p.TeamMember)
            .WithMany(m => m.PointAwards)
            .HasForeignKey(p => p.TeamMemberId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
