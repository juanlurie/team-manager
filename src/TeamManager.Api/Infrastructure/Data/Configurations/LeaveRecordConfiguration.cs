using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class LeaveRecordConfiguration : IEntityTypeConfiguration<LeaveRecord>
{
    public void Configure(EntityTypeBuilder<LeaveRecord> builder)
    {
        builder.HasKey(l => l.Id);
        builder.Property(l => l.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(l => l.Type).HasConversion<string>();
        builder.Property(l => l.DaysCount).HasPrecision(5, 1);

        builder.HasOne(l => l.TeamMember)
            .WithMany(m => m.LeaveRecords)
            .HasForeignKey(l => l.TeamMemberId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
