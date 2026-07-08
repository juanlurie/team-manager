using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class ProcessFlowNodeConfiguration : IEntityTypeConfiguration<ProcessFlowNode>
{
    public void Configure(EntityTypeBuilder<ProcessFlowNode> builder)
    {
        builder.HasKey(n => n.Id);
        builder.Property(n => n.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.HasOne(n => n.Session)
            .WithMany(s => s.Nodes)
            .HasForeignKey(n => n.SessionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(n => n.SessionId).HasDatabaseName("IX_ProcessFlowNode_SessionId");
    }
}
