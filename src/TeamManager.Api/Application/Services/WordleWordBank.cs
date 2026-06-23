namespace TeamManager.Api.Application.Services;

// A curated bank of common 5-letter English words used as Wordle answers. Guesses themselves
// aren't validated against this (or any) dictionary -- any 5-letter alphabetic string is accepted
// as an attempt, matching this app's general preference for simple/lenient input over building
// out a full word-validity dictionary.
public static class WordleWordBank
{
    public const int WordLength = 5;
    public const int MaxGuesses = 6;

    private static readonly string[] Words =
    [
        "ABOUT", "ABOVE", "ACTOR", "ADMIT", "AGENT", "ALARM", "ALERT", "ALIVE", "ALLOW", "ALONE",
        "AMONG", "ANGEL", "ANGER", "ANGLE", "APPLE", "APPLY", "ARENA", "ARGUE", "ARRAY", "ASIDE",
        "AVOID", "AWARD", "BASIC", "BEACH", "BEGIN", "BENCH", "BLACK", "BLAME", "BLANK", "BLAST",
        "BLEND", "BLIND", "BLOCK", "BLOOD", "BOARD", "BOAST", "BONUS", "BRAIN", "BRAND", "BRAVE",
        "BREAD", "BREAK", "BRIEF", "BRING", "BROAD", "BROWN", "BUILD", "BUNCH", "CABLE", "CARRY",
        "CATCH", "CAUSE", "CHAIN", "CHAIR", "CHALK", "CHARM", "CHART", "CHASE", "CHEAP", "CHECK",
        "CHESS", "CHIEF", "CHILD", "CLAIM", "CLASS", "CLEAN", "CLEAR", "CLIMB", "CLOCK", "CLOSE",
        "CLOUD", "COAST", "COUCH", "COUNT", "COVER", "CRAFT", "CRASH", "CRAZY", "CREAM", "CRIME",
        "CROSS", "CROWD", "CROWN", "CURVE", "DAILY", "DANCE", "DEPTH", "DOUBT", "DRAFT", "DRAMA",
        "DREAM", "DRESS", "DRINK", "DRIVE", "EARLY", "EARTH", "EIGHT", "ELITE", "EMPTY", "ENJOY",
        "ENTER", "EQUAL", "EVENT", "EVERY", "EXACT", "EXIST", "EXTRA", "FAITH", "FALSE", "FAULT",
        "FENCE", "FIELD", "FIGHT", "FINAL", "FIRST", "FLAME", "FLASH", "FLEET", "FLOOR", "FLUID",
        "FOCUS", "FORCE", "FRAME", "FRESH", "FRONT", "FRUIT", "FUNNY", "GHOST", "GIANT", "GLASS",
        "GLOBE", "GRACE", "GRADE", "GRAND", "GRANT", "GRAPH", "GRASP", "GRASS", "GREAT", "GREEN",
        "GROUP", "GUARD", "GUESS", "GUEST", "GUIDE", "HAPPY", "HEART", "HEAVY", "HONOR", "HORSE",
        "HOTEL", "HOUSE", "HUMAN", "IMAGE", "INPUT", "ISSUE", "JUDGE", "JUICE", "KNOCK", "KNOWN",
        "LARGE", "LASER", "LAUGH", "LAYER", "LEARN", "LEAST", "LEGAL", "LEVEL", "LIGHT", "LIMIT",
        "LOGIC", "LOOSE", "LUCKY", "LUNCH", "MAGIC", "MAJOR", "MAKER", "MARCH", "MATCH", "MAYOR",
        "MEDIA", "METAL", "MIGHT", "MINOR", "MODEL", "MONEY", "MONTH", "MORAL", "MOTOR", "MOUNT",
        "MOUSE", "MOUTH", "MOVIE", "MUSIC", "NIGHT", "NOISE", "NORTH", "NOVEL", "NURSE", "OCEAN",
        "OFFER", "OFTEN", "ORDER", "OTHER", "OUTER", "OWNER", "PANEL", "PAPER", "PARTY", "PEACE",
        "PHASE", "PHOTO", "PIANO", "PIECE", "PILOT", "PLACE", "PLAIN", "PLANE", "PLANT", "PLATE",
        "POINT", "POUND", "POWER", "PRESS", "PRICE", "PRIDE", "PRIME", "PRINT", "PRIZE", "PROOF",
        "PROUD", "PROVE", "QUEEN", "QUICK", "QUIET", "QUITE", "RADIO", "RAISE", "RANGE", "RAPID",
        "REACH", "READY", "REFER", "RELAX", "RIVER", "ROBOT", "ROUGH", "ROUND", "ROUTE", "ROYAL",
        "RURAL", "SCALE", "SCENE", "SCOPE", "SCORE", "SENSE", "SERVE", "SEVEN", "SHADE", "SHAKE",
        "SHAPE", "SHARE", "SHARP", "SHEET", "SHELF", "SHELL", "SHIFT", "SHINE", "SHIRT", "SHOCK",
        "SHOOT", "SHORT", "SIGHT", "SINCE", "SKILL", "SLEEP", "SLICE", "SMALL", "SMART",
        "SMILE", "SMOKE", "SNAKE", "SOLID", "SOUND", "SOUTH", "SPACE", "SPARE", "SPEAK", "SPEED",
        "SPEND", "SPLIT", "SPORT", "SQUAD", "STACK", "STAFF", "STAGE", "STAIR", "STAND", "START",
        "STATE", "STEAM", "STEEL", "STICK", "STOCK", "STONE", "STORE", "STORM", "STORY", "STUDY",
        "STUFF", "STYLE", "SUGAR", "SUPER", "SWEET", "SWIFT", "SWING", "TABLE", "TASTE", "TEACH",
        "THANK", "THEME", "THICK", "THING", "THINK", "THROW", "TIGHT", "TITLE", "TODAY", "TOTAL",
        "TOUCH", "TOWER", "TRACE", "TRACK", "TRADE", "TRAIN", "TREAT", "TREND", "TRIAL", "TRUCK",
        "TRUST", "TRUTH", "TWICE", "UNCLE", "UNDER", "UNION", "UNTIL", "UPPER", "URBAN", "USUAL",
        "VALID", "VALUE", "VIDEO", "VISIT", "VOICE", "WASTE", "WATCH", "WATER", "WHEEL", "WHILE",
        "WHITE", "WHOLE", "WOMAN", "WORLD", "WORRY", "WORTH", "WOUND", "WRITE", "YOUTH",
    ];

    public static string RandomWord() => Words[Random.Shared.Next(Words.Length)];
}
