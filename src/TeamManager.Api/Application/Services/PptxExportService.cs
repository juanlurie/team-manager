using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Drawing;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Presentation;
using TeamManager.Api.Application.DTOs.Dashboard;
using TeamManager.Api.Application.DTOs.WorkItem;
using TeamManager.Api.Application.Services.Interfaces;

namespace TeamManager.Api.Application.Services;

public class PptxExportService : IPptxExportService
{
    private static readonly Dictionary<string, Func<MemberSprintCardDto, SprintDashboardDto, string>> ScalarPlaceholders = new()
    {
        ["{{MEMBER_FULL_NAME}}"] = (m, _) => m.FullName,
        ["{{MEMBER_FIRST_NAME}}"] = (m, _) => m.FullName.Split(' ').First(),
        ["{{MEMBER_ROLE}}"] = (m, _) => m.Role,
        ["{{TEAM_LEAD_NAME}}"] = (m, _) => m.TeamLeadName ?? "",
        ["{{SPRINT_NAME}}"] = (_, d) => d.Sprint.Name,
        ["{{SPRINT_DATES}}"] = (_, d) => $"{d.Sprint.StartDate:MMM d} – {d.Sprint.EndDate:MMM d, yyyy}",
        ["{{PI_NAME}}"] = (_, d) => d.Sprint.PiName ?? "",
        ["{{NOTES}}"] = (m, _) => m.Notes ?? "",
        ["{{LEAVE_SUMMARY}}"] = (m, _) => BuildLeaveSummary(m),
        ["{{LEAVE_DATES}}"] = (m, _) => BuildLeaveDates(m),
        ["{{LEAVE_DAYS_TOTAL}}"] = (m, _) => m.LeaveRecords.Sum(l => l.DaysCount).ToString("0.#"),
        ["{{MEMBER_SQUADS}}"] = (m, _) => m.SquadNames.Count > 0 ? string.Join(", ", m.SquadNames) : "",
    };

    private static readonly Dictionary<string, Func<MemberSprintCardDto, IEnumerable<string>>> ListPlaceholders = new()
    {
        ["{{RELEASES}}"] = m => m.WorkItems.Where(w => w.Type == "Release").Select(FormatWorkItem),
        ["{{WORK_ITEMS_ALL}}"] = m => m.WorkItems.Select(FormatWorkItem),
        ["{{WORK_ITEMS_FEATURES}}"] = m => m.WorkItems.Where(w => w.Type == "Feature").Select(FormatWorkItem),
        ["{{WORK_ITEMS_BUGS}}"] = m => m.WorkItems.Where(w => w.Type == "Bug").Select(FormatWorkItem),
        ["{{WORK_ITEMS_TASKS}}"] = m => m.WorkItems.Where(w => w.Type == "Task").Select(FormatWorkItem),
        ["{{WORK_ITEMS_COMPLETED}}"] = m => m.WorkItems.Where(w => w.Status == "Completed").Select(FormatWorkItem),
        ["{{WORK_ITEMS_IN_PROGRESS}}"] = m => m.WorkItems.Where(w => w.Status == "InProgress").Select(FormatWorkItem),
        ["{{WORK_ITEMS_PLANNED}}"] = m => m.WorkItems.Where(w => w.Status == "Planned").Select(FormatWorkItem),
    };

    private static readonly Dictionary<string, Func<SprintDashboardDto, string>> SummaryPlaceholders = new()
    {
        ["{{SUMMARY_TOTAL_MEMBERS}}"] = d => d.Members.Count.ToString(),
        ["{{SUMMARY_COMPLETED_COUNT}}"] = d => d.Members.SelectMany(m => m.WorkItems).Count(w => w.Status == "Completed").ToString(),
        ["{{SUMMARY_IN_PROGRESS_COUNT}}"] = d => d.Members.SelectMany(m => m.WorkItems).Count(w => w.Status == "InProgress").ToString(),
        ["{{SUMMARY_PLANNED_COUNT}}"] = d => d.Members.SelectMany(m => m.WorkItems).Count(w => w.Status == "Planned").ToString(),
        ["{{SUMMARY_TOTAL_LEAVE_DAYS}}"] = d => d.Members.SelectMany(m => m.LeaveRecords).Sum(l => l.DaysCount).ToString("0.#"),
    };

