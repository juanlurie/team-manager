namespace TeamManager.Api.Infrastructure.Slugs;

/// <summary>Generates friendly "adjective-noun" URL slugs (e.g. "swift-falcon") for
/// shareable links, in place of a raw GUID. Not cryptographically unique on its own --
/// callers must check for a collision against their own table and retry.</summary>
public static class SlugGenerator
{
    private static readonly string[] Adjectives =
    [
        "swift", "brave", "calm", "eager", "gentle", "happy", "jolly", "kind", "lively", "merry",
        "nimble", "proud", "quiet", "rapid", "sharp", "shiny", "sleek", "smart", "sunny", "witty",
        "bold", "bright", "cool", "cosmic", "cozy", "crisp", "daring", "dizzy", "electric", "epic",
        "fancy", "fierce", "fresh", "friendly", "frosty", "golden", "graceful", "grand", "gutsy", "hardy",
        "keen", "lucky", "mellow", "mighty", "misty", "noble", "playful", "polished", "prime", "quick",
        "radiant", "royal", "rustic", "silent", "silver", "snappy", "solid", "speedy", "spry", "stellar",
        "sturdy", "stormy", "steady", "tidy", "trusty", "vivid", "wild", "wise", "young", "zesty",
    ];

    private static readonly string[] Nouns =
    [
        "falcon", "otter", "tiger", "panda", "eagle", "dolphin", "fox", "wolf", "bear", "hawk",
        "lynx", "heron", "raven", "badger", "beaver", "cobra", "cougar", "coyote", "crane", "dragon",
        "ferret", "gecko", "gibbon", "griffin", "heron", "ibex", "jaguar", "koala", "lemur", "leopard",
        "llama", "lobster", "manatee", "marlin", "meerkat", "moose", "mustang", "narwhal", "ocelot", "orca",
        "osprey", "panther", "parrot", "pelican", "penguin", "phoenix", "puma", "quokka", "rabbit", "raccoon",
        "rhino", "salmon", "shark", "sparrow", "stallion", "stingray", "swan", "toucan", "turtle", "viper",
        "walrus", "weasel", "wombat", "yak", "zebra", "comet", "meteor", "nebula", "canyon", "summit",
    ];

    public static string Generate()
    {
        var adjective = Adjectives[Random.Shared.Next(Adjectives.Length)];
        var noun = Nouns[Random.Shared.Next(Nouns.Length)];
        return $"{adjective}-{noun}";
    }
}
