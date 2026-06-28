using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class MemberNoteConfiguration : IEntityTypeConfiguration<MemberNote>
{
    public void Configure(EntityTypeBuilder<MemberNote> builder)
    {
        builder.HasKey(n => n.Id);
        builder.Property(n => n.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(n => n.Text).IsRequired();

        builder.HasOne(n => n.TeamMember)
            .WithMany()
            .HasForeignKey(n => n.TeamMemberId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
