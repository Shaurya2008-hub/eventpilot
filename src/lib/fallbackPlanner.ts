import { calculateBudget } from "./budget";
import { generateTimeline, parseUTCDate } from "./timeline";
import {
  createPlanInputSchema,
  type Plan,
  type PlanInput,
  type VendorChecklist,
} from "./schemas";
import type { Occasion } from "./budget";

/**
 * Curated vendor checklists per occasion with 3-5 practical items each.
 * Never includes prices.
 */
const VENDOR_CHECKLISTS: Record<Occasion, Record<string, string[]>> = {
  wedding: {
    venue: [
      "Inspect banquet and lawn capacity, dining area flow, and guest parking facilities",
      "Verify bridal suite availability, air conditioning, and power generator backup",
      "Confirm alcohol permit, baraat sound limits, and midnight curfew policies",
      "Check mandap setup clearances and fire safety precautions for sacred havan",
    ],
    caterer: [
      "Schedule food tasting with family for lunch, hi-tea, and dinner menus",
      "Finalize live chaat counters, regional specialties, and dessert assortment",
      "Confirm buffet layout, uniform-clad servers, and continuous water service",
      "Verify clean drinking water cans and kitchen hygiene standards",
    ],
    decorator: [
      "Finalize entrance toran, floral walkway, and stage/mandap floral backdrop",
      "Select seating covers, table centerpieces, and stage sofa arrangements",
      "Review ambient lighting including fairy lights, warm spotlights, and pathway lanterns",
      "Confirm delivery and setup completion timeline well before guest arrival",
    ],
    photographer: [
      "Provide shot list for family portraits, bride/groom entries, and key rituals",
      "Confirm candid photographer, traditional videographer, and drone operator arrival",
      "Verify backup memory cards, extra camera batteries, and off-camera flash units",
      "Agree on timeline for delivering raw footage and curated wedding album",
    ],
    entertainment: [
      "Curate baraat brass band, dhol players, and bridal entry music track",
      "Test stage sound system, wireless microphones, and DJ console acoustics",
      "Coordinate family sangeet dance performance cue sheet with sound engineer",
      "Confirm backup power supply for audio mixers and DJ equipment",
    ],
    invitations: [
      "Proofread names, family details, auspicious muhurat timings, and venue maps",
      "Send digital animated video invites and WhatsApp PDF cards with RSVP links",
      "Hand-deliver traditional physical cards accompanied by sweets or dry fruits",
      "Maintain live RSVP sheet to track confirmed attendees and meal preferences",
    ],
  },
  birthday: {
    venue: [
      "Confirm hall size accommodates kids play zone, dining area, and cake table",
      "Verify air conditioning, sufficient ventilation, and clean child-friendly washrooms",
      "Check rules regarding wall decorations, confetti poppers, and music duration",
      "Inspect parking availability and stroller/wheelchair accessible entrances",
    ],
    caterer: [
      "Select kid-approved snacks such as mini pizzas, burgers, fries, and fruit skewers",
      "Finalize customized birthday cake flavor, theme design, and delivery timing",
      "Arrange separate adult buffet spread with hot beverages and mocktails",
      "Ensure allergen tags and separate eggless dessert options are displayed",
    ],
    decorator: [
      "Design organic balloon arch, themed cake table backdrop, and LED age number",
      "Arrange themed table runners, customized paper plates, and party hats",
      "Create dedicated selfie booth with fun props and photo frame",
      "Set up welcome standee with birthday child's name and photo",
    ],
    photographer: [
      "Brief photographer on capturing candid cake-cutting moments and kids games",
      "Take group portraits with family, relatives, and school friends",
      "Capture detailed shots of cake, decor elements, and return gift station",
      "Verify fast turnaround for sharing digital preview photos",
    ],
    entertainment: [
      "Book enthusiastic party host or game coordinator for interactive games",
      "Hire entertainer such as magician, balloon twister, or tattoo artist",
      "Prepare upbeat party playlist suitable for musical chairs and dancing",
      "Prepare prizes for game winners and return gift bags for all children",
    ],
    invitations: [
      "Design colorful digital invite matching party theme and dress code",
      "Broadcast invitations via WhatsApp group and track parent confirmations",
      "Include venue location pin, party timing, and host phone numbers",
      "Follow up with parents 3 days prior for accurate kids headcount",
    ],
  },
  engagement: {
    venue: [
      "Check stage dimension for ring ceremony backdrop and comfortable sofa seating",
      "Verify guest seating capacity, dining hall flow, and ambient acoustics",
      "Confirm dedicated changing rooms for couple and immediate family",
      "Inspect parking valet service and ramp access for senior family members",
    ],
    caterer: [
      "Curate sophisticated welcome mocktails, hot appetizers, and live chaat counters",
      "Finalize extensive dinner spread with regional delicacies and live dessert station",
      "Schedule pre-event menu tasting session with both families",
      "Verify water dispensers, prompt plate clearance, and attentive table service",
    ],
    decorator: [
      "Select romantic floral backdrop with pastel blooms and couple name monogram",
      "Arrange candlelit pathway, fairy light canopy, and photogenic entrance arch",
      "Set up ring ceremony table with stylish ring platter and floral tray",
      "Ensure lighting highlights couple stage without harsh glare",
    ],
    photographer: [
      "Plan pre-ceremony couple portrait session during golden hour lighting",
      "Capture detailed macro shots of engagement rings, attire, and jewelry",
      "Document ring exchange, blessing ceremonies, and candid family interactions",
      "Confirm timeline for same-day photo highlights and teaser reel",
    ],
    entertainment: [
      "Curate acoustic instrumental or soft melodious background music for dinner",
      "Arrange sound setup with clear wireless mic for family speeches and toasts",
      "Plan couple entry song and celebratory ring exchange audio cue",
      "Coordinate family dance performances and celebratory dance floor set",
    ],
    invitations: [
      "Design elegant digital e-card with gold foil motifs and event schedule",
      "Circulate formal invites to extended family and friends via WhatsApp/email",
      "Include clear RSVP contact numbers and Google Maps venue link",
      "Maintain response list to coordinate dining counts with caterer",
    ],
  },
  community: {
    venue: [
      "Verify community hall or ground capacity, fire exits, and crowd evacuation routes",
      "Ensure functional public address system, podium, and stage for dignitaries",
      "Confirm municipal permits, generator backup, and sanitation facilities",
      "Check dedicated parking zones and accessibility ramps for elderly attendees",
    ],
    caterer: [
      "Plan scalable traditional community meal (pangat or buffet system)",
      "Ensure hygienic large-batch cooking vessels and food warming chafers",
      "Organize clean drinking water stations and eco-friendly compostable diningware",
      "Coordinate volunteer team for orderly meal distribution and table cleanup",
    ],
    decorator: [
      "Install welcoming traditional entrance toran, rangoli, and auspicious brass lamps",
      "Arrange stage backdrop banner with event title, logos, and cultural motifs",
      "Provide clean stage carpeting, comfortable seating, and podium flower bouquet",
      "Set up overhead marquee or tent covering for sun and weather protection",
    ],
    photographer: [
      "Document stage proceedings, dignitary felicitations, and lamp lighting",
      "Capture wide panoramic crowd shots and volunteer group photographs",
      "Photograph community cultural performances, awards, and lunch gathering",
      "Organize digital photo drive for sharing with community members",
    ],
    entertainment: [
      "Test high-power PA system, wired stage mics, and sound operator console",
      "Coordinate timing for traditional prayer, cultural songs, and felicitation speeches",
      "Schedule youth and children cultural performances according to program schedule",
      "Arrange national anthem or closing prayer audio cues",
    ],
    invitations: [
      "Draft bilingual public announcement circular and digital WhatsApp poster",
      "Distribute community notice board flyers and social media announcements",
      "Send personalized VIP invitations to community elders and guest speakers",
      "Set up online registration link or volunteer desk for attendee check-in",
    ],
  },
};

