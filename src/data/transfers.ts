export type TransferFaq = { question: string; answer: string };

export type TransferRoute = {
  slug: string;
  title: string;
  metaBenefit: string;
  h1: string;
  intro: string;
  pickup: string;
  dropoff: string;
  travelTime: string;
  vehicleOptions: string[];
  faqs: [TransferFaq, TransferFaq, TransferFaq, TransferFaq];
};

// TODO(client): confirm the exact airport terminal pickup points before adding meeting-point specifics.
// TODO(client): confirm toll inclusion for cross-emirate fares before describing it as included or excluded.

export function transferMetaDescription(route: TransferRoute, fromFare?: number): string {
  if (fromFare !== undefined) {
    return `${route.title}. ${route.metaBenefit}. From AED ${fromFare.toFixed(2)} with WhatsApp confirmation.`;
  }
  return `${route.title}. ${route.metaBenefit}. Request a fixed fare before booking over WhatsApp.`;
}

export const TRANSFERS: TransferRoute[] = [
  {
    slug: "dubai-airport-to-dubai-marina",
    title: "Dubai Airport to Dubai Marina Transfer",
    metaBenefit: "Compare vehicles for a Marina hotel or residence drop-off",
    h1: "Dubai Airport to Dubai Marina transfer",
    pickup: "Dubai International Airport (DXB)", dropoff: "Dubai Marina",
    travelTime: "Around 30–45 minutes, depending on traffic",
    vehicleOptions: ["Executive saloon", "Business class", "Luxury SUV", "Van"],
    intro: "Dubai Marina sits beside the coast, with hotels, apartment towers, the Marina Walk and nearby Jumeirah Beach Residence. When travelling from Dubai International Airport, enter the specific hotel, tower or meeting point because a broad Marina destination may not identify the right entrance. The usual drive heads south through Dubai and may use Sheikh Zayed Road, though the route depends on traffic and the exact address. Allow roughly 30 to 45 minutes in typical conditions, with extra time during busy periods.\n\nThis airport journey can suit visitors carrying luggage to a hotel or residents returning home. Share your passenger and bag count when requesting a quote so the available saloon, business class car, SUV or van can be considered. Provide your flight details for pickup coordination, and confirm the meeting arrangement with the team because airport terminal procedures can vary. The fare is quoted before you book. For a return to DXB, make a separate booking with your departure time and terminal. The precise travel time and pickup point should be confirmed for your date.",
    faqs: [
      { question: "Which part of Dubai Marina should I enter?", answer: "Use the hotel, residence or building name and include an entrance or drop-off note if you have one. The Marina covers multiple roads and properties." },
      { question: "Does the usual drive use Sheikh Zayed Road?", answer: "It may, depending on traffic and your exact destination. The driver can use the suitable route for conditions on the day." },
      { question: "Can I include Jumeirah Beach Residence as my destination?", answer: "Yes. Enter the specific hotel or address in JBR so the drop-off is clear." },
      { question: "What should I do for a return airport journey?", answer: "Create a separate booking from your Marina address and include the departure terminal and flight time." },
    ],
  },
  {
    slug: "dubai-airport-to-downtown-dubai",
    title: "Dubai Airport to Downtown Dubai Transfer",
    metaBenefit: "Compare vehicles for a Downtown Dubai hotel drop-off",
    h1: "Dubai Airport to Downtown Dubai transfer",
    pickup: "Dubai International Airport (DXB)", dropoff: "Downtown Dubai",
    travelTime: "Around 20–35 minutes, depending on traffic",
    vehicleOptions: ["Executive saloon", "Business class", "Luxury SUV", "Van"],
    intro: "Downtown Dubai is the central district around landmarks such as Burj Khalifa and Dubai Mall, as well as hotels and residential towers along the boulevard. Those places have different vehicle entrances, so include the exact hotel or building rather than entering only “Downtown Dubai.” The airport is relatively close to this district, but the time at the terminal exit and city traffic can change the journey. A typical drive may take about 20 to 35 minutes.\n\nThis route is useful for visitors heading to a hotel, shoppers with bags or residents returning from a trip. Tell the team how many people are travelling and the amount of luggage before choosing among an executive saloon, business class car, SUV or van. If you are going to a venue or a specific tower, add its name to your booking request to make the drop-off straightforward. Share your flight information so the pickup plan can be coordinated. The final fare and meeting arrangement are confirmed with you before booking. If you later need a ride back to DXB, book that as its own trip and allow time for the airport journey.",
    faqs: [
      { question: "Should I enter Burj Khalifa or Downtown Dubai?", answer: "Enter the actual destination, such as your hotel, residence or a named entrance. That is more useful than the district name alone." },
      { question: "Is Downtown Dubai close to DXB?", answer: "It is one of the nearer central districts. The drive may take about 20 to 35 minutes, but traffic and terminal exit time affect it." },
      { question: "Can the car drop me at Dubai Mall?", answer: "Include Dubai Mall and the entrance or meeting point you need. The exact vehicle access point should be confirmed for your visit." },
      { question: "What information helps with the airport pickup?", answer: "Provide your flight details, arrival date and passenger contact information. Confirm the exact terminal meeting point with the team." },
    ],
  },
  {
    slug: "dubai-airport-to-palm-jumeirah",
    title: "Dubai Airport to Palm Jumeirah Transfer",
    metaBenefit: "Compare vehicles for a Palm Jumeirah resort or residence",
    h1: "Dubai Airport to Palm Jumeirah transfer",
    pickup: "Dubai International Airport (DXB)", dropoff: "Palm Jumeirah, Dubai",
    travelTime: "Around 35–50 minutes, depending on traffic",
    vehicleOptions: ["Executive saloon", "Business class", "Luxury SUV", "Van"],
    intro: "Palm Jumeirah extends from the mainland along a trunk, with hotel and residential destinations spread across the trunk, fronds and crescent. The final part of the drive therefore depends heavily on which property you are visiting. Enter the hotel, residence or villa location in your request, not only “the Palm,” and confirm the appropriate vehicle entrance with your destination. From DXB, the drive generally crosses central Dubai before reaching the Palm access road. In typical conditions, allow around 35 to 50 minutes, with traffic adding time.\n\nThis route is often chosen by resort guests and residents travelling with holiday luggage. Share the number of passengers and bags so the team can check an executive saloon, business class car, SUV or van for your group. Include flight details for pickup coordination. If your destination is on a frond or at a resort, the property name helps distinguish it from other parts of the island. The fare is confirmed before booking. A return to the airport should be arranged separately, with the correct departure terminal and enough time for the drive and airport check-in.",
    faqs: [
      { question: "Why do you need the exact Palm Jumeirah property?", answer: "The island includes destinations along the trunk, fronds and crescent. A property name helps identify the right access and drop-off." },
      { question: "Does this route cross central Dubai?", answer: "The usual drive from DXB heads across the city toward Palm Jumeirah. The specific route can change with traffic and destination." },
      { question: "Can I travel to a resort on the crescent?", answer: "Add the resort name and any arrival instructions when requesting a quote. Confirm the vehicle entrance with the property if needed." },
      { question: "How much extra time should I allow?", answer: "Travel time varies with traffic and the location on the Palm. Allow additional time for a scheduled check-in or airport departure." },
    ],
  },
  {
    slug: "dubai-airport-to-abu-dhabi",
    title: "Dubai Airport to Abu Dhabi Transfer",
    metaBenefit: "Compare vehicles for an intercity Abu Dhabi journey",
    h1: "Dubai Airport to Abu Dhabi transfer",
    pickup: "Dubai International Airport (DXB)", dropoff: "Abu Dhabi",
    travelTime: "Around 90–120 minutes, depending on traffic",
    vehicleOptions: ["Executive saloon", "Business class", "Luxury SUV", "Van"],
    intro: "The trip from Dubai International Airport to Abu Dhabi is an intercity drive, rather than a short transfer within Dubai. Much of the usual journey follows the main highway corridor toward Abu Dhabi, with the final section depending on whether you are going to the city centre, Yas Island or another district. Abu Dhabi covers a broad area, so an exact hotel, home or office address is especially useful when requesting a quote. Plan for around 90 to 120 minutes in typical conditions and allow more time if traffic is heavy.\n\nThis route can work for visitors connecting from a DXB arrival to an Abu Dhabi stay, as well as residents and business travellers. Share your flight details and preferred pickup timing, then confirm the airport meeting arrangements with the team. Passenger and luggage numbers can help determine whether an executive saloon, business class car, SUV or van is appropriate. The fare is confirmed before booking. If the trip is tied to a scheduled event or onward flight, leave a time buffer because road conditions can change. A later trip back to DXB needs its own booking and pickup address.",
    faqs: [
      { question: "Can I use this route for Yas Island?", answer: "Yes. Enter the specific hotel, venue or address on Yas Island so the destination is clear." },
      { question: "Is this a direct trip between the emirates?", answer: "The request is for a point-to-point transfer. Share both full addresses and confirm the planned stops, if any, before booking." },
      { question: "What travel time should I plan for?", answer: "A typical estimate is 90 to 120 minutes. Traffic, airport exit time and the Abu Dhabi destination can change the duration." },
      { question: "Are toll charges included in the fare?", answer: "Toll treatment needs confirmation for this route. TODO(client): confirm whether tolls are included before publishing a fare policy." },
    ],
  },
  {
    slug: "abu-dhabi-airport-to-dubai",
    title: "Abu Dhabi Airport to Dubai Transfer",
    metaBenefit: "Compare vehicles for your onward journey into Dubai",
    h1: "Abu Dhabi Airport to Dubai transfer",
    pickup: "Zayed International Airport (AUH)", dropoff: "Dubai",
    travelTime: "Around 90–120 minutes, depending on traffic",
    vehicleOptions: ["Executive saloon", "Business class", "Luxury SUV", "Van"],
    intro: "Zayed International Airport is outside central Abu Dhabi, and the drive to Dubai continues north across the emirate boundary. Your total journey then depends on where in Dubai you are going. Downtown, Dubai Marina, Deira and outer residential districts are not interchangeable drop-offs, so provide a full address or named hotel when requesting the transfer. A typical estimate for the drive is around 90 to 120 minutes, although traffic and the destination can extend it.\n\nThis service can suit visitors landing in Abu Dhabi but staying in Dubai, or travellers continuing to a meeting or home. Add your flight information and arrival details, then confirm the terminal meeting point with the team because terminal arrangements need to be specific. Include the passenger and luggage count when considering an executive saloon, business class car, SUV or van. The fare is provided before you confirm the booking. If you are travelling to a timed appointment, build in a buffer for the intercity drive. For the return to AUH, make another booking from your Dubai address and share the departure time and terminal.",
    faqs: [
      { question: "Which airport does this transfer start at?", answer: "It starts at Zayed International Airport (AUH). Share your flight and arrival details when requesting the pickup." },
      { question: "Can I travel from AUH to Dubai Marina?", answer: "Yes. Enter Dubai Marina and, ideally, the hotel or building address as the drop-off." },
      { question: "Where will the driver meet me at AUH?", answer: "The terminal meeting point must be confirmed for your booking. TODO(client): confirm the pickup point details for each AUH terminal." },
      { question: "Should I book the return to AUH at the same time?", answer: "Create a separate booking for the return so its date, Dubai pickup address and airport departure details are clear." },
    ],
  },
  {
    slug: "dubai-to-abu-dhabi",
    title: "Dubai to Abu Dhabi Chauffeur Transfer",
    metaBenefit: "Compare vehicles for travel between the two emirates",
    h1: "Dubai to Abu Dhabi chauffeur transfer",
    pickup: "Dubai",
    dropoff: "Abu Dhabi",
    travelTime: "Around 90–120 minutes, depending on traffic",
    vehicleOptions: ["Executive saloon", "Business class", "Luxury SUV", "Van"],
    intro: "A Dubai to Abu Dhabi trip can begin in one part of the city and end in another district of the capital, so both addresses matter. A transfer from Dubai Marina to Abu Dhabi city centre has a different starting and ending point from a trip beginning in Deira and ending on Yas Island. Enter the full pickup and drop-off addresses to get the route reviewed accurately. The intercity drive often takes about 90 to 120 minutes, but traffic and the locations at either end affect the total.\n\nThis route is useful for business visits, hotel changes, family trips and connections to Abu Dhabi attractions. If you need to arrive at a fixed time, leave a buffer for traffic and tell the team about the appointment when discussing pickup. The available vehicle choices include an executive saloon, business class car, SUV and van, subject to confirmation for your date and group. Include passenger and luggage details with the request. The fare is quoted before booking. A return trip should be set up separately with the Abu Dhabi pickup address and desired departure time so both legs have clear details.",
    faqs: [
      { question: "Can I travel between specific districts, not city centres?", answer: "Yes. Add the complete pickup and destination addresses, such as Marina to Yas Island, when requesting your quote." },
      { question: "Can I book a stop along the way?", answer: "Mention any requested stop before confirming the booking. The route and fare may need to be reviewed for extra stops." },
      { question: "What if I have a meeting at a set time?", answer: "Share the required arrival time and leave a traffic buffer. Journey duration can change with road conditions." },
      { question: "Do I need a separate booking for the return?", answer: "Yes. Enter the return pickup point and time separately so the team can confirm that leg's details." },
    ],
  },
  {
    slug: "dubai-airport-to-sharjah",
    title: "Dubai Airport to Sharjah Transfer",
    metaBenefit: "Compare vehicles for a Sharjah hotel or home drop-off",
    h1: "Dubai Airport to Sharjah transfer",
    pickup: "Dubai International Airport (DXB)", dropoff: "Sharjah",
    travelTime: "Around 30–50 minutes, depending on traffic",
    vehicleOptions: ["Executive saloon", "Business class", "Luxury SUV", "Van"],
    intro: "Sharjah sits directly north of Dubai, and the road journey from DXB crosses a busy urban area before reaching the destination. The drive can be relatively short in clear conditions, but congestion around the emirate boundary can make the time less predictable. A typical estimate is 30 to 50 minutes. Sharjah's drop-offs range from waterfront hotels and cultural areas to residential neighbourhoods, so enter a district, property or complete address rather than just the emirate name.\n\nThis transfer may suit visitors staying in Sharjah after landing in Dubai, or residents returning from a trip. Share flight details for pickup coordination and confirm where to meet at the airport before travel. If you are carrying several bags or travelling as a group, include those details when requesting a vehicle. Options include an executive saloon, business class car, SUV or van, with availability confirmed for the date. The fare is quoted before booking. If you are returning to DXB, place a separate request from the Sharjah address and include your departure terminal and flight time. Allow extra time when travelling during busy road periods.",
    faqs: [
      { question: "Is Sharjah close to Dubai Airport?", answer: "Sharjah borders Dubai and some destinations are relatively close to DXB. The actual drive depends on traffic and the address." },
      { question: "Can I be dropped near the Sharjah waterfront?", answer: "Enter the hotel, neighbourhood or full address near the waterfront so the precise destination is known." },
      { question: "Why can the drive time vary so much?", answer: "Traffic near the Dubai and Sharjah boundary can affect the journey. The 30 to 50 minute estimate is not a guaranteed arrival time." },
      { question: "Are road tolls part of the fare?", answer: "Toll inclusion needs confirmation for this transfer. TODO(client): confirm toll handling before publishing a fare policy." },
    ],
  },
];

export const TRANSFER_BY_SLUG = Object.fromEntries(TRANSFERS.map((route) => [route.slug, route])) as Record<string, TransferRoute>;
