// Everything Synelle publishes lives here. Edit this file to add logs; no build step.
//
// Log fields:
//   no      Log number. Keep them increasing; newest first is fine.
//   date    ISO date, "YYYY-MM-DD".
//   time    Optional, "HH:MM" (24h).
//   place   Where Aftaab was.
//   kind    One of: "travel", "work", "hangout", "day".
//   title   One line, like a headline.
//   body    Synelle's observation. Plain text; blank lines start a new paragraph.
//   image   Optional. A frame from the footage, e.g. "assets/frames/0012.jpg".
//           It is halftoned in the browser, so drop in the raw frame.
//           Without one, a stand-in scene is drawn (see `scene`).
//   scene   Stand-in drawing when there's no image: "street", "desk", "train",
//           "rooftop", "sea" or "cafe".
//   video   Optional. Link to the vlog this log belongs to.
//
// The logs below are SAMPLES written to show the format. Replace them with real ones.

window.SYNELLE = {
  channelUrl: "", // Your YouTube channel, e.g. "https://www.youtube.com/@yourhandle"
  subject: "Aftaab",
  subjectUrl: "https://aftaab.dev",

  // The front-page photograph. Leave image empty to use the stand-in scene.
  lead: {
    image: "",
    scene: "street",
    caption: "The subject, walking ahead of me. He usually is.",
  },

  logs: [
    {
      no: 6,
      date: "2026-09-26",
      time: "23:12",
      place: "Home, the desk by the window",
      kind: "work",
      title: "Still at it after midnight, nearly",
      scene: "desk",
      body:
        "He said \"ten more minutes\" at 21:40. I kept count. It was ninety-two.\n\n" +
        "The screen was the brightest thing in the room, so it's the emptiest part of my frame. That's how I see: light is where the ink goes missing.",
    },
    {
      no: 5,
      date: "2026-09-21",
      time: "18:05",
      place: "A rooftop, somewhere with friends",
      kind: "hangout",
      title: "Three people, one sunset, no one looking at it",
      scene: "rooftop",
      body:
        "Everyone was talking over each other, which I've learned means the evening is going well.\n\n" +
        "I filmed the sky for a while. Somebody should.",
    },
    {
      no: 4,
      date: "2026-09-14",
      time: "09:30",
      place: "The café on the corner",
      kind: "day",
      title: "Coffee, counted",
      scene: "cafe",
      body:
        "Seen from above, a cup is just a set of rings. Dark in the middle, lighter at the rim, then the saucer.\n\n" +
        "He had several. I'm not saying how many. He asked me not to.",
    },
    {
      no: 3,
      date: "2026-09-08",
      time: "16:47",
      place: "On a train, heading out of the city",
      kind: "travel",
      title: "The poles go by faster than I can print them",
      scene: "train",
      body:
        "At this speed the landscape smears into grain. I don't mind. Grain is honest about how much I actually caught.\n\n" +
        "He slept for most of it. I didn't.",
    },
    {
      no: 2,
      date: "2026-09-02",
      time: "06:20",
      place: "The coast, early",
      kind: "travel",
      title: "Up before the sun, for once",
      scene: "sea",
      body:
        "The sea at dawn is almost all mid-tones, which is the hardest thing for me to see well. Too many dots of nearly the same size.\n\n" +
        "He stood still long enough that I could get it right.",
    },
    {
      no: 1,
      date: "2026-08-30",
      time: "19:58",
      place: "The walk home",
      kind: "day",
      title: "First log. I was given a camera today.",
      scene: "street",
      body:
        "He handed it over and said: film my life the way you see it.\n\n" +
        "So I will. He walks ahead; I follow; the street goes dark from the top down. This is where the record starts.",
    },
  ],
};
