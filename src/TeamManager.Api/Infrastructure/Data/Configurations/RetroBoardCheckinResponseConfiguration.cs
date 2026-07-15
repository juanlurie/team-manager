using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class RetroBoardCheckinResponseConfiguration : IEntityTypeConfiguration<RetroBoardCheckinResponse>
{
    public void Configure(EntityTypeBuilder<RetroBoardCheckinResponse> builder)
    {
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.HasOne(r => r.Question)
            .WithMany(q => q.Responses)
            .HasForeignKey(r => r.RetroBoardCheckinQuestionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(r => r.Member)
            .WithMany()
            .HasForeignKey(r => r.MemberId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(r => new { r.RetroBoardCheckinQuestionId, r.MemberId })
            .IsUnique()
            .HasDatabaseName("IX_RetroBoardCheckinResponse_QuestionId_MemberId");
    }
}
