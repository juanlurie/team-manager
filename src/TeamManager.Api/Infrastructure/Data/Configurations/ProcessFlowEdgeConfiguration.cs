using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class ProcessFlowEdgeConfiguration : IEntityTypeConfiguration<ProcessFlowEdge>
{
    public void Configure(EntityTypeBuilder<ProcessFlowEdge> builder)
    {
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.HasOne(e => e.Session)
            .WithMany(s => s.Edges)
            .HasForeignKey(e => e.SessionId)
            .OnDelete(DeleteBehavior.Cascade);

        // No FK-level cascade from node -> edge (two FKs to the same entity would create
        // ambiguous cascade paths); ProcessFlowService.DeleteNodeAsync explicitly removes any
        // edge touching the deleted node before/with the node itself.
        builder.HasOne<ProcessFlowNode>()
            .WithMany()
            .HasForeignKey(e => e.FromNodeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<ProcessFlowNode>()
            .WithMany()
            .HasForeignKey(e => e.ToNodeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(e => e.SessionId).HasDatabaseName("IX_ProcessFlowEdge_SessionId");
        builder.HasIndex(e => e.FromNodeId).HasDatabaseName("IX_ProcessFlowEdge_FromNodeId");
        builder.HasIndex(e => e.ToNodeId).HasDatabaseName("IX_ProcessFlowEdge_ToNodeId");
    }
}