/**
 * Generates exactly 3 theme ideas tailored to the occasion and atmosphere.
 */
function getThemeIdeas(occasion: Occasion, atmosphere: string): string[] {
  const atm = atmosphere.trim();

  if (occasion === "wedding") {
    return [
      atm
        ? `${atm} Heritage Splendor: Warm marigold and brass urli accents, royal canopy draping, and shehnai melodies`
        : "Royal Rajasthani Heritage: Marigold florals, royal canopy draping, and traditional shehnai melodies",
      atm
        ? `${atm} Mughal Garden Elegance: Soft pastel roses, sheer organza drapes, and ambient fairy-lit pathways`
        : "Mughal Garden Elegance: Soft pastel roses, sheer organza drapes, and ambient fairy-lit pathways",
      atm
        ? `${atm} Eco-Friendly South Splendor: Fresh banana leaf decor, terracotta pottery accents, and natural jasmine florals`
        : "Eco-Friendly South Splendor: Fresh banana leaf decor, terracotta pottery accents, and natural jasmine florals",
    ];
  }

  if (occasion === "birthday") {
    return [
      atm
        ? `${atm} Celebration Carnival: Colorful balloon garlands, interactive game stalls, and lively pop tracks`
        : "Celebration Carnival: Colorful balloon garlands, interactive game stalls, and lively pop tracks",
      atm
        ? `${atm} Bollywood Star Night: Red carpet entrance, vintage movie cutouts, and retro dance hits`
        : "Bollywood Star Night: Red carpet entrance, vintage movie cutouts, and retro dance hits",
      atm
        ? `${atm} Glow-in-the-Dark Fiesta: UV reactive glow accessories, neon accent lighting, and energetic beats`
        : "Glow-in-the-Dark Fiesta: UV reactive glow accessories, neon accent lighting, and energetic beats",
    ];
  }

  if (occasion === "engagement") {
    return [
      atm
        ? `${atm} Romantic Twilight: Twinkle fairy light canopy, blush rose floral rings, and live acoustic melodies`
        : "Romantic Twilight: Twinkle fairy light canopy, blush rose floral rings, and live acoustic melodies",
      atm
        ? `${atm} Shahi Darbar Elegance: Rich jewel-toned velvet drapery, brass lanterns, and sitar-flute fusion`
        : "Shahi Darbar Elegance: Rich jewel-toned velvet drapery, brass lanterns, and sitar-flute fusion",
      atm
        ? `${atm} Boho Chic Garden: Pampas grass accents, rustic wooden stage, and delicate macrame backdrops`
        : "Boho Chic Garden: Pampas grass accents, rustic wooden stage, and delicate macrame backdrops",
    ];
  }

  // community
  return [
    atm
      ? `${atm} Desi Utsav: Grand rangoli entrance, auspicious brass diya displays, and folk welcome banners`
      : "Desi Utsav: Grand rangoli entrance, auspicious brass diya displays, and folk welcome banners",
    atm
      ? `${atm} Seva & Cultural Harmony: Sustainable earthen decor, open dining arrangement, and devotional chanting`
      : "Seva & Cultural Harmony: Sustainable earthen decor, open dining arrangement, and devotional chanting",
    atm
      ? `${atm} Festival of Lights: Festive earthen diyas, overhead torans, and vibrant regional music showcase`
      : "Festival of Lights: Festive earthen diyas, overhead torans, and vibrant regional music showcase",
  ];
}