    public Task<byte[]> GenerateAsync(Stream templateStream, SprintDashboardDto dashboard)
    {
        using var memStream = new MemoryStream();
        templateStream.CopyTo(memStream);
        memStream.Position = 0;

        using (var presentation = PresentationDocument.Open(memStream, true))
        {
            var presentationPart = presentation.PresentationPart!;
            var templateSlideId = FindTemplateSlideId(presentationPart, dashboard);
            var summarySlideId = FindSummarySlideId(presentationPart);

            // Fill summary slide first (if present and not the template)
            if (summarySlideId is not null && summarySlideId != templateSlideId)
            {
                var summaryPart = (SlidePart)presentationPart.GetPartById(summarySlideId);
                FillSummarySlidePlaceholders(summaryPart, dashboard);
            }

            // Clone the template slide for each member
            var templatePart = (SlidePart)presentationPart.GetPartById(templateSlideId!);
            var insertionIndex = GetSlideIndex(presentationPart, templateSlideId!) + 1;

            foreach (var member in dashboard.Members)
            {
                var clonedPart = CloneSlide(presentationPart, templatePart, insertionIndex++);
                FillMemberSlidePlaceholders(clonedPart, member, dashboard);
            }

            // Remove the original template slide
            RemoveSlide(presentationPart, templateSlideId!);
        }

        return Task.FromResult(memStream.ToArray());
    }

    private static string? FindTemplateSlideId(PresentationPart part, SprintDashboardDto dashboard)
    {
        // Template slide is identified by containing any member-scoped placeholder
        foreach (var slideId in GetSlideIds(part))
        {
            var slidePart = (SlidePart)part.GetPartById(slideId);
            var text = GetAllText(slidePart);
            if (ScalarPlaceholders.Keys.Any(k => text.Contains(k)) ||
                ListPlaceholders.Keys.Any(k => text.Contains(k)))
                return slideId;
        }
        return GetSlideIds(part).FirstOrDefault();
    }

    private static string? FindSummarySlideId(PresentationPart part)
    {
        foreach (var slideId in GetSlideIds(part))
        {
            var slidePart = (SlidePart)part.GetPartById(slideId);
            var text = GetAllText(slidePart);
            if (SummaryPlaceholders.Keys.Any(k => text.Contains(k)))
                return slideId;
        }
        return null;
    }

    private static IEnumerable<string> GetSlideIds(PresentationPart part) =>
        part.Presentation.SlideIdList?
            .Elements<SlideId>()
            .Select(sid => sid.RelationshipId?.Value ?? "")
            .Where(id => !string.IsNullOrEmpty(id))
        ?? [];

    private static string GetAllText(SlidePart slidePart)
    {
        var texts = slidePart.Slide.Descendants<DocumentFormat.OpenXml.Drawing.Text>()
            .Select(t => t.Text);
        return string.Concat(texts);
    }

    private static int GetSlideIndex(PresentationPart part, string relationshipId)
    {
        var ids = GetSlideIds(part).ToList();
        return ids.IndexOf(relationshipId);
    }

    private static SlidePart CloneSlide(PresentationPart presentationPart, SlidePart templatePart, int insertionIndex)
    {
        var clonedSlide = (Slide)templatePart.Slide.CloneNode(true);
        var newSlidePart = presentationPart.AddNewPart<SlidePart>();
        newSlidePart.Slide = clonedSlide;

        // Copy layout reference
        var layoutPart = templatePart.SlideLayoutPart!;
        newSlidePart.AddPart(layoutPart);

        // Insert at the correct position
        var slideIdList = presentationPart.Presentation.SlideIdList!;
        uint maxId = slideIdList.Elements<SlideId>().Max(sid => sid.Id?.Value ?? 0u);
        var newSlideId = new SlideId
        {
            Id = maxId + 1,
            RelationshipId = presentationPart.GetIdOfPart(newSlidePart)
        };

        var slideIds = slideIdList.Elements<SlideId>().ToList();
        if (insertionIndex >= slideIds.Count)
            slideIdList.AppendChild(newSlideId);
        else
            slideIdList.InsertBefore(newSlideId, slideIds[insertionIndex]);

        clonedSlide.Save();
        presentationPart.Presentation.Save();

        return newSlidePart;
    }

    private static void RemoveSlide(PresentationPart presentationPart, string relationshipId)
    {
        var slideIdList = presentationPart.Presentation.SlideIdList!;
        var slideId = slideIdList.Elements<SlideId>()
            .FirstOrDefault(sid => sid.RelationshipId?.Value == relationshipId);
        if (slideId is null) return;

        var slidePart = (SlidePart)presentationPart.GetPartById(relationshipId);
        slideIdList.RemoveChild(slideId);
        presentationPart.DeletePart(slidePart);
        presentationPart.Presentation.Save();
    }

