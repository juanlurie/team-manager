using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class CoffeeRunMenuTemplateConfiguration : IEntityTypeConfiguration<CoffeeRunMenuTemplate>
{
    public void Configure(EntityTypeBuilder<CoffeeRunMenuTemplate> builder)
    {
        builder.HasKey(t => t.Id);
        builder.Property(t => t.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(t => t.Name).IsRequired().HasMaxLength(200);

        builder.HasOne(t => t.CreatedBy)
            .WithMany()
            .HasForeignKey(t => t.CreatedByMemberId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(t => t.Items)
            .WithOne(i => i.Template)
            .HasForeignKey(i => i.TemplateId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
