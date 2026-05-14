using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class SessionDefinitionSlotConfiguration : IEntityTypeConfiguration<SessionDefinitionSlot>
{
    public void Configure(EntityTypeBuilder<SessionDefinitionSlot> builder)
    {
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.HasOne(s => s.SessionDefinition)
            .WithMany(sd => sd.Slots)
            .HasForeignKey(s => s.SessionDefinitionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(s => s.Location)
            .WithMany()
            .HasForeignKey(s => s.LocationId)
            .OnDelete(DeleteBehavior.SetNull)
            .IsRequired(false);
    }
}
