# Image credits

Placeholder photography from Unsplash, whose licence permits commercial use
without attribution. Credits recorded here regardless, so they can be honoured
or the files swapped for the client's own photography.

Replacing an image is a file swap — keep the same filename and nothing in the
code changes.

## Service pages

| File | Photographer | Source |
|---|---|---|
| rides.jpg | David Rodrigo | unsplash.com/photos/photo-1512453979798-5ea266f8880c |
| airport.jpg | Rocker Sta | unsplash.com/photos/photo-1542296332-2e4473faf563 |
| city-tour.jpg | Christoph Schulz | unsplash.com/photos/photo-1518684079-3c830dcef090 |

## Vehicle categories

Shown on the booking form's vehicle picker. Filenames match the
`vehicle_category` enum, so `vehicles/<category>.jpg` resolves without a lookup
table.

`business.jpg` is modified: the number plate is blurred. The Unsplash licence
permits modification, and a legible plate belonging to a stranger has no place
on a hire-car listing. It is the only edited image here.

These are stock cars, not the client's fleet. Each was chosen to match its
tier's body style — a saloon for Comfort, an executive saloon for Business, a
people carrier for Van — because the photograph is what a customer reads the
tier from. Swap them for the real fleet when photography exists; that is a
file swap and needs no code change.

| File | Vehicle shown | Photographer | Source |
|---|---|---|---|
| vehicles/comfort.jpg | Silver saloon | Evan Clay | unsplash.com/photos/a-silver-car-parked-in-front-of-a-forest-JM8NVuW6e0k |
| vehicles/business.jpg | Executive saloon | Samuel Girven | unsplash.com/photos/black-audi-a-4-on-road-during-daytime-NGbtPRrEujY |
| vehicles/suv.jpg | Black luxury SUV | rawkkim | unsplash.com/photos/a-sleek-black-luxury-suv-parked-indoors-_Xp1QW53Fz8 |
| vehicles/vip.jpg | Black flagship saloon | Martin Katler | unsplash.com/photos/black-mercedes-benz-sedan-on-cobblestone-street-y3neNkE6efI |
| vehicles/van.jpg | Silver people carrier | Cambo Auto | unsplash.com/photos/a-silver-minivan-parked-on-the-side-of-the-road-CHNoqIW7pfY |

## Destinations

Shown on the homepage rail. Only places the business serves — `areasServed` is
Dubai, Abu Dhabi and Sharjah — so the neighbouring emirates are absent however
good the photographs would be. The airport card reuses `airport.jpg`.

| File | Place | Photographer | Source |
|---|---|---|---|
| destinations/downtown-dubai.jpg | Burj Khalifa and the Downtown skyline | ZQ Lee | unsplash.com/photos/city-during-day-VbDjv8-8ibc |
| destinations/dubai-marina.jpg | Marina towers from the water | Emma Harrisova | unsplash.com/photos/high-rise-buildings-near-sea-during-daytime-UDsO83Ts6tQ |
| destinations/palm-jumeirah.jpg | The Palm from the air | Eslam Tawakol | unsplash.com/photos/an-island-in-the-middle-of-a-body-of-water-fjfNY4PsIoc |
| destinations/burj-al-arab.jpg | Burj Al Arab from the beach | Darcey Beau | unsplash.com/photos/burj-al-arab-dubai-united-arab-emirates-during-daytime-vtK31JoeAFk |
| destinations/dubai-creek.jpg | Abra station on the Creek | J Shim | unsplash.com/photos/zyd_9Jr90Fc |
| destinations/abu-dhabi.jpg | Sheikh Zayed Grand Mosque | David Rodrigo | unsplash.com/photos/sheikh-zayed-grand-mosque-in-abu-dhabi-kZ1zThg6G40 |
| destinations/sharjah.jpg | Sharjah waterfront | Ainur Kamaev | unsplash.com/photos/city-with-high-rise-buildings-viewing-sea-during-daytime-Z11iLvOggwQ |

## Promise icons

3D icons from [3dicons](https://3dicons.co) by Vijay Verma, released CC0 —
public domain, commercial use permitted, no attribution required. Credited
here anyway, in keeping with the rest of this file.

Each was downloaded on a white background and the background flood-filled to
transparency from the corners, so white *within* an icon survives. Filenames
match the promise they sit beside in components/trust-bar.tsx.

| File | Icon |
|---|---|
| promises/cancellation.png | Alarm clock |
| promises/airport.png | Suitcase |
| promises/confirmed.png | Shield with tick |
| promises/fare.png | Wallet |
| promises/support.png | WhatsApp |
