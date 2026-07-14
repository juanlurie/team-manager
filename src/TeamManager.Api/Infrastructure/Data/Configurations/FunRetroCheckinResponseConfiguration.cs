using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class FunRetroCheckinResponseConfiguration : IEntityTypeConfiguration<FunRetroCheckinResponse>
{
    public void Configure(EntityTypeBuilder<FunRetroCheckinResponse> builder)
    {
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(r => r.Rating).IsRequired();

        builder.HasOne(r => r.Question)
            .WithMany(q => q.Responses)
            .HasForeignKey(r => r.QuestionId)
            .OnDelete(DeleteBehavior.Cascade);

        // One response per member per question -- upserted on re-rate.
        builder.HasIndex(r => new { r.QuestionId, r.MemberId }).IsUnique()
            .HasDatabaseName("IX_FunRetroCheckinResponse_Question_Member");
    }
}
