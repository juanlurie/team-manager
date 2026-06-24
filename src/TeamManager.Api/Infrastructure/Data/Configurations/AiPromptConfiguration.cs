using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class AiPromptConfiguration : IEntityTypeConfiguration<AiPrompt>
{
    public void Configure(EntityTypeBuilder<AiPrompt> builder)
    {
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(p => p.Key).HasMaxLength(100).IsRequired();
        builder.Property(p => p.Label).HasMaxLength(200);

        builder.HasIndex(p => p.Key).IsUnique().HasDatabaseName("IX_AiPrompt_Key");

        builder.HasOne(p => p.Connection)
            .WithMany()
            .HasForeignKey(p => p.ConnectionId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
