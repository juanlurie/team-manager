namespace TeamManager.Api.Domain.Entities;

/// <summary>
/// Canonical string vocabulary for RetroBoard (statuses, phases, roles, check-in ratings).
/// These values are persisted to the database, so changing a literal requires a data migration.
/// Kept as string constants (not enums) because EF stores them as text and the frontend mirrors
/// the same literals in its TypeScript unions.
/// </summary>
public static class RetroBoardConstants
{
    public static class Status
    {
        public const string Draft = "draft";
        public const string Live = "live";
        public const string Closed = "closed";
    }

    public static class Role
    {
        public const string Facilitator = "facilitator";
        public const string Participant = "participant";
    }

    public static class Rating
    {
        public const string Better = "better";
        public const string Same = "same";
        public const string Worse = "worse";
        public const string Na = "na";
        public static readonly string[] All = [Better, Same, Worse, Na];
    }

    public static class Phase
    {
        public const string Setup = "setup";
        public const string Checkin = "checkin";
        public const string Capture = "capture";
        public const string Introduce = "introduce";
        public const string Vote = "vote";
        public const string Discuss = "discuss";
        public const string Reflect = "reflect";
        public const string Summary = "summary";

        /// <summary>Canonical phase order for the stepper and index lookups.</summary>
        public static readonly string[] Order =
            [Setup, Checkin, Capture, Introduce, Vote, Discuss, Reflect, Summary];
    }
}
