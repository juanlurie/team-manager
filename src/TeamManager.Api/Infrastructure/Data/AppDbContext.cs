using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data.Configurations;

namespace TeamManager.Api.Infrastructure.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<TeamMember> TeamMembers => Set<TeamMember>();
    public DbSet<Invitation> Invitations => Set<Invitation>();
    public DbSet<PI> PIs => Set<PI>();
    public DbSet<Sprint> Sprints => Set<Sprint>();
    public DbSet<SprintMember> SprintMembers => Set<SprintMember>();
    public DbSet<WorkItem> WorkItems => Set<WorkItem>();
    public DbSet<Feature> Features => Set<Feature>();
    public DbSet<LeaveRecord> LeaveRecords => Set<LeaveRecord>();
    public DbSet<DiscussionPoint> DiscussionPoints => Set<DiscussionPoint>();
    public DbSet<Achievement> Achievements => Set<Achievement>();
    public DbSet<MemberAchievement> MemberAchievements => Set<MemberAchievement>();
    public DbSet<PointAward> PointAwards => Set<PointAward>();
    public DbSet<Comment> Comments => Set<Comment>();
    public DbSet<Wheel> Wheels => Set<Wheel>();
    public DbSet<WheelParticipant> WheelParticipants => Set<WheelParticipant>();
    public DbSet<MemberPersonal> MemberPersonals => Set<MemberPersonal>();
    public DbSet<MemberSkill> MemberSkills => Set<MemberSkill>();
    public DbSet<MemberSkillRating> MemberSkillRatings => Set<MemberSkillRating>();
    public DbSet<MemberNote> MemberNotes => Set<MemberNote>();
    public DbSet<MemberTask> MemberTasks => Set<MemberTask>();
    public DbSet<SprintVote> SprintVotes => Set<SprintVote>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfiguration(new TeamMemberConfiguration());
        modelBuilder.ApplyConfiguration(new PIConfiguration());
        modelBuilder.ApplyConfiguration(new SprintConfiguration());
        modelBuilder.ApplyConfiguration(new SprintMemberConfiguration());
        modelBuilder.ApplyConfiguration(new WorkItemConfiguration());
        modelBuilder.ApplyConfiguration(new FeatureConfiguration());
        modelBuilder.ApplyConfiguration(new LeaveRecordConfiguration());
        modelBuilder.ApplyConfiguration(new DiscussionPointConfiguration());
        modelBuilder.ApplyConfiguration(new AchievementConfiguration());
        modelBuilder.ApplyConfiguration(new MemberAchievementConfiguration());
        modelBuilder.ApplyConfiguration(new PointAwardConfiguration());
        modelBuilder.ApplyConfiguration(new CommentConfiguration());
        modelBuilder.ApplyConfiguration(new WheelConfiguration());
        modelBuilder.ApplyConfiguration(new WheelParticipantConfiguration());
        modelBuilder.ApplyConfiguration(new MemberPersonalConfiguration());
        modelBuilder.ApplyConfiguration(new MemberSkillConfiguration());
        modelBuilder.ApplyConfiguration(new MemberSkillRatingConfiguration());
        modelBuilder.ApplyConfiguration(new MemberNoteConfiguration());
        modelBuilder.ApplyConfiguration(new MemberTaskConfiguration());
        modelBuilder.ApplyConfiguration(new SprintVoteConfiguration());
        modelBuilder.ApplyConfiguration(new InvitationConfiguration());
    }
}
