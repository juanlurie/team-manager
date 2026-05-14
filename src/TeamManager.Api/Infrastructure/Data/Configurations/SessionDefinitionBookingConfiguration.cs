using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class SessionDefinitionBookingConfiguration : IEntityTypeConfiguration<SessionDefinitionBooking>
{
    public void Configure(EntityTypeBuilder<SessionDefinitionBooking> builder)
    {
        builder.HasKey(b => b.Id);
        builder.Property(b => b.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(b => b.Notes).HasMaxLength(500).IsRequired(false);

        builder.HasOne(b => b.Slot)
            .WithMany(s => s.Bookings)
            .HasForeignKey(b => b.SessionDefinitionSlotId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(b => b.TeamMember)
            .WithMany()
            .HasForeignKey(b => b.TeamMemberId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(b => new { b.SessionDefinitionSlotId, b.TeamMemberId }).IsUnique();
    }
}
