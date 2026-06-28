using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class QuizGameAnswerConfiguration : IEntityTypeConfiguration<QuizGameAnswer>
{
    public void Configure(EntityTypeBuilder<QuizGameAnswer> builder)
    {
        builder.HasKey(a => a.Id);
        builder.Property(a => a.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.HasIndex(a => new { a.SessionId, a.QuestionIndex, a.MemberId }).IsUnique()
            .HasDatabaseName("IX_QuizGameAnswer_SessionId_QuestionIndex_MemberId");
    }
}