    private static void FillMemberSlidePlaceholders(SlidePart slidePart, MemberSprintCardDto member, SprintDashboardDto dashboard)
    {
        foreach (var textBody in slidePart.Slide.Descendants<DocumentFormat.OpenXml.Drawing.TextBody>())
        {
            var paragraphs = textBody.Elements<DocumentFormat.OpenXml.Drawing.Paragraph>().ToList();
            var newParagraphs = new List<(DocumentFormat.OpenXml.Drawing.Paragraph original, List<DocumentFormat.OpenXml.Drawing.Paragraph> replacements)>();

            foreach (var para in paragraphs)
            {
                var fullText = GetParagraphText(para);

                // Check list placeholders first
                var listKey = ListPlaceholders.Keys.FirstOrDefault(k => fullText.Contains(k));
                if (listKey is not null)
                {
                    var items = ListPlaceholders[listKey](member).ToList();
                    var replacements = items.Count > 0
                        ? items.Select(line => CloneParagraphWithText(para, line)).ToList()
                        : [CloneParagraphWithText(para, "")];
                    newParagraphs.Add((para, replacements));
                    continue;
                }

                // Check scalar placeholders
                var replaced = fullText;
                foreach (var (key, fn) in ScalarPlaceholders)
                    replaced = replaced.Replace(key, fn(member, dashboard));

                if (replaced != fullText)
                {
                    newParagraphs.Add((para, [CloneParagraphWithText(para, replaced)]));
                }
            }

            // Apply replacements
            foreach (var (original, replacements) in newParagraphs)
            {
                foreach (var replacement in replacements)
                    textBody.InsertBefore(replacement, original);
                textBody.RemoveChild(original);
            }
        }

        slidePart.Slide.Save();
    }

    private static void FillSummarySlidePlaceholders(SlidePart slidePart, SprintDashboardDto dashboard)
    {
        foreach (var textBody in slidePart.Slide.Descendants<DocumentFormat.OpenXml.Drawing.TextBody>())
        {
            foreach (var para in textBody.Elements<DocumentFormat.OpenXml.Drawing.Paragraph>().ToList())
            {
                var fullText = GetParagraphText(para);
                var replaced = fullText;
                foreach (var (key, fn) in SummaryPlaceholders)
                    replaced = replaced.Replace(key, fn(dashboard));

                if (replaced != fullText)
                {
                    var newPara = CloneParagraphWithText(para, replaced);
                    textBody.InsertBefore(newPara, para);
                    textBody.RemoveChild(para);
                }
            }
        }
        slidePart.Slide.Save();
    }

    // Concatenates all run texts within a paragraph to reconstruct the full string
    // PowerPoint frequently splits placeholder text like {{MEMBER}} into multiple runs
    private static string GetParagraphText(DocumentFormat.OpenXml.Drawing.Paragraph para) =>
        string.Concat(para.Descendants<DocumentFormat.OpenXml.Drawing.Text>().Select(t => t.Text));

    private static DocumentFormat.OpenXml.Drawing.Paragraph CloneParagraphWithText(
        DocumentFormat.OpenXml.Drawing.Paragraph sourcePara, string text)
    {
        var newPara = (DocumentFormat.OpenXml.Drawing.Paragraph)sourcePara.CloneNode(false);

        // Clone paragraph properties (bullet style, spacing, etc.)
        var paraProps = sourcePara.GetFirstChild<DocumentFormat.OpenXml.Drawing.ParagraphProperties>();
        if (paraProps is not null)
            newPara.AppendChild((DocumentFormat.OpenXml.Drawing.ParagraphProperties)paraProps.CloneNode(true));

        // Use the first run's properties for the replacement run
        var firstRun = sourcePara.Descendants<DocumentFormat.OpenXml.Drawing.Run>().FirstOrDefault();
        var runProps = firstRun?.GetFirstChild<DocumentFormat.OpenXml.Drawing.RunProperties>();

        var run = new DocumentFormat.OpenXml.Drawing.Run();
        if (runProps is not null)
            run.AppendChild((DocumentFormat.OpenXml.Drawing.RunProperties)runProps.CloneNode(true));
        run.AppendChild(new DocumentFormat.OpenXml.Drawing.Text(text));
        newPara.AppendChild(run);

        return newPara;
    }

    private static string FormatWorkItem(WorkItemDto w)
    {
        var label = $"[{w.Status}] {w.Title}";
        return string.IsNullOrEmpty(w.ExternalTicketRef) ? label : $"{label} ({w.ExternalTicketRef})";
    }

    private static string BuildLeaveSummary(MemberSprintCardDto m)
    {
        var grouped = m.LeaveRecords
            .GroupBy(l => l.Type)
            .Select(g => $"{g.Key}: {g.Sum(l => l.DaysCount):0.#}d");
        return string.Join(", ", grouped);
    }

    private static string BuildLeaveDates(MemberSprintCardDto m) =>
        string.Join(", ", m.LeaveRecords.Select(l =>
            l.StartDate == l.EndDate
                ? $"{l.StartDate:MMM d} ({l.Type})"
                : $"{l.StartDate:MMM d}–{l.EndDate:MMM d} ({l.Type})"));
}
