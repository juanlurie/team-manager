using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class MilestoneCriterionConfiguration : IEntityTypeConfiguration<MilestoneCriterion>
{
    public void Configure(EntityTypeBuilder<MilestoneCriterion> builder)
    {
        builder.HasKey(mc => mc.Id);
        builder.Property(mc => mc.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(mc => mc.Label).IsRequired();

        builder.HasOne(mc => mc.Milestone)
            .WithMany(m => m.Criteria)
            .HasForeignKey(mc => mc.MilestoneId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