/**
 * Generates celebration notes reflecting city, dietary, accessibility,
 * must-haves, and contingency budget buffer.
 */
function getNotes(
  input: PlanInput,
  contingencyBudget: number
): string[] {
  const notes: string[] = [];

  if (input.city && input.city.trim()) {
    notes.push(
      `Location Check: Celebration hosted in ${input.city.trim()}. Verify local venue permits, parking guidelines, and municipal noise curfews.`
    );
  }

  if (input.dietary && input.dietary.trim()) {
    notes.push(
      `Dietary Requirements: Strictly cater to "${input.dietary.trim()}". Arrange dedicated food preparation areas, clearly marked stations, and separate serving ladles.`
    );
  }

  if (input.accessibilityNeeds && input.accessibilityNeeds.trim()) {
    notes.push(
      `Accessibility Accommodations: Plan for "${input.accessibilityNeeds.trim()}". Ensure step-free ramp access, ground-level priority seating for elders, and accessible washroom facilities.`
    );
  }

  if (input.mustHaves && input.mustHaves.length > 0) {
    const items = input.mustHaves.map((m) => m.trim()).filter(Boolean);
    if (items.length > 0) {
      notes.push(`Must-Have Priorities: Ensure ${items.join(", ")} are locked with vendors early in the planning process.`);
    }
  }

  notes.push(
    `Financial Contingency: An emergency buffer of ₹${contingencyBudget.toLocaleString(
      "en-IN"
    )} is reserved for last-minute or unexpected celebration expenses.`
  );

  return notes;
}

/**
 * Generates an offline celebration plan without external network calls or environment variables.
 *
 * @param input - PlanInput configuration.
 * @param today - Current reference date (YYYY-MM-DD, UTC).
 * @returns Fully generated Plan object with source set to "fallback".
 */
export function generateFallbackPlan(input: PlanInput, today: string): Plan {
  // Validate today string as valid UTC date
  parseUTCDate(today);

  // Validate input with schema parameterized to the given 'today' date
  const schema = createPlanInputSchema(today);
  const validatedInput = schema.parse(input);

  // Calculate budget allocations using the deterministic Largest-Remainder Method
  const budget = calculateBudget(
    validatedInput.budget,
    validatedInput.guests,
    validatedInput.occasion
  );

  // Calculate timeline tasks using UTC arithmetic and compression if lead time is short
  const timeline = generateTimeline(validatedInput.eventDate, today);

  // Build vendor checklists for all 6 required vendors
  const occasionChecklists = VENDOR_CHECKLISTS[validatedInput.occasion];
  const requiredVendors = [
    "venue",
    "caterer",
    "decorator",
    "photographer",
    "entertainment",
    "invitations",
  ] as const;

  const vendorChecklist: VendorChecklist[] = requiredVendors.map((vendor) => {
    const items = occasionChecklists[vendor] ?? [];
    return {
      vendor,
      items: items.map((label) => ({
        label,
        done: false,
      })),
    };
  });

  // Generate exactly 3 theme ideas tailored to occasion and atmosphere
  const ideas = getThemeIdeas(validatedInput.occasion, validatedInput.atmosphere);

  // Generate contextual celebration notes
  const notes = getNotes(validatedInput, budget.contingency);

  return {
    source: "fallback",
    input: validatedInput,
    budget,
    originalBudget: { ...budget },
    timeline,
    vendorChecklist,
    ideas,
    notes,
  };
}

