using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class FunRetroCheckinQuestionConfiguration : IEntityTypeConfiguration<FunRetroCheckinQuestion>
{
    public void Configure(EntityTypeBuilder<FunRetroCheckinQuestion> builder)
    {
        builder.HasKey(q => q.Id);
        builder.Property(q => q.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(q => q.Text).IsRequired();

        builder.HasOne(q => q.Session)
            .WithMany(s => s.CheckinQuestions)
            .HasForeignKey(q => q.SessionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(q => q.SessionId)
            .HasDatabaseName("IX_FunRetroCheckinQuestion_SessionId");
    }
}
