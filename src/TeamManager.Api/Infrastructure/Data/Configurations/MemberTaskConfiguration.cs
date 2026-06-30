using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class MemberTaskConfiguration : IEntityTypeConfiguration<MemberTask>
{
    public void Configure(EntityTypeBuilder<MemberTask> builder)
    {
        builder.HasKey(t => t.Id);
        builder.Property(t => t.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(t => t.Title).IsRequired().HasMaxLength(500);

        builder.HasOne(t => t.TeamMember)
            .WithMany()
            .HasForeignKey(t => t.TeamMemberId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
