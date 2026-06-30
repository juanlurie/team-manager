using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Domain.Enums;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class TeamMemberConfiguration : IEntityTypeConfiguration<TeamMember>
{
    public void Configure(EntityTypeBuilder<TeamMember> builder)
    {
        builder.HasKey(m => m.Id);
        builder.Property(m => m.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(m => m.FirstName).IsRequired().HasMaxLength(100);
        builder.Property(m => m.LastName).IsRequired().HasMaxLength(100);
        builder.Property(m => m.Email).IsRequired().HasMaxLength(255);
        builder.HasIndex(m => m.Email).IsUnique();
        builder.Property(m => m.Role).HasConversion<string>();
        builder.Property(m => m.Crafts)
            .HasColumnType("text")
            .HasConversion(
                v => System.Text.Json.JsonSerializer.Serialize(v, (System.Text.Json.JsonSerializerOptions?)null),
                v => System.Text.Json.JsonSerializer.Deserialize<List<string>>(v, (System.Text.Json.JsonSerializerOptions?)null) ?? new List<string>()
            )
            .IsRequired()
            .HasDefaultValueSql("'[]'");

        builder.HasOne(m => m.TeamLead)
            .WithMany(m => m.DirectReports)
            .HasForeignKey(m => m.TeamLeadId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
