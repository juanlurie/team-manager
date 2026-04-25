using AutoMapper;
using TeamManager.Api.Application.DTOs.Achievement;
using TeamManager.Api.Application.DTOs.Dashboard;
using TeamManager.Api.Application.DTOs.LeaveRecord;
using TeamManager.Api.Application.DTOs.PI;
using TeamManager.Api.Application.DTOs.Sprint;
using TeamManager.Api.Application.DTOs.TeamMember;
using TeamManager.Api.Application.DTOs.WorkItem;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Application.Mappings;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        CreateMap<MemberAchievement, BadgeDto>()
            .ForMember(d => d.Icon, o => o.MapFrom(s => s.Achievement.Icon))
            .ForMember(d => d.Name, o => o.MapFrom(s => s.Achievement.Name))
            .ForMember(d => d.Category, o => o.MapFrom(s => s.Achievement.Category));

        CreateMap<TeamMember, TeamMemberDto>()
            .ForMember(d => d.Role, o => o.MapFrom(s => s.Role.ToString()))
            .ForMember(d => d.TeamLeadName, o => o.MapFrom(s =>
                s.TeamLead != null ? $"{s.TeamLead.FirstName} {s.TeamLead.LastName}" : null))
            .ForMember(d => d.Achievements, o => o.MapFrom(s => s.Achievements));

        CreateMap<PI, PIDto>();

        CreateMap<Sprint, SprintDto>()
            .ForMember(d => d.PiName, o => o.MapFrom(s => s.PI != null ? s.PI.Name : null))
            .ForMember(d => d.PiId, o => o.MapFrom(s => s.PIId));

        CreateMap<WorkItem, WorkItemDto>()
            .ForMember(d => d.Type, o => o.MapFrom(s => s.Type.ToString()))
            .ForMember(d => d.Status, o => o.MapFrom(s => s.Status.ToString()));

        CreateMap<LeaveRecord, LeaveRecordDto>()
            .ForMember(d => d.MemberName, o => o.MapFrom(s => $"{s.TeamMember.FirstName} {s.TeamMember.LastName}"))
            .ForMember(d => d.Type, o => o.MapFrom(s => s.Type.ToString()));
    }
}
