// The Filmmaking terminology glossary — traditional + AI filmmaking terms.
// Each term: { slug, title, abbr, category: 'traditional'|'ai', group, short,
// aliases[], body[blocks], related[slugs] }. Body blocks: p | h | list | note,
// with inline cross-links written as [[slug]] or [[slug|label]].
// See glossary.js for groups, category colours, diagrams, and helpers.

export const TERMS = [
  {
    slug: 'wide-shot',
    title: 'Wide Shot',
    abbr: 'WS',
    category: 'traditional',
    group: 'Shots & Framing',
    short: 'A shot that frames the whole subject within its surroundings, showing where the action takes place.',
    aliases: ['long shot', 'full shot', 'wide'],
    body: [
      { t: 'p', c: 'A wide shot (WS) frames the entire subject and a generous slice of the environment around them. It answers the audience question "where are we and who is here?" before the story zooms into detail. It is the opposite end of the lens scale from the [[close-up]], and the backbone of any good [[coverage]] plan.' },
      { t: 'p', c: 'Wide shots set geography. Once the viewer sees the full space, you can cut to a [[medium-shot]] or [[close-up]] and they will still understand how everyone is positioned. Skip the wide and tight shots can feel disorienting. A specialized wide used to open a scene or location is the [[establishing-shot]].' },
      { t: 'h', c: 'Why it matters' },
      { t: 'list', items: ['Shows spatial relationships between characters and the set', 'Lets you honor the [[180-degree-rule]] by making screen direction legible', 'Gives the editor a safe "reset" shot to return to during a scene'] },
      { t: 'note', c: 'Common mistake: shooting only tight shots and never a wide. Without one anchoring frame, audiences lose track of space and the scene feels claustrophobic.' }
    ],
    related: ['establishing-shot', 'medium-shot', 'coverage', 'aspect-ratio']
  },
  {
    slug: 'medium-shot',
    title: 'Medium Shot',
    abbr: 'MS',
    category: 'traditional',
    group: 'Shots & Framing',
    short: 'A shot framing a subject from roughly the waist up, the workhorse for dialogue and gesture.',
    aliases: ['mid shot', 'waist shot', 'cowboy shot'],
    body: [
      { t: 'p', c: 'A medium shot (MS) frames a person from about the waist up. It sits between the environmental [[wide-shot]] and the intimate [[close-up]], which makes it the natural default for conversation: you can read a character\'s face and still see their hands and body language.' },
      { t: 'p', c: 'Most dialogue scenes are built from medium shots cut together in a [[shot-reverse-shot]] pattern. Because the subject fills a good portion of the frame, the medium shot also plays nicely with the [[rule-of-thirds]], letting you place eyes along the upper third line.' },
      { t: 'note', c: 'If your scene feels flat, do not stay locked on matching mediums. Punch in to a [[close-up]] on an emotional beat so the tighter frame earns its impact.' }
    ],
    related: ['wide-shot', 'close-up', 'shot-reverse-shot', 'rule-of-thirds']
  },
  {
    slug: 'close-up',
    title: 'Close-Up',
    abbr: 'CU',
    category: 'traditional',
    group: 'Shots & Framing',
    short: 'A tight shot of a face or object that fills the frame, used for emotion and emphasis.',
    aliases: ['tight shot', 'close up'],
    body: [
      { t: 'p', c: 'A close-up (CU) fills the frame with a single subject, usually a face from roughly the shoulders up. It strips away the surroundings so the audience focuses on one thing: an expression, a decision, a reaction. It is the emotional opposite of the [[wide-shot]].' },
      { t: 'p', c: 'Close-ups are powerful precisely because they are selective. Establish space first with a [[wide-shot]] or [[medium-shot]], then cut in. A close-up also usually carries shallow [[depth-of-field]], throwing the background soft so the eye has nowhere else to go. Push even tighter, onto just the eyes or lips, and you have an [[extreme-close-up]].' },
      { t: 'h', c: 'When to reach for it' },
      { t: 'list', items: ['A character realizes or decides something', 'A line of dialogue is the turning point of the scene', 'You want the viewer to feel what the character feels'] },
      { t: 'note', c: 'In AI filmmaking the close-up is often a deliberately chosen [[keyframe]]: you generate the exact tight face you want, then let the video model animate from it.' }
    ],
    related: ['extreme-close-up', 'medium-shot', 'depth-of-field', 'keyframe']
  },
  {
    slug: 'extreme-close-up',
    title: 'Extreme Close-Up',
    abbr: 'ECU',
    category: 'traditional',
    group: 'Shots & Framing',
    short: 'An extremely tight shot of a small detail, like eyes or a trigger finger, for maximum intensity.',
    aliases: ['extreme closeup', 'macro shot', 'detail shot'],
    body: [
      { t: 'p', c: 'An extreme close-up (ECU) crops in past the [[close-up]] to isolate a single detail: a pair of eyes, a mouth, a hand on a doorknob. It is the most intense framing in the lens scale and should be used sparingly for exactly that reason.' },
      { t: 'p', c: 'ECUs create tension and draw attention to tiny but crucial information. A detail-oriented ECU of an object (a note, a key, a wound) overlaps with the idea of an [[insert]]. Because the frame is so tight, [[depth-of-field]] is razor thin, so focus has to be exact.' },
      { t: 'note', c: 'Overusing ECUs numbs their power. Save them for the beat that genuinely needs a magnifying glass.' }
    ],
    related: ['close-up', 'insert', 'depth-of-field', 'keyframe']
  },
  {
    slug: 'insert',
    title: 'Insert Shot',
    abbr: null,
    category: 'traditional',
    group: 'Shots & Framing',
    short: 'A tight shot of a specific detail or object cut into a scene to highlight information.',
    aliases: ['insert shot', 'cutaway detail'],
    body: [
      { t: 'p', c: 'An insert is a close detail shot cut into a scene to show the audience something specific: a phone screen, a ticking clock, hands counting money. It is usually framed as a [[close-up]] or [[extreme-close-up]] of the object rather than a person.' },
      { t: 'p', c: 'Inserts are part of thorough [[coverage]]. They let the editor emphasize a plot point or bridge two angles, and like [[b-roll]] they give flexibility in the edit. The difference: an insert is motivated by something inside the scene, while [[b-roll]] is supplementary footage from around it.' },
      { t: 'note', c: 'Shoot inserts even if you are not sure you need them. In the edit a well-timed insert can save an awkward [[cut]].' }
    ],
    related: ['close-up', 'extreme-close-up', 'b-roll', 'coverage']
  },
  {
    slug: 'establishing-shot',
    title: 'Establishing Shot',
    abbr: null,
    category: 'traditional',
    group: 'Shots & Framing',
    short: 'A wide opening shot that shows a location and orients the audience before the scene begins.',
    aliases: ['establisher', 'setting shot'],
    body: [
      { t: 'p', c: 'An establishing shot opens a scene by showing the location, usually as a [[wide-shot]] of a building, street, or landscape. It tells the audience where (and often when) the next action takes place, so the tighter shots that follow make sense.' },
      { t: 'p', c: 'Think of it as a visual sentence: "We are now at the diner, at night." After it lands you can cut inside to a [[medium-shot]] without confusion. The establishing shot sets the geography that the [[180-degree-rule]] then keeps consistent.' },
      { t: 'note', c: 'In AI workflows an establishing shot is a prime candidate for a [[text-to-video]] generation or a strong location [[keyframe]], since it is wide and does not depend on tight character detail.' }
    ],
    related: ['wide-shot', 'medium-shot', '180-degree-rule', 'text-to-video']
  },
  {
    slug: 'coverage',
    title: 'Coverage',
    abbr: null,
    category: 'traditional',
    group: 'Shots & Framing',
    short: 'The full set of shots and angles of a scene that gives the editor everything needed to cut it.',
    aliases: ['scene coverage', 'getting coverage'],
    body: [
      { t: 'p', c: 'Coverage is the complete collection of angles you shoot for a scene: the [[wide-shot]], the [[medium-shot]]s, the [[close-up]]s, the [[insert]]s, and often a [[shot-reverse-shot]] pair for dialogue. Good coverage means the editor can assemble the scene in many ways rather than being locked into one.' },
      { t: 'p', c: 'A [[shot-list]] is the plan; coverage is what you actually capture on set. The more clean, overlapping angles you have, the more freedom you have to shape pace and performance later with each [[cut]].' },
      { t: 'h', c: 'A basic coverage recipe' },
      { t: 'list', items: ['One wide or [[establishing-shot]] for geography', 'A matching [[medium-shot]] for each speaker', 'A [[close-up]] on each actor for emotional beats', 'Any [[insert]]s the story needs'] },
      { t: 'note', c: 'The AI equivalent is generating multiple takes and angles of the same beat so you have options when you do your [[scene-stitching]].' }
    ],
    related: ['shot-list', 'shot-reverse-shot', 'cut', 'wide-shot']
  },
  {
    slug: 'shot-reverse-shot',
    title: 'Shot / Reverse Shot',
    abbr: null,
    category: 'traditional',
    group: 'Shots & Framing',
    short: 'A dialogue editing pattern that alternates between two characters facing each other.',
    aliases: ['shot reverse shot', 'reverse angle'],
    body: [
      { t: 'p', c: 'Shot / reverse shot is the standard way to cut a conversation: show character A speaking, then cut to character B responding, back and forth. Each angle is usually a [[medium-shot]] or [[close-up]] over the other person\'s shoulder.' },
      { t: 'p', c: 'The pattern only reads cleanly if you obey the [[180-degree-rule]] so each person stays on their own side of the screen, and if you maintain an [[eyeline-match]] so their gazes appear to meet. It is a core reason you shoot full [[coverage]].' },
      { t: 'note', c: 'If a conversation suddenly feels "wrong," check your eyelines and your 180 line first. Those two errors cause almost every broken reverse.' }
    ],
    related: ['180-degree-rule', 'eyeline-match', 'medium-shot', 'coverage']
  },
  {
    slug: '180-degree-rule',
    title: '180-Degree Rule',
    abbr: null,
    category: 'traditional',
    group: 'Shots & Framing',
    short: 'Keep the camera on one side of an imaginary line between subjects so screen direction stays consistent.',
    aliases: ['180 degree rule', 'axis of action', 'the line'],
    body: [
      { t: 'p', c: 'The 180-degree rule says to imagine a straight line through your two subjects and keep the camera on one side of it. Do this and a character who faces screen-right in the [[wide-shot]] keeps facing screen-right in every [[close-up]], so the audience never gets lost.' },
      { t: 'p', c: 'Breaking the line makes people appear to suddenly swap sides, which quietly confuses viewers, especially during [[shot-reverse-shot]]. The rule works hand in hand with the [[eyeline-match]]: both exist to keep spatial relationships believable.' },
      { t: 'note', c: 'You can cross the line on purpose for disorientation, but do it with a motivated camera move so the audience sees the transition rather than being jump-cut across it.' }
    ],
    related: ['shot-reverse-shot', 'eyeline-match', 'wide-shot', 'coverage']
  },
  {
    slug: 'eyeline-match',
    title: 'Eyeline Match',
    abbr: null,
    category: 'traditional',
    group: 'Shots & Framing',
    short: 'Cutting so a character\'s gaze direction lines up with what they are looking at.',
    aliases: ['eyeline', 'eye line match'],
    body: [
      { t: 'p', c: 'An eyeline match links two shots so a character\'s look connects to its target. If a character glances off-screen left, the next shot shows what lies to their left. The audience stitches the two frames into a single space.' },
      { t: 'p', c: 'Eyelines are essential in [[shot-reverse-shot]] dialogue: if both actors look the same direction, they appear to be staring past each other instead of at each other. The eyeline match is enforced by the same geometry as the [[180-degree-rule]].' },
      { t: 'note', c: 'In AI filmmaking, mismatched eyelines are a frequent giveaway. When you set a [[keyframe]] for each angle, deliberately art-direct where the character is looking.' }
    ],
    related: ['shot-reverse-shot', '180-degree-rule', 'close-up', 'keyframe']
  },
  {
    slug: 'rule-of-thirds',
    title: 'Rule of Thirds',
    abbr: null,
    category: 'traditional',
    group: 'Camera & Lens',
    short: 'A composition guide that places key elements along a 3x3 grid rather than dead center.',
    aliases: ['thirds', 'composition grid'],
    body: [
      { t: 'p', c: 'The rule of thirds divides the frame into a 3x3 grid and suggests placing important elements along the lines or at their intersections. Eyes often sit on the upper third line; a horizon rarely cuts the frame exactly in half.' },
      { t: 'p', c: 'It is a starting guide, not a law, but it produces balanced, dynamic frames across every shot size from the [[wide-shot]] to the [[close-up]]. Where you place the subject also interacts with your chosen [[aspect-ratio]] and your [[depth-of-field]].' },
      { t: 'note', c: 'Leave "looking room" in the direction a subject faces. Combined with the thirds grid, this keeps a profile from feeling cramped against the edge.' }
    ],
    related: ['aspect-ratio', 'depth-of-field', 'close-up', 'blocking']
  },
  {
    slug: 'aspect-ratio',
    title: 'Aspect Ratio',
    abbr: null,
    category: 'traditional',
    group: 'Camera & Lens',
    short: 'The width-to-height proportion of the frame, such as 16:9 or 2.39:1.',
    aliases: ['frame ratio', '16:9', 'widescreen'],
    body: [
      { t: 'p', c: 'Aspect ratio is the shape of your frame expressed as width to height. Common choices are 16:9 for standard video, 2.39:1 for a wide cinematic look, and 9:16 for vertical social content. The ratio shapes how you compose every shot.' },
      { t: 'p', c: 'A wider ratio emphasizes landscape and gives room for an [[establishing-shot]]; a taller ratio favors faces and the [[close-up]]. Your choice affects how you apply the [[rule-of-thirds]] and how much space you have for [[blocking]].' },
      { t: 'note', c: 'In AI tools, set your target aspect ratio before you generate. Reframing a 16:9 generation into 9:16 later usually means cropping away composition you cared about, or re-running the [[text-to-video]] generation.' }
    ],
    related: ['rule-of-thirds', 'establishing-shot', 'text-to-video', 'depth-of-field']
  },
  {
    slug: 'depth-of-field',
    title: 'Depth of Field',
    abbr: null,
    category: 'traditional',
    group: 'Camera & Lens',
    short: 'How much of the scene is in sharp focus, from a thin focal plane to front-to-back sharpness.',
    aliases: ['dof', 'shallow focus', 'bokeh'],
    body: [
      { t: 'p', c: 'Depth of field (DoF) is the range of distance that appears acceptably sharp. Shallow depth of field keeps the subject crisp and the background a soft blur; deep depth of field holds everything sharp from foreground to horizon.' },
      { t: 'p', c: 'Shallow focus isolates a subject and is a staple of the [[close-up]] and [[extreme-close-up]], guiding the eye like the [[rule-of-thirds]] does. Deep focus suits a [[wide-shot]] where you want the whole environment legible.' },
      { t: 'note', c: 'AI video models imitate shallow depth of field as a style cue. Mentioning "shallow depth of field, soft bokeh background" in a [[look-prompt]] nudges the model toward a cinematic focus falloff.' }
    ],
    related: ['close-up', 'wide-shot', 'rule-of-thirds', 'look-prompt']
  },
  {
    slug: 'three-point-lighting',
    title: 'Three-Point Lighting',
    abbr: null,
    category: 'traditional',
    group: 'Lighting',
    short: 'A standard lighting setup using a key, a fill, and a back light to shape a subject.',
    aliases: ['3 point lighting', 'key fill back'],
    body: [
      { t: 'p', c: 'Three-point lighting is the foundational setup for lighting a subject using three sources. The key light is the main, brightest light; the fill softens the shadows the key creates; the back light (or rim) separates the subject from the background.' },
      { t: 'p', c: 'This setup gives faces dimension and depth, which matters most in a [[medium-shot]] or [[close-up]] where the face dominates the frame. The ratio between key and fill sets the mood, from flat and friendly to high-contrast and dramatic.' },
      { t: 'h', c: 'The three lights' },
      { t: 'list', items: ['Key: the primary light, placed off to one side', 'Fill: a softer light opposite the key to control shadow depth', 'Back / rim: behind the subject to create a separating edge of light'] },
      { t: 'note', c: 'In AI generation you cannot place physical lights, so you describe them. A [[look-prompt]] like "soft key from camera-left, warm rim light" steers the model toward a three-point look.' }
    ],
    related: ['close-up', 'medium-shot', 'look-prompt', 'depth-of-field']
  },
  {
    slug: 'cut',
    title: 'Cut',
    abbr: null,
    category: 'traditional',
    group: 'Editing',
    short: 'An instant transition from one shot to the next, the most basic edit in film.',
    aliases: ['hard cut', 'straight cut'],
    body: [
      { t: 'p', c: 'A cut is an instantaneous switch from one shot to another with no transition between them. It is the default edit and the invisible glue of filmmaking: cutting between the shots in your [[coverage]] is how a scene gets built.' },
      { t: 'p', c: 'A good cut feels motivated, often triggered by an action or a line, so the audience barely notices it. Compare it with the [[dissolve]], which blends two shots and signals a softer passage of time, and with the overlapping [[j-and-l-cuts]] used in dialogue.' },
      { t: 'note', c: 'The AI equivalent of cutting your coverage together is [[scene-stitching]]: joining separate generated clips into a continuous sequence.' }
    ],
    related: ['dissolve', 'j-and-l-cuts', 'coverage', 'scene-stitching']
  },
  {
    slug: 'dissolve',
    title: 'Dissolve',
    abbr: null,
    category: 'traditional',
    group: 'Editing',
    short: 'A transition where one shot fades out as the next fades in, overlapping briefly.',
    aliases: ['cross dissolve', 'crossfade'],
    body: [
      { t: 'p', c: 'A dissolve blends the end of one shot into the start of the next, so for a moment both images overlap. Where a [[cut]] is instant, a dissolve is gradual, which gives it a different grammar.' },
      { t: 'p', c: 'Dissolves traditionally signal a passage of time or a change of place, and sometimes a dreamy or reflective mood. Used too often they feel soft and dated, so most sequences lean on the [[cut]] and reserve the dissolve for specific transitions.' },
      { t: 'note', c: 'When [[scene-stitching]] AI clips, a short dissolve can hide a mismatch between two generations that will not cut together cleanly.' }
    ],
    related: ['cut', 'j-and-l-cuts', 'scene-stitching', 'b-roll']
  },
  {
    slug: 'j-and-l-cuts',
    title: 'J-Cuts and L-Cuts',
    abbr: null,
    category: 'traditional',
    group: 'Editing',
    short: 'Edits where picture and sound change at different moments, overlapping across the cut.',
    aliases: ['j cut', 'l cut', 'split edit', 'audio lead'],
    body: [
      { t: 'p', c: 'J-cuts and L-cuts are split edits where the audio and the picture do not change at the same instant. In a J-cut you hear the next scene\'s sound before you see it; in an L-cut the previous scene\'s audio lingers over the new picture.' },
      { t: 'p', c: 'These overlaps make a [[cut]] feel smooth and natural, especially in dialogue cut as [[shot-reverse-shot]]. Hearing a character begin to answer before you cut to them keeps a conversation flowing instead of feeling mechanical.' },
      { t: 'note', c: 'Named for how the clips look on an editing timeline, where the trailing or leading audio forms a J or L shape under the video track.' }
    ],
    related: ['cut', 'dissolve', 'shot-reverse-shot', 'b-roll']
  },
  {
    slug: 'b-roll',
    title: 'B-Roll',
    abbr: null,
    category: 'traditional',
    group: 'Editing',
    short: 'Supplementary footage cut over the main footage to add context, cover edits, or set mood.',
    aliases: ['b roll', 'cutaway footage', 'overlay footage'],
    body: [
      { t: 'p', c: 'B-roll is secondary footage that supports the primary action (the "A-roll"). It covers establishing details, scenery, and texture, and it is what you cut away to while a voice or interview continues underneath.' },
      { t: 'p', c: 'Beyond mood, b-roll is a practical tool: laying a cutaway over a rough [[cut]] hides a jump or a mistake in the main footage. It overlaps with the [[insert]], though inserts are tied to a specific story point while b-roll is broader context, often shot like an [[establishing-shot]].' },
      { t: 'note', c: 'Always gather more b-roll than you think you need. In AI workflows, extra [[text-to-video]] atmosphere clips serve the same rescue role in the edit.' }
    ],
    related: ['insert', 'establishing-shot', 'cut', 'text-to-video']
  },
  {
    slug: 'blocking',
    title: 'Blocking',
    abbr: null,
    category: 'traditional',
    group: 'Story & Script',
    short: 'Planning where actors and the camera move within a scene.',
    aliases: ['staging', 'actor blocking'],
    body: [
      { t: 'p', c: 'Blocking is the choreography of a scene: where the actors stand and move, and where the camera goes in response. It is decided before you roll and it dictates what shots are even possible to capture.' },
      { t: 'p', c: 'Thoughtful blocking lets a single [[wide-shot]] evolve as actors move closer or farther, and it determines how you honor the [[180-degree-rule]]. Blocking choices feed directly into the [[shot-list]], since you can only plan shots once you know how the scene moves.' },
      { t: 'note', c: 'In AI pre-visualization, a [[gray-box]] pass is a form of digital blocking: rough placeholder figures that let you test staging and camera moves before committing to a full generation.' }
    ],
    related: ['shot-list', 'wide-shot', '180-degree-rule', 'gray-box']
  },
  {
    slug: 'shot-list',
    title: 'Shot List',
    abbr: null,
    category: 'traditional',
    group: 'Story & Script',
    short: 'A planned, ordered list of every shot you intend to capture for a scene or project.',
    aliases: ['shotlist', 'shot plan'],
    body: [
      { t: 'p', c: 'A shot list is the production plan: an ordered inventory of every shot you intend to get, usually noting the shot size (like [[wide-shot]], [[medium-shot]], [[close-up]]), the camera angle, and the action in each. It turns a script into a shootable checklist.' },
      { t: 'p', c: 'A thorough shot list drives your [[coverage]] so you leave set with everything the editor needs. It depends on your [[blocking]], because you can only list shots once you know how actors and camera move.' },
      { t: 'h', c: 'What a shot list usually records' },
      { t: 'list', items: ['Shot number and scene', 'Shot size and angle', 'Camera movement, if any', 'A one-line description of the action'] },
      { t: 'note', c: 'The AI analog is a [[node-based-workflow]]: both are structured plans that lay out, step by step, exactly what each piece of the sequence should be before you commit resources to making it.' }
    ],
    related: ['coverage', 'blocking', 'node-based-workflow', 'medium-shot']
  },
  {
    slug: 'keyframe',
    title: 'Keyframe',
    abbr: null,
    category: 'ai',
    group: 'AI Workflow',
    short: 'A chosen still image that anchors an AI video generation, defining a precise moment to animate from.',
    aliases: ['key frame', 'anchor frame', 'start image'],
    body: [
      { t: 'p', c: 'In AI filmmaking a keyframe is a specific still image you lock in and then hand to a video model (Kling, Seedance, Runway) as the frame to animate from. Instead of hoping [[text-to-video]] guesses the right composition, you generate or choose the exact image, often a precise [[close-up]], and let the motion grow out of it.' },
      { t: 'p', c: 'This echoes the traditional idea of composing a shot before you roll. A clean keyframe lets you control [[blocking]], framing, and [[eyeline-match]] up front. In tools that take a start and end image you set a [[first-frame-last-frame]] pair; the keyframe is the single most important anchor among them.' },
      { t: 'h', c: 'How to use it' },
      { t: 'list', items: ['Generate a strong still (ChatGPT image, a model render) at your target [[aspect-ratio]]', 'Use it as the start frame for a [[text-to-video]] generation', 'Reuse the same keyframe subject to fight [[identity-drift]]'] },
      { t: 'note', c: 'A sharp, intentional keyframe is the single biggest lever on output quality. Fix composition in the still before you ever animate it.' }
    ],
    related: ['first-frame-last-frame', 'text-to-video', 'close-up', 'identity-drift']
  },
  {
    slug: 'first-frame-last-frame',
    title: 'First Frame / Last Frame',
    abbr: null,
    category: 'ai',
    group: 'AI Workflow',
    short: 'Giving a video model both a start image and an end image so it animates the motion between them.',
    aliases: ['fflf', 'start and end frame', 'first last frame'],
    body: [
      { t: 'p', c: 'First frame / last frame is a generation mode (in Kling, Seedance and others) where you supply two images, the beginning and the end of a clip, and the model interpolates the motion that connects them. It gives you far more control than a single [[keyframe]] alone.' },
      { t: 'p', c: 'This is how you direct a precise move: a character turning, a push from a [[wide-shot]] feel into a [[close-up]] feel, a door opening. Because you define both ends, it is also a powerful tool for consistency and for setting up a clean [[scene-stitching]] handoff, where one clip\'s last frame becomes the next clip\'s first frame.' },
      { t: 'note', c: 'Make your two frames genuinely compatible. If the subject, lighting, or [[style-reference]] differ too much between start and end, the model produces a warping morph instead of believable motion.' }
    ],
    related: ['keyframe', 'scene-stitching', 'text-to-video', 'style-reference']
  },
  {
    slug: 'scene-stitching',
    title: 'Scene Stitching',
    abbr: null,
    category: 'ai',
    group: 'AI Workflow',
    short: 'Joining multiple short AI-generated clips into one continuous, coherent sequence.',
    aliases: ['stitching', 'clip stitching', 'sequencing clips'],
    body: [
      { t: 'p', c: 'Scene stitching is the AI-era act of assembling many short generated clips (most models output only a few seconds at a time) into a longer, continuous scene. It is the direct descendant of the editor\'s [[cut]]: you are joining shots so they read as one flow.' },
      { t: 'p', c: 'The art is in continuity across the joins. You maintain a consistent [[style-reference]], chain clips using [[first-frame-last-frame]] so one clip ends where the next begins, and you still obey old rules like the [[180-degree-rule]] so screen direction holds. Where clips refuse to cut cleanly, a short [[dissolve]] can bridge them.' },
      { t: 'h', c: 'Stitching checklist' },
      { t: 'list', items: ['Match color and look across clips before joining', 'Hand off motion with [[first-frame-last-frame]] continuity', 'Watch for [[identity-drift]] in recurring characters', 'Final assembly in an editor like DaVinci Resolve'] },
      { t: 'note', c: 'Stitching is where generated shots become a film. Treat your clips like [[coverage]]: generate options, then choose the ones that cut together.' }
    ],
    related: ['cut', 'first-frame-last-frame', 'dissolve', 'identity-drift']
  },
  {
    slug: 'look-prompt',
    title: 'Look Prompt',
    abbr: null,
    category: 'ai',
    group: 'AI Workflow',
    short: 'The part of a prompt that defines the visual style, lighting, and mood of a generation.',
    aliases: ['style prompt', 'look', 'aesthetic prompt'],
    body: [
      { t: 'p', c: 'A look prompt is the descriptive language that tells an image or video model how a shot should look, as opposed to what happens in it. It covers lighting, color, lens feel, film stock, and mood, and it is how you art-direct a generation with words.' },
      { t: 'p', c: 'This is where traditional craft vocabulary pays off: describing "soft [[three-point-lighting]], shallow [[depth-of-field]], warm tungsten" steers the model toward a cinematic image. Reusing the exact same look prompt across every generation is a key way to keep a sequence consistent, working alongside a [[style-reference]] image.' },
      { t: 'note', c: 'Keep a saved, reusable look prompt for each project. Changing its wording between shots is a common cause of a sequence that will not match during [[scene-stitching]].' }
    ],
    related: ['style-reference', 'three-point-lighting', 'depth-of-field', 'context-scaffolding']
  },
  {
    slug: 'context-scaffolding',
    title: 'Context Scaffolding',
    abbr: null,
    category: 'ai',
    group: 'AI Workflow',
    short: 'Building up reference material and instructions that give an AI model the context to stay consistent.',
    aliases: ['scaffolding', 'context building', 'reference stack'],
    body: [
      { t: 'p', c: 'Context scaffolding is the practice of assembling the supporting material a model needs, reference images, character sheets, a locked [[look-prompt]], prior frames, so each generation has enough grounding to stay on-model. Instead of a bare prompt, you give the model a structured frame of reference.' },
      { t: 'p', c: 'It is the AI equivalent of a director\'s prep: lookbooks, a [[shot-list]], and continuity notes. Strong scaffolding is your main defense against [[identity-drift]], and it feeds tools like a [[style-reference]] and [[control-net]] with the right inputs. In a [[node-based-workflow]] the scaffolding is literally wired in as reusable reference nodes.' },
      { t: 'note', c: 'Invest in scaffolding once at the start of a project. A good character sheet and reference stack pays off on every single shot afterward.' }
    ],
    related: ['look-prompt', 'style-reference', 'identity-drift', 'node-based-workflow']
  },
  {
    slug: 'node-based-workflow',
    title: 'Node-Based Workflow',
    abbr: null,
    category: 'ai',
    group: 'AI Workflow',
    short: 'Building a generation pipeline as a visual graph of connected nodes rather than one-off prompts.',
    aliases: ['node graph', 'node workflow', 'weavy', 'comfyui'],
    body: [
      { t: 'p', c: 'A node-based workflow builds your AI pipeline as a visual graph: each box (node) is a step, text prompt, image input, model, upscaler, and you wire them together so outputs feed the next stage. Tools like Weavy and ComfyUI work this way, and Runway\'s MCP connections let you orchestrate models similarly.' },
      { t: 'p', c: 'The power is repeatability and control. Once a graph is built you can swap one input and re-run the whole chain, keeping your [[look-prompt]] and [[style-reference]] fixed while changing only the subject. This makes it the AI analog of a [[shot-list]]: a structured, reusable plan for how every shot gets produced.' },
      { t: 'h', c: 'Typical nodes in a chain' },
      { t: 'list', items: ['Reference and [[context-scaffolding]] inputs', 'A [[text-to-video]] or image generation node', 'A [[control-net]] node to constrain pose or composition', 'An [[upscaling]] node for final resolution'] },
      { t: 'note', c: 'Build your graph around reusable reference nodes. That is what lets you fight [[identity-drift]] shot after shot without rebuilding from scratch.' }
    ],
    related: ['shot-list', 'control-net', 'upscaling', 'context-scaffolding']
  },
  {
    slug: 'gray-box',
    title: 'Gray-Box',
    abbr: null,
    category: 'ai',
    group: 'AI Workflow',
    short: 'A rough placeholder pass used to plan staging and camera before committing to full generation.',
    aliases: ['graybox', 'grey box', 'blockout', 'previs'],
    body: [
      { t: 'p', c: 'A gray-box is a rough, unfinished pass, borrowed from game and 3D design, where simple placeholder shapes stand in for final content so you can test the plan cheaply. In AI filmmaking it means roughing out a shot\'s composition and camera move before spending time on a polished generation.' },
      { t: 'p', c: 'It is digital [[blocking]]: you figure out framing, [[eyeline-match]], and movement with crude stand-ins first, then replace them with real generations once the plan works. This saves you from burning credits on beautiful clips that turn out to be staged wrong.' },
      { t: 'note', c: 'Gray-box early and often. A five-minute rough layout prevents an hour of re-generating a shot whose [[blocking]] never worked in the first place.' }
    ],
    related: ['blocking', 'eyeline-match', 'keyframe', 'node-based-workflow']
  },
  {
    slug: 'control-net',
    title: 'ControlNet',
    abbr: null,
    category: 'ai',
    group: 'AI Models & Tools',
    short: 'A technique that constrains a generation using a guide input like a pose, depth map, or edge sketch.',
    aliases: ['controlnet', 'control net', 'pose control', 'conditioning', 'motion control', 'motion transfer', 'reference video'],
    body: [
      { t: 'p', c: 'ControlNet is a method for steering image generation with a structural guide: a stick-figure pose, a depth map, an edge outline, or a reference layout. The model keeps your composition and shape while generating the surface detail, so you get the pose you drew rather than a random one.' },
      { t: 'p', c: 'This gives filmmakers the control a camera and [[blocking]] give on set. You can lock a character\'s pose to match an [[eyeline-match]], or hold a composition steady across shots. It is usually one node in a [[node-based-workflow]] and works alongside a [[style-reference]], which handles look while ControlNet handles structure.' },
      { t: 'note', c: 'Use ControlNet when the pose or framing matters precisely. Pair it with a [[style-reference]] so you control both the shape and the look at once.' }
    ],
    related: ['node-based-workflow', 'style-reference', 'blocking', 'identity-drift']
  },
  {
    slug: 'upscaling',
    title: 'Upscaling',
    abbr: null,
    category: 'ai',
    group: 'AI Models & Tools',
    short: 'Increasing the resolution of a generated image or clip while adding or preserving detail.',
    aliases: ['upscale', 'upres', 'super resolution'],
    body: [
      { t: 'p', c: 'Upscaling raises the resolution of a generation, turning a smaller output into a higher-resolution one and often reconstructing crisp detail along the way. Because many models generate at modest resolution for speed, upscaling is the finishing step that makes footage delivery-ready.' },
      { t: 'p', c: 'It typically sits at the end of a [[node-based-workflow]], after the [[text-to-video]] generation and before final assembly. Upscaling detail matters most on a [[close-up]], where soft edges on a face are most visible. In a finishing tool like DaVinci Resolve you may upscale and then grade in one pass.' },
      { t: 'note', c: 'Upscale last, after you have chosen the take. Upscaling every draft wastes time and compute on shots you will throw away during [[scene-stitching]].' }
    ],
    related: ['node-based-workflow', 'text-to-video', 'close-up', 'scene-stitching']
  },
  {
    slug: 'text-to-video',
    title: 'Text-to-Video',
    abbr: null,
    category: 'ai',
    group: 'AI Models & Tools',
    short: 'Generating a video clip directly from a text prompt describing the shot.',
    aliases: ['t2v', 'txt2vid', 'prompt to video'],
    body: [
      { t: 'p', c: 'Text-to-video (T2V) generates a moving clip from a written description, with no starting image required. You describe the subject, action, and look, and models like Seedance, Kling, and Runway produce a short clip. It is the most direct way to conjure a shot from nothing.' },
      { t: 'p', c: 'Pure text-to-video is great for atmosphere and an [[establishing-shot]] where exact composition matters less. For precise framing, filmmakers usually prefer to generate a [[keyframe]] first and animate it, or use [[first-frame-last-frame]], because text alone gives the model a lot of freedom. The quality of your [[look-prompt]] largely determines the result.' },
      { t: 'note', c: 'Set your [[aspect-ratio]] and look up front in the prompt. Chaining many T2V clips is exactly the material you later join through [[scene-stitching]].' }
    ],
    related: ['keyframe', 'first-frame-last-frame', 'look-prompt', 'establishing-shot']
  },
  {
    slug: 'style-reference',
    title: 'Style Reference',
    abbr: null,
    category: 'ai',
    group: 'Consistency & Control',
    short: 'A reference image fed to a model to carry a consistent visual look across generations.',
    aliases: ['style ref', 'sref', 'reference image', 'style transfer'],
    body: [
      { t: 'p', c: 'A style reference is an image you give a model so new generations inherit its look: color palette, lighting, texture, and overall aesthetic. Rather than describing the style in words, you show it, which is often more reliable than a [[look-prompt]] alone.' },
      { t: 'p', c: 'Style references are central to consistency. Feeding the same reference to every shot keeps a sequence coherent so it survives [[scene-stitching]], and it is a key piece of your [[context-scaffolding]]. Where a [[control-net]] controls structure and pose, a style reference controls look; the two are often used together.' },
      { t: 'note', c: 'Keep a dedicated style reference per project and reuse it everywhere. Changing references mid-sequence is a top cause of shots that will not match in the edit.' }
    ],
    related: ['look-prompt', 'control-net', 'context-scaffolding', 'identity-drift']
  },
  {
    slug: 'identity-drift',
    title: 'Identity Drift',
    abbr: null,
    category: 'ai',
    group: 'Consistency & Control',
    short: 'When a character\'s face or features gradually change across AI generations, breaking continuity.',
    aliases: ['character drift', 'face drift', 'consistency drift'],
    body: [
      { t: 'p', c: 'Identity drift is the AI-era continuity problem where a character\'s face, hair, wardrobe, or proportions subtly shift from shot to shot. Because each generation is independent, a person can look like a slightly different individual in every clip, which shatters the illusion of a continuous character.' },
      { t: 'p', c: 'It is most glaring on a [[close-up]], where the face fills the frame, and across cuts during [[scene-stitching]]. The defenses are all about consistency: a locked [[style-reference]], solid [[context-scaffolding]] with a character sheet, reusing a trusted [[keyframe]], and constraining shots with a [[control-net]].' },
      { t: 'h', c: 'Ways to fight it' },
      { t: 'list', items: ['Reuse the same character reference image every time', 'Keep a fixed [[style-reference]] and [[look-prompt]]', 'Chain shots with [[first-frame-last-frame]] continuity', 'Review faces at full size before you commit a take'] },
      { t: 'note', c: 'Think of identity drift as the AI version of a continuity error. Catch it the way a script supervisor would: by comparing shots side by side before locking the edit.' }
    ],
    related: ['style-reference', 'context-scaffolding', 'keyframe', 'close-up']
  },
  {
    slug: 'medium-close-up',
    title: 'Medium Close-Up',
    abbr: 'MCU',
    category: 'traditional',
    group: 'Shots & Framing',
    short: 'A shot framing a person from about the chest or neck up, tighter than a medium and looser than a close-up.',
    aliases: ['mcu', 'medium close', 'chest shot'],
    body: [
      { t: 'p', c: 'A medium close-up (MCU) sits between the [[medium-shot]] and the [[close-up]] on the lens scale. You see the face clearly, plus a little of the shoulders and chest, so expression reads strongly while the character still has some room around them. It is the most common framing in dialogue scenes: 19 of the 51 shots in the cohort\'s True Romance shot-list example are MCUs.' },
      { t: 'p', c: 'Be precise with the name when you prompt. In the Week 3 shot-list review, Darion corrected frames labelled "medium close-up" that were really mediums: head and chest is a medium; a medium close-up is tighter, about from the neck up. Naming the size correctly is how you get the size you want from a model.' },
      { t: 'note', c: 'Cutting from a [[medium-shot]] to an MCU on the line that matters is an easy way to add emphasis without jumping all the way to a [[close-up]].' }
    ],
    related: ['medium-shot', 'close-up', 'shot-reverse-shot', 'over-the-shoulder']
  },
  {
    slug: 'medium-wide-shot',
    title: 'Medium Wide Shot',
    abbr: 'MWS',
    category: 'traditional',
    group: 'Shots & Framing',
    short: 'A shot framing a person from about the knees up, or a small group with some of the room around them.',
    aliases: ['mws', 'medium long shot', 'medium full shot', 'cowboy'],
    body: [
      { t: 'p', c: 'A medium wide shot (MWS) is looser than a [[medium-shot]] but tighter than a [[wide-shot]]: roughly knees up on a single person, or a group around a table with a bit of the set showing. It is useful for showing how several characters relate to each other in space while still reading their body language.' },
      { t: 'p', c: 'Keep your naming simple. In the cohort\'s shot-list review, frames called "medium long" were reclassified as wides because they were orienting the viewer in the space. If you can see thighs, knees and feet, you are effectively wide; most shot lists only need wide, medium, [[close-up]] and [[insert]], plus a few variations like this one.' }
    ],
    related: ['wide-shot', 'medium-shot', 'coverage', 'blocking']
  },
  {
    slug: 'extreme-wide-shot',
    title: 'Extreme Wide Shot',
    abbr: 'EWS',
    category: 'traditional',
    group: 'Shots & Framing',
    short: 'A very distant shot where the landscape or city dominates and people are tiny or absent.',
    aliases: ['ews', 'extreme long shot', 'xls', 'very wide'],
    body: [
      { t: 'p', c: 'An extreme wide shot (EWS) pulls so far back that the environment is the subject: a city skyline, a desert road, a lone car on a highway. It is often used as an [[establishing-shot]] or to make a character feel small and isolated.' },
      { t: 'p', c: 'Use the industry word. Directors say "extreme," not "very," so prompt for an "extreme wide shot" rather than a "very wide" one. That said, most shot lists only need plain "wide"; save the extreme wide for the moments where scale is the point.' }
    ],
    related: ['wide-shot', 'establishing-shot', 'overhead-shot', 'aspect-ratio']
  },
  {
    slug: 'over-the-shoulder',
    title: 'Over-the-Shoulder Shot',
    abbr: 'OTS',
    category: 'traditional',
    group: 'Shots & Framing',
    short: 'A shot framed from behind one character\'s shoulder, looking at the person they are facing.',
    aliases: ['ots', 'over the shoulder', 'dirty single'],
    body: [
      { t: 'p', c: 'An over-the-shoulder shot (OTS) places the camera behind one character so a sliver of their head and shoulder frames the foreground, with the person they are talking to in focus beyond. It is the building block of [[shot-reverse-shot]] dialogue, because it keeps both characters connected in the same frame.' },
      { t: 'p', c: 'The foreground shoulder should be cropped and soft. In the bonus-session critique of Kush\'s diner scene, the mentors suggested cropping Unc down to his hat brim and ear, keeping Nephew sharp, and letting the [[depth-of-field]] fall off naturally behind him. The Pulp Fiction frame of Marsellus and Butch is a textbook OTS: heavy weight on one side, the subject just off centre, and strong [[depth-of-field|bokeh]] behind.' },
      { t: 'note', c: 'An OTS with a crowded background loses its power. Keep [[negative-space]] around the face you want the audience to watch.' }
    ],
    related: ['shot-reverse-shot', 'medium-close-up', 'depth-of-field', 'eyeline-match']
  },
  {
    slug: 'point-of-view-shot',
    title: 'Point-of-View Shot',
    abbr: 'POV',
    category: 'traditional',
    group: 'Shots & Framing',
    short: 'A shot that shows exactly what a character sees, as if through their eyes.',
    aliases: ['pov', 'pov shot', 'subjective shot', 'first person'],
    body: [
      { t: 'p', c: 'A point-of-view shot (POV) puts the camera where a character\'s eyes are, so the audience sees what they see. It is usually set up by an [[eyeline-match]]: show the character looking, then cut to their POV, and the viewer understands instantly whose view it is.' },
      { t: 'p', c: 'POV and other "angles with a point of view" came up repeatedly in the Week 3 critique as a cure for flat AI coverage: an overhead at the stove, a shot from inside the oven, a view through a doorway. An unexpected angle keeps the eye hungry.' }
    ],
    related: ['eyeline-match', 'over-the-shoulder', 'high-angle-shot', 'low-angle-shot']
  },
  {
    slug: 'dutch-angle',
    title: 'Dutch Angle',
    abbr: null,
    category: 'traditional',
    group: 'Shots & Framing',
    short: 'A shot with the camera tilted so the horizon is canted, creating unease or disorientation.',
    aliases: ['dutch tilt', 'canted angle', 'oblique angle', 'dutch'],
    body: [
      { t: 'p', c: 'A Dutch angle rolls the camera sideways so the horizon and verticals run on a diagonal. The off-kilter frame signals that something is wrong: tension, madness, danger, intoxication. The True Romance shot-list example on the Students page notes "Dutch angle = canted horizon" because the scene uses it to build menace around the table.' },
      { t: 'p', c: 'Use it sparingly and on purpose. A whole scene of tilted frames stops reading as tension and starts reading as a gimmick. When you prompt for one, say "Dutch angle" or "canted camera"; models know the term.' }
    ],
    related: ['low-angle-shot', 'high-angle-shot', 'shot-list', 'coverage']
  },
  {
    slug: 'low-angle-shot',
    title: 'Low-Angle Shot',
    abbr: null,
    category: 'traditional',
    group: 'Shots & Framing',
    short: 'A shot taken from below the subject, looking up, which makes them seem bigger or more powerful.',
    aliases: ['low angle', 'worm\'s-eye view', 'looking up'],
    body: [
      { t: 'p', c: 'A low-angle shot puts the camera below the subject\'s eye line and tilts up. The subject looms over the viewer, so it reads as power, threat or heroism. Taken to the extreme, from ground level, it becomes a worm\'s-eye view.' },
      { t: 'p', c: 'Angle is a storytelling choice, not just a size. In the bonus session, one of the mentors described prompting a low camera angle to make a model\'s legs look longer: the angle changes how a body reads. Pair a low angle on one character with a [[high-angle-shot]] on another and you have shown who holds the power in the scene.' }
    ],
    related: ['high-angle-shot', 'dutch-angle', 'point-of-view-shot', 'blocking']
  },
  {
    slug: 'high-angle-shot',
    title: 'High-Angle Shot',
    abbr: null,
    category: 'traditional',
    group: 'Shots & Framing',
    short: 'A shot taken from above the subject, looking down, which can make them seem smaller or vulnerable.',
    aliases: ['high angle', 'looking down'],
    body: [
      { t: 'p', c: 'A high-angle shot places the camera above the subject and tilts down. It diminishes the subject, suggesting weakness, isolation or being watched. Go straight down and it becomes an [[overhead-shot]].' },
      { t: 'p', c: 'It is one of the simplest ways to break up flat, eye-level AI coverage. Kush\'s Week 3 footage got praise for an overhead shot that "broke up the coverage." Vary angle as deliberately as you vary shot size.' }
    ],
    related: ['low-angle-shot', 'overhead-shot', 'point-of-view-shot', 'coverage']
  },
  {
    slug: 'overhead-shot',
    title: 'Overhead Shot',
    abbr: null,
    category: 'traditional',
    group: 'Shots & Framing',
    short: 'A shot looking straight down on the action from above, like a bird or a drone would see it.',
    aliases: ['bird\'s-eye view', 'birds eye', 'top shot', 'top-down', 'drone shot', 'god\'s-eye view'],
    body: [
      { t: 'p', c: 'An overhead shot looks straight down on the scene. It turns the action into a pattern or a map: a table of hands, a car crossing an intersection, a body on a floor. High above a landscape, it is often called a bird\'s-eye or drone shot.' },
      { t: 'p', c: 'Overheads are powerful in AI work because they give the model a clear, uncluttered composition and give the edit a fresh angle. In Week 1, Darion also used a top-down [[blocking]] diagram, a plan view of the set, to work out where every character enters and moves before generating a single shot.' }
    ],
    related: ['high-angle-shot', 'extreme-wide-shot', 'blocking', 'establishing-shot']
  },
  {
    slug: 'negative-space',
    title: 'Negative Space',
    abbr: null,
    category: 'traditional',
    group: 'Shots & Framing',
    short: 'The empty areas of a frame that give the eye somewhere to rest and point it toward the subject.',
    aliases: ['empty space', 'breathing room', 'clutter', 'declutter'],
    body: [
      { t: 'p', c: 'Negative space is the part of the frame that is not the subject: a plain wall, a dark corner, open sky, a blurred background. It is not wasted space. It isolates the subject, creates mood, and tells the eye where to land.' },
      { t: 'p', c: 'AI fills every inch by default, and clutter is one of the clearest AI tells. In Week 3, too many plants and apples on the counter edge were flagged; in the bonus session, about 80% of Kush\'s diner frame was busy (pictures, blinds, sunset, floor print, a salt shaker) and there was "nowhere for our eyes to rest." The fix was a simpler composition, a narrower [[color-palette]], and moving extra story details into their own [[insert]] shots.' },
      { t: 'h', c: 'How to get it' },
      { t: 'list', items: ['Ask the model to study a reference frame\'s composition and leave room for the eye', 'Remove props that would not really be there', 'Use [[depth-of-field]] to soften a busy background', 'Check the frame on a 5 × 2 grid: if every square is busy, declutter'] }
    ],
    related: ['rule-of-thirds', 'depth-of-field', 'color-palette', 'frame-within-a-frame']
  },
  {
    slug: 'frame-within-a-frame',
    title: 'Frame Within a Frame',
    abbr: null,
    category: 'traditional',
    group: 'Shots & Framing',
    short: 'A composition that uses doorways, windows, shadows or objects to box in the subject inside the shot.',
    aliases: ['framing device', 'internal frame', 'natural frame'],
    body: [
      { t: 'p', c: 'A frame within a frame uses something in the scene, such as a doorway, a window, an arch, a mirror or a pool of shadow, to create a second border around the subject. It focuses attention, adds depth, and often says something about the character: trapped, watched, apart.' },
      { t: 'p', c: 'In the bonus session, the mentors used a horror example: a lamp-lit doorway at the end of a pitch-dark hall, so the cinematographer "has created his own frame within the frame." Dark objects can do the same job; in the Pulp Fiction adrenaline scene, shadowed TVs and a black chair box in the lit characters. It works hand in hand with [[low-key-lighting]] and [[negative-space]].' }
    ],
    related: ['negative-space', 'low-key-lighting', 'rule-of-thirds', 'contrast']
  },
  {
    slug: 'focal-length',
    title: 'Focal Length',
    abbr: 'mm',
    category: 'traditional',
    group: 'Camera & Lens',
    short: 'A lens\'s magnification, measured in millimetres: low numbers are wide, high numbers are telephoto.',
    aliases: ['lens', 'lens length', '35mm', '50mm', 'wide lens', 'telephoto', 'focal length'],
    body: [
      { t: 'p', c: 'Focal length, written in millimetres (24mm, 35mm, 50mm, 85mm), describes how much a lens magnifies the scene. Short focal lengths are wide: they show more of the room and exaggerate distance. Long focal lengths are telephoto: they show less, compress the background toward the subject, and give shallower [[depth-of-field]].' },
      { t: 'p', c: 'Naming a lens is one of the most reliable ways to make AI images read as photographed. In the bonus session, Steffin added the lens right after his film-stock line, and the mentors suggested prompting a specific lens ("a 30mm lens") alongside heavy [[film-grain]]. Reginald Cineus\'s scene cinematography files ask the LLM to estimate the focal length of each reference still.' },
      { t: 'note', c: 'Don\'t know which lens? Look up what a film you love was shot on (ShotDeck lists camera and lens data for many stills) and borrow it.' }
    ],
    related: ['depth-of-field', 'anamorphic-lens', 'film-stock', 'look-prompt']
  },
  {
    slug: 'rack-focus',
    title: 'Rack Focus',
    abbr: null,
    category: 'traditional',
    group: 'Camera & Lens',
    short: 'Shifting focus from one subject to another within a single shot, moving the audience\'s attention.',
    aliases: ['focus pull', 'pull focus', 'double rack focus', 'focus shift'],
    body: [
      { t: 'p', c: 'A rack focus changes the focus point during a shot: the foreground character goes soft while someone in the background sharpens, or the muzzle of a gun blurs to reveal the face behind it. Because the eye goes to whatever is sharp, a rack focus redirects attention without a [[cut]].' },
      { t: 'p', c: 'In AI work you can plan one as two stills: the same frame with focus on A, then focus on B, used as a [[first-frame-last-frame]] pair. Darion\'s Week 1 insert prompt asked for a "rack focus from the muzzle of the gun to the face."' },
      { t: 'h', c: 'The double rack' },
      { t: 'p', c: 'A double rack shifts focus there and back. It breaks convention, so save it for tension, like two gunmen side by side at a bar, each waiting for the other to move. In the bonus session the mentors warned that racking to a minor character (the mailman) makes him seem important, and promises a payoff that never comes.' }
    ],
    related: ['depth-of-field', 'focal-length', 'insert', 'first-frame-last-frame']
  },
  {
    slug: 'anamorphic-lens',
    title: 'Anamorphic Lens',
    abbr: null,
    category: 'traditional',
    group: 'Camera & Lens',
    short: 'A lens that squeezes a widescreen image onto the sensor, giving cinema\'s wide frame, oval bokeh and horizontal flares.',
    aliases: ['anamorphic', 'scope', 'cinemascope', '2.39:1'],
    body: [
      { t: 'p', c: 'An anamorphic lens optically squeezes a wide image horizontally so it fits on a standard sensor, then the image is stretched back out in post. The result is the classic "scope" widescreen [[aspect-ratio]] (about 2.39:1) plus a distinctive look: oval out-of-focus highlights, horizontal lens flares, and a slight bend at the edges.' },
      { t: 'p', c: 'Because audiences associate it with feature films, "shot on 35mm anamorphic" is a strong cinematic cue in a prompt. Reginald Cineus\'s Scene 3 look file opens with exactly that: "Shot on 35mm anamorphic with Kodak Vision3 500T grain." Darion prefers a 2.40:1 frame; AI video tools often cap at 21:9, the closest widescreen option.' }
    ],
    related: ['aspect-ratio', 'focal-length', 'film-stock', 'look-prompt']
  },
  {
    slug: 'film-grain',
    title: 'Film Grain',
    abbr: null,
    category: 'traditional',
    group: 'Camera & Lens',
    short: 'The fine, random texture of real film emulsion, which makes an image feel photographed rather than rendered.',
    aliases: ['grain', 'film noise', 'heavy film grain', 'texture', 'analog look'],
    body: [
      { t: 'p', c: 'Film grain is the speckled texture produced by the light-sensitive crystals in photographic film. Digital cameras are cleaner by default, so grain has become a signature of the analog, cinematic look, and colorists often add it back in the grade.' },
      { t: 'p', c: 'AI images tend to be too smooth and clean. Adding "film grain, film noise, chromatic aberration" (Week 1) or "heavy film grain" (bonus session) pulls them away from the polished AI look. The amount matters: a 1950s film has heavy grain, a modern digital feature has almost none. Pick the grain that matches the era and [[film-stock]] you are imitating.' }
    ],
    related: ['film-stock', 'chromatic-aberration', 'look-prompt', 'saturation']
  },
  {
    slug: 'film-stock',
    title: 'Film Stock',
    abbr: null,
    category: 'traditional',
    group: 'Camera & Lens',
    short: 'The specific type of photographic film a movie was shot on, each with its own color, contrast and grain.',
    aliases: ['stock', 'emulsion', 'kodak', 'ektachrome', 'vision3'],
    body: [
      { t: 'p', c: 'Film stock is the physical film loaded in a camera: Kodak Vision3 500T, Ektachrome, Fuji Eterna and so on. Each stock renders color, contrast, skin tones and grain differently, so cinematographers choose stock the way painters choose paint.' },
      { t: 'p', c: 'Naming a real stock is one of the fastest ways to get a filmic image from a model. Steffin Flickinger opens his prompts with "a cinematic still from a contemporary British film shot on Kodak Ektachrome E100 35mm reversal film," then adds the lens. Reginald Cineus asks the LLM to identify the film stock in each reference still and writes it into the scene\'s [[look-prompt]].' }
    ],
    related: ['film-grain', 'focal-length', 'anamorphic-lens', 'look-prompt']
  },
  {
    slug: 'chromatic-aberration',
    title: 'Chromatic Aberration',
    abbr: null,
    category: 'traditional',
    group: 'Camera & Lens',
    short: 'Color fringing along high-contrast edges caused by real lenses, which makes AI images feel photographed.',
    aliases: ['color fringing', 'ca', 'lens fringing'],
    body: [
      { t: 'p', c: 'Chromatic aberration is a lens flaw: different colors of light focus at slightly different points, so high-contrast edges pick up thin red, blue or green fringes. Lens designers work hard to remove it, but a touch of it is part of what makes a photo look like it came through glass.' },
      { t: 'p', c: 'In Week 1, Darion added "film grain, film noise and chromatic aberration" to every shot in his demo prompt. Small, believable imperfections are what separate a cinematic still from the too-perfect AI default.' }
    ],
    related: ['film-grain', 'film-stock', 'focal-length', 'look-prompt']
  },
  {
    slug: 'azimuth',
    title: '360 Azimuth',
    abbr: null,
    category: 'ai',
    group: 'Camera & Lens',
    short: 'The full circle of horizontal camera angles around a subject; naming it gets AI to rotate the camera.',
    aliases: ['azimuth', '360 azimuth', 'angles around', 'turnaround'],
    body: [
      { t: 'p', c: 'Azimuth is the horizontal angle around a subject, from 0° to 360°. Prompting "give me this shot from seven different angles, each on a different angle of the 360 azimuth" makes an image model rotate the camera around the same subject or room instead of handing back near-duplicates. Darion found the word by asking the model how to prompt it.' },
      { t: 'p', c: 'It is the cohort\'s go-to for building location references: get one good frame of a room in the locked look, then ask for "eight different angles along the 360 azimuth" until the space makes geographic sense. That gives you consistent [[coverage]] material before you generate story shots.' },
      { t: 'note', c: 'Azimuth is specifically a rotation around the subject. For general [[coverage]] (high, low, close, far), ask for varied angles instead. The video equivalent of moving around the subject is an [[orbit-shot]].' }
    ],
    related: ['coverage', 'orbit-shot', 'asset-sheet', 'style-reference']
  },
  {
    slug: 'static-shot',
    title: 'Static Shot',
    abbr: null,
    category: 'traditional',
    group: 'Camera Movement',
    short: 'A shot where the camera does not move at all, usually mounted on a tripod.',
    aliases: ['locked-off shot', 'locked off', 'static', 'tripod shot'],
    body: [
      { t: 'p', c: 'In a static shot the camera stays put: no pan, no tilt, no dolly. The stillness puts all the attention on what happens inside the frame, and it can feel observational, formal or tense depending on how long you hold it. Most of the True Romance shot-list example is static, eye-level coverage.' },
      { t: 'p', c: 'Reginald Cineus\'s Scene 3 look file favors "locked-off wides." In AI generation, saying "static camera" or "locked-off" is also a good way to stop a model from adding drifting camera moves you didn\'t ask for.' }
    ],
    related: ['handheld', 'pan', 'push-in', 'wide-shot']
  },
  {
    slug: 'handheld',
    title: 'Handheld',
    abbr: null,
    category: 'traditional',
    group: 'Camera Movement',
    short: 'Footage shot with the camera held by an operator, giving a natural shake and a sense of immediacy.',
    aliases: ['handheld camera', 'camera shake', 'shaky cam', 'handheld drift'],
    body: [
      { t: 'p', c: 'Handheld means the camera is on the operator\'s body rather than a tripod or rig, so it breathes and drifts with them. It feels raw, documentary and present, which is why it is common in thrillers, war films and intimate drama.' },
      { t: 'p', c: 'It is also one of the simplest ways to make an AI clip feel shot rather than rendered. Steffin Flickinger\'s basic Seedance prompt is just "Handheld camera shake. He stares at the ocean. No music or score." Name the intensity: "slight handheld drift" reads very differently from frantic shaky cam.' }
    ],
    related: ['static-shot', 'tracking-shot', 'whip-pan', 'one-beat-per-shot']
  },
  {
    slug: 'pan',
    title: 'Pan',
    abbr: null,
    category: 'traditional',
    group: 'Camera Movement',
    short: 'A horizontal camera move where the camera swivels left or right from a fixed position.',
    aliases: ['panning', 'pan left', 'pan right', 'panning shot'],
    body: [
      { t: 'p', c: 'A pan rotates the camera horizontally on its axis, left or right, while it stays in one place, like turning your head. It follows a moving subject, reveals more of a space, or connects two characters in one continuous shot.' },
      { t: 'p', c: 'Don\'t confuse it with a [[tilt]] (vertical) or a [[tracking-shot]] (the whole camera travels). The Session 2 glossary notes that some AI tools say "pan" when they mean a vertical move, so check what the model actually did. A very fast pan that blurs between subjects is a [[whip-pan]].' }
    ],
    related: ['tilt', 'whip-pan', 'tracking-shot', 'static-shot']
  },
  {
    slug: 'tilt',
    title: 'Tilt',
    abbr: null,
    category: 'traditional',
    group: 'Camera Movement',
    short: 'A vertical camera move where the camera pivots up or down from a fixed position.',
    aliases: ['tilt up', 'tilt down', 'tilting'],
    body: [
      { t: 'p', c: 'A tilt pivots the camera up or down while it stays in place, like nodding your head. Tilting up a tall building or a towering villain builds scale; tilting down from a face to a hand reveals a detail.' },
      { t: 'p', c: 'It is the vertical twin of the [[pan]]. If the camera itself rises or lowers through space instead of pivoting, that is a crane or jib move ([[crane-shot]]).' }
    ],
    related: ['pan', 'crane-shot', 'low-angle-shot', 'static-shot']
  },
  {
    slug: 'whip-pan',
    title: 'Whip Pan',
    abbr: null,
    category: 'traditional',
    group: 'Camera Movement',
    short: 'An extremely fast pan that blurs the image, often used as an energetic transition.',
    aliases: ['swish pan', 'flash pan', 'whip'],
    body: [
      { t: 'p', c: 'A whip pan swings the camera so fast that the frame smears into motion blur. It can snap attention from one character to another, or serve as a transition: whip out of one scene and whip into the next, hiding the [[cut]] inside the blur.' },
      { t: 'p', c: 'It was on the list of moves to name in Week 3\'s "speak the language" review. Because the blur hides so much, it is also a handy way to join two AI clips whose motion doesn\'t quite match.' }
    ],
    related: ['pan', 'cut', 'match-cut', 'scene-stitching']
  },
  {
    slug: 'tracking-shot',
    title: 'Tracking Shot',
    abbr: null,
    category: 'traditional',
    group: 'Camera Movement',
    short: 'A shot where the camera physically travels through the scene, usually alongside or behind a moving subject.',
    aliases: ['tracking', 'dolly shot', 'follow shot', 'travelling shot', 'steadicam'],
    body: [
      { t: 'p', c: 'In a tracking shot the whole camera moves through space, on a dolly, a gimbal, a Steadicam or a vehicle, usually keeping pace with a subject. Following behind a character is a follow shot; moving sideways with them is [[lateral-tracking]].' },
      { t: 'p', c: 'Tracking gives energy and continuity, and lets the audience move through a world. In AI video, keep each tracking clip to one clear beat (see [[one-beat-per-shot]]); long, complicated moves are where models invent windows that weren\'t there or change a character\'s clothes, which is why a location [[asset-sheet]] helps.' }
    ],
    related: ['lateral-tracking', 'push-in', 'orbit-shot', 'handheld']
  },
  {
    slug: 'lateral-tracking',
    title: 'Lateral Tracking',
    abbr: null,
    category: 'traditional',
    group: 'Camera Movement',
    short: 'A tracking shot where the camera moves sideways, parallel to a subject moving across the frame.',
    aliases: ['lateral tracking shot', 'side tracking', 'truck', 'trucking shot', 'crab'],
    body: [
      { t: 'p', c: 'Lateral tracking moves the camera sideways alongside a subject, so they stay in frame as the background streams past. It is classic for running, walking-and-talking, and chase scenes; the foreground and background moving at different speeds gives a strong sense of depth and speed.' },
      { t: 'p', c: 'In the Week 3 shot-list review, Abdou\'s running shot through the trees was a lateral track. Naming it precisely ("lateral tracking shot, camera moving right with her") gets you that move instead of a generic follow.' }
    ],
    related: ['tracking-shot', 'pan', 'handheld', 'shot-list']
  },
  {
    slug: 'push-in',
    title: 'Push-In',
    abbr: null,
    category: 'traditional',
    group: 'Camera Movement',
    short: 'A slow camera move toward the subject that tightens the frame and raises emotional intensity.',
    aliases: ['push in', 'dolly in', 'slow push', 'creep in'],
    body: [
      { t: 'p', c: 'A push-in moves the camera steadily closer to the subject, usually slowly, so a [[medium-shot]] becomes a [[close-up]] over the course of the shot. The audience feels drawn in, as if the moment is becoming more important or more claustrophobic. The reverse, moving away, is a pull-out.' },
      { t: 'p', c: 'Reginald Cineus\'s Scene 3 look file favors "slow push-ins." Unlike a zoom, which only magnifies, a real push-in shifts perspective, so prompt for "the camera slowly pushes in" rather than "zoom in."' }
    ],
    related: ['tracking-shot', 'close-up', 'static-shot', 'focal-length']
  },
  {
    slug: 'orbit-shot',
    title: 'Orbit Shot',
    abbr: null,
    category: 'traditional',
    group: 'Camera Movement',
    short: 'A camera move that circles around the subject in one continuous shot.',
    aliases: ['360 orbit', 'arc shot', 'arc', 'circling shot'],
    body: [
      { t: 'p', c: 'An orbit (or arc) shot moves the camera in a circle, or part of one, around the subject, revealing them and their surroundings from changing angles. A full 360 orbit is a showy, heightened move; a partial arc adds energy to a reveal or a kiss.' },
      { t: 'p', c: 'It is the moving equivalent of the [[azimuth]] stills trick. Seedance handles orbits well, but watch for seams: Erica\'s Week 3 zombie sequence had a visible seam after its 360 orbit that needed hiding in the edit. In Session 2, Darion recommended steering an arc, jib or crane move across a [[scene-stitching]] join.' }
    ],
    related: ['azimuth', 'tracking-shot', 'crane-shot', 'scene-stitching']
  },
  {
    slug: 'crane-shot',
    title: 'Crane Shot',
    abbr: null,
    category: 'traditional',
    group: 'Camera Movement',
    short: 'A shot where the camera rises, lowers or sweeps through the air on a crane or jib arm.',
    aliases: ['jib', 'jib shot', 'crane', 'boom up', 'boom down', 'pedestal'],
    body: [
      { t: 'p', c: 'A crane shot mounts the camera on a long arm (a crane or smaller jib) so it can lift high above the scene, drop down into it, or sweep across. Rising up and away at the end of a scene is a classic way to say "the story pulls back."' },
      { t: 'p', c: 'The Session 2 glossary flags a naming trap: a jib moves the camera up or down, but some AI tools call that a "pan." If a model gives you the wrong move, describe the motion literally: "the camera rises vertically from ground level to above the rooftops."' }
    ],
    related: ['tilt', 'orbit-shot', 'overhead-shot', 'extreme-wide-shot']
  },
  {
    slug: 'one-beat-per-shot',
    title: 'One Beat Per Shot',
    abbr: null,
    category: 'ai',
    group: 'AI Workflow',
    short: 'Keeping each AI video generation to a single camera move and a single action, the way films cut every few seconds.',
    aliases: ['one action per shot', 'single beat', 'break it down', 'shot breakdown'],
    body: [
      { t: 'p', c: 'Movies change angle every two or three seconds and add new information with each [[cut]]. Steffin Flickinger\'s rule for AI video is to work the same way: one camera, one action, no score per generation, then cut between them. Cramming a whole scene into one prompt clutters the frame, confuses the model, and produces the floaty, overlong shots that read as AI.' },
      { t: 'p', c: 'For long action sequences, the alternative is to write the beats out explicitly with timecodes (see [[timecoded-prompt]]) and attach every reference the model needs. Either way, the model is never left to guess what happens next.' },
      { t: 'note', c: 'If a shot does two things, split it into two shots. It is cheaper to generate and easier to fix.' }
    ],
    related: ['coverage', 'timecoded-prompt', 'cut', 'shot-list']
  },
  {
    slug: 'low-key-lighting',
    title: 'Low-Key Lighting',
    abbr: null,
    category: 'traditional',
    group: 'Lighting',
    short: 'Lighting dominated by shadow, with few light sources and strong contrast between light and dark.',
    aliases: ['low key', 'low-key', 'dramatic lighting', 'moody lighting', 'noir lighting'],
    body: [
      { t: 'p', c: 'Low-key lighting keeps most of the frame in shadow and lights only what matters, usually from one hard source. It is the language of noir, horror, thrillers and serious drama. Its opposite, high-key lighting, is bright and even, the look of sitcoms and commercials.' },
      { t: 'p', c: 'AI defaults to high-key [[flatness]]. Gheri\'s note to every Week 3 film was to push dramatic lighting and heavy shadow on purpose: darker corners, light focused on the subject, real shadows. You can read a genre from the lighting alone. Reginald Cineus\'s Scene 3 look begins with "low-key lighting, warm practicals against cool blue shadows."' }
    ],
    related: ['chiaroscuro', 'flatness', 'contrast', 'practical-light']
  },
  {
    slug: 'chiaroscuro',
    title: 'Chiaroscuro',
    abbr: null,
    category: 'traditional',
    group: 'Lighting',
    short: 'Strong contrast between one hard light source and deep darkness, borrowed from Baroque painting.',
    aliases: ['baroque lighting', 'caravaggio lighting', 'single source lighting', 'rembrandt lighting'],
    body: [
      { t: 'p', c: 'Chiaroscuro (Italian for "light-dark") is the dramatic style of Baroque painters like Caravaggio: a single strong light source against a dark background, carving the subject out of shadow so every muscle and fold of skin shows. Cinematographers borrow it constantly.' },
      { t: 'p', c: 'In the bonus session, the mentors suggested painting words as prompts: "Baroque style," the Baroque period of painting, Caravaggio. One demonstrated it live on camera: with one light on, the arm fell into deep shadow; with two more lamps on, the drama vanished. Multiple lights from every angle is studio lighting, and it makes no sense in a dark room at night.' }
    ],
    related: ['low-key-lighting', 'motivated-lighting', 'contrast', 'three-point-lighting']
  },
  {
    slug: 'motivated-lighting',
    title: 'Motivated Lighting',
    abbr: null,
    category: 'traditional',
    group: 'Lighting',
    short: 'Lighting that appears to come from a real source in the scene, such as a window, lamp or streetlight.',
    aliases: ['motivated light', 'source lighting', 'naturalistic lighting', 'real light sources'],
    body: [
      { t: 'p', c: 'Motivated lighting is light that makes sense in the world of the scene: if a character is lit from the left, there is a window or lamp on the left to justify it. Even when a cinematographer adds film lights, they place them to mimic the sources the audience can see.' },
      { t: 'p', c: 'Unmotivated light is a common AI tell. In the bonus-session critique of Kush\'s diner scene, every character was "lit like they\'re in a studio" (light from every side) even though the only sources were overhead fluorescents at dusk. Prompt the source explicitly: "lit only by the fluorescent tubes above, dusk outside."' },
      { t: 'note', c: 'Stylized light is allowed, but commit to it. The Pulp Fiction adrenaline scene takes artistic liberties with its spotlight look, and it works because it is clearly pushed on purpose.' }
    ],
    related: ['practical-light', 'chiaroscuro', 'flatness', 'three-point-lighting']
  },
  {
    slug: 'practical-light',
    title: 'Practical Light',
    abbr: null,
    category: 'traditional',
    group: 'Lighting',
    short: 'A light source visible in the shot that actually works, such as a lamp, candle, neon sign or TV.',
    aliases: ['practical', 'practicals', 'practical lamp'],
    body: [
      { t: 'p', c: 'A practical is a working light that appears in the frame: a table lamp, a candle, a neon sign, a computer screen. Practicals add atmosphere and depth, and they give the scene\'s lighting a believable [[motivated-lighting|motivation]].' },
      { t: 'p', c: 'Warm practicals against cool shadows is a classic cinematic combination, and it is exactly how Reginald Cineus describes his Scene 3 look. Placement matters, though: in the bonus-session critique, a lamp hanging right over Nephew\'s head added to the clutter instead of shaping the shot.' }
    ],
    related: ['motivated-lighting', 'low-key-lighting', 'color-temperature', 'negative-space']
  },
  {
    slug: 'contrast',
    title: 'Contrast',
    abbr: null,
    category: 'traditional',
    group: 'Lighting',
    short: 'The difference between the brightest and darkest parts of an image; cinema uses a wide range on purpose.',
    aliases: ['high contrast', 'low contrast', 'dynamic range', 'darks and lights'],
    body: [
      { t: 'p', c: 'Contrast is the spread between the lights and the darks in a frame. High contrast, with deep blacks and bright highlights, feels dramatic and graphic; low contrast feels soft, flat or hazy.' },
      { t: 'p', c: 'Cinematography for movies is expected to use a wide range of contrast, using both its darks and its lights, because films are meant to feel dramatic. Commercials often stay low-contrast so nothing feels heavy. AI defaults to the commercial end, so ask for "heavy contrasting cinematic lighting" and let parts of the frame fall into shadow.' }
    ],
    related: ['low-key-lighting', 'chiaroscuro', 'flatness', 'color-grading']
  },
  {
    slug: 'color-temperature',
    title: 'Color Temperature',
    abbr: 'K',
    category: 'traditional',
    group: 'Lighting',
    short: 'How warm (orange) or cool (blue) a light is, measured in kelvin.',
    aliases: ['kelvin', 'warm light', 'cool light', 'white balance', 'warm', 'cool'],
    body: [
      { t: 'p', c: 'Color temperature describes the color of light in kelvin (K). Candlelight and tungsten bulbs are warm, around 2,000 to 3,200K; daylight is about 5,600K; shade and overcast sky run cool and blue. Mixing warm and cool sources in one frame is a classic way to add depth and mood.' },
      { t: 'p', c: 'Temperature also carries emotion. The Week 3 critique advised that serious stories lean cool, and Abdou\'s kitchen went "cooler and darker for a serious subject." In one of Steffin\'s client jobs, a stand-up scene came out cold and the client asked for "more warmly lit"; a few prompt rounds later it landed. Reginald Cineus asks the LLM to estimate color temperature in every reference still.' }
    ],
    related: ['practical-light', 'color-grading', 'color-palette', 'low-key-lighting']
  },
  {
    slug: 'flatness',
    title: 'Flatness',
    abbr: null,
    category: 'ai',
    group: 'Lighting',
    short: 'Even, shadowless, commercial-style lighting and color: the default look AI produces unless you direct it.',
    aliases: ['flat lighting', 'ai look', 'stock photo look', 'commercial look', 'generic ai look', 'default look'],
    body: [
      { t: 'p', c: 'Flatness is the cohort\'s name for the look every AI model gives you when you don\'t direct it: evenly lit from every side, no heavy shadows, a clean beige-and-white palette, high [[saturation]], everything in focus. It looks like a stock photo or a commercial, not a film. Gheri gave this note to every film in the Week 3 critique.' },
      { t: 'p', c: 'The cure is to direct the look on purpose. Lock a real film still as your [[style-reference]] (or a Midjourney [[personalization-profile]]), turn it into a [[look-prompt]], light with [[low-key-lighting|shadow]] and [[motivated-lighting|real sources]], narrow the [[color-palette]], and declutter for [[negative-space]].' },
      { t: 'note', c: 'After hours of staring at AI images you stop seeing flatness. Put your frame side by side with a real film frame from ShotDeck and compare the light, the colors, and what is in the room.' }
    ],
    related: ['style-reference', 'low-key-lighting', 'color-palette', 'personalization-profile']
  },
  {
    slug: 'color-palette',
    title: 'Color Palette',
    abbr: null,
    category: 'traditional',
    group: 'Color & Grade',
    short: 'The limited set of colors a film or scene is built from; cinema stays in a narrow band, commercials use everything.',
    aliases: ['palette', 'color scheme', 'color bar', 'swatches'],
    body: [
      { t: 'p', c: 'A color palette is the deliberate selection of hues a scene uses. Films tend to live in a narrow band: blues and greens with a single pop of warm yellow, or golds, browns and creams with one tiny spot of red. A standard commercial spreads across the whole color wheel.' },
      { t: 'p', c: 'In the bonus session, the Pulp Fiction adrenaline scene was the example: almost entirely yellows and browns, with red reduced to one small game on a shelf. A quick test is to squint at your frame: if all three primaries are fighting, it is too much. Narrowing the palette also tames clutter and gives you [[negative-space]].' },
      { t: 'h', c: 'Make a color bar' },
      { t: 'list', items: ['Drop a film still (ShotDeck, FilmGrab, or a Google image search) into ChatGPT and ask for a color bar of its palette', 'Do the same with your own frame', 'If yours spreads across the wheel, narrow it in the prompt or in the [[color-grading|grade]]'] }
    ],
    related: ['saturation', 'color-grading', 'style-reference', 'flatness']
  },
  {
    slug: 'saturation',
    title: 'Saturation',
    abbr: null,
    category: 'traditional',
    group: 'Color & Grade',
    short: 'How intense or vivid the colors in an image are, from fully vivid to black and white.',
    aliases: ['saturated', 'desaturated', 'vibrancy', 'muted colors'],
    body: [
      { t: 'p', c: 'Saturation is color intensity. Fully saturated colors are loud and vivid; desaturated colors are muted; zero saturation is black and white. Stock images and commercials tend to be oversaturated, which is part of why AI\'s default look reads as cheap.' },
      { t: 'p', c: 'Use the right word. In the bonus session, a student described asking ChatGPT to "dull it down"; the mentors suggested "less saturated" instead, since that is the term the model understands, and warned that "no saturation" means black and white. Pair it with [[film-grain]] and an analog look for a filmic finish.' }
    ],
    related: ['color-palette', 'color-grading', 'flatness', 'film-grain']
  },
  {
    slug: 'color-grading',
    title: 'Color Grading',
    abbr: null,
    category: 'traditional',
    group: 'Color & Grade',
    short: 'Adjusting the color, contrast and tone of footage in post to create the film\'s look and make shots match.',
    aliases: ['grade', 'grading', 'color correction', 'colour grading', 'the grade'],
    body: [
      { t: 'p', c: 'Color grading is the post-production step where a colorist shapes the final look: balancing shots so they match, then pushing a style (teal shadows, golden skin, crushed blacks). Color correction fixes problems; grading makes creative choices. DaVinci Resolve is the industry standard and has a free version.' },
      { t: 'p', c: 'For AI films, grading does two jobs. It unifies clips that came out of different generations or models (Reginald Cineus finds the shots that don\'t match and grades them to match in Resolve), and it pushes past [[flatness]]. "Cinema is graded," as the Week 1 summary put it, so plan to grade even when your frames already look good.' }
    ],
    related: ['color-palette', 'contrast', 'saturation', 'continuity']
  },
  {
    slug: 'assembly-edit',
    title: 'Assembly Edit',
    abbr: null,
    category: 'traditional',
    group: 'Editing',
    short: 'The first rough cut: every scene in script order with minimal creative editing, built to see what you have.',
    aliases: ['assembly', 'assembly cut', 'rough assembly', 'first cut', 'rough cut'],
    body: [
      { t: 'p', c: 'An assembly edit strings every usable shot together in script order so the team can see the whole film for the first time. On a traditional production the assistant editor organizes footage and builds the assembly; the editor then shapes it into a rough cut and, eventually, the final cut.' },
      { t: 'p', c: 'AI can already play assistant editor. In Week 1, ChatGPT stitched Darion\'s generated clips into an assembly, and in Session 2 Erica\'s film was cut fully automatically. The creative cut is still yours: tighten the [[pacing]], drop cool shots that don\'t serve the story, and rewatch it cold after every change.' }
    ],
    related: ['cut', 'pacing', 'continuity', 'b-roll']
  },
  {
    slug: 'match-cut',
    title: 'Match Cut',
    abbr: null,
    category: 'traditional',
    group: 'Editing',
    short: 'A cut between two shots linked by a matching shape, movement, action or composition.',
    aliases: ['match on action', 'graphic match', 'match cutting'],
    body: [
      { t: 'p', c: 'A match cut joins two different shots through something they share: the same shape (a bone becoming a spaceship), the same movement continuing across the [[cut]], or the same composition with a different subject or place. It makes a cut feel seamless or meaningful.' },
      { t: 'p', c: 'In AI filmmaking, match cuts are a powerful way to replicate a shot with a new character or setting. After Session 3, Gheri promised the cohort a Higgsfield match-cut breakdown in WhatsApp showing exactly that. [[scene-stitching]] is a related idea: the last frame of one clip becomes the first frame of the next.' }
    ],
    related: ['cut', 'scene-stitching', 'whip-pan', 'continuity']
  },
  {
    slug: 'continuity',
    title: 'Continuity',
    abbr: null,
    category: 'traditional',
    group: 'Editing',
    short: 'Keeping faces, props, wardrobe, screen UI, lighting and space consistent from shot to shot.',
    aliases: ['continuity error', 'continuity errors', 'script supervisor', 'consistency'],
    body: [
      { t: 'p', c: 'Continuity is the discipline of making separate shots feel like one unbroken reality: the glass stays half full, the scar stays on the left cheek, the phone buttons stay where they were. On set, a script supervisor tracks it; in the edit, broken continuity pulls the audience out of the story.' },
      { t: 'p', c: 'AI multiplies continuity problems, because every generation is independent. The Week 3 critique caught a picture frame that didn\'t line up between shots and a phone UI that moved; the bonus session covered a superhero logo that changed when the camera moved. Faces drifting between generations is its own term, [[identity-drift]].' },
      { t: 'h', c: 'How the cohort handles it' },
      { t: 'list', items: ['Reuse the same wide shot of a location every time you return to it', 'Make an [[asset-sheet]] for anything that drifts, then rerun the generation', 'Keep a [[character-bible]] in sync with approved references', 'Compare stills side by side before they go to video'] }
    ],
    related: ['identity-drift', 'asset-sheet', '180-degree-rule', 'character-bible']
  },
  {
    slug: 'pacing',
    title: 'Pacing',
    abbr: null,
    category: 'traditional',
    group: 'Editing',
    short: 'The rhythm and speed at which a film moves, controlled by shot length, cuts and dialogue timing.',
    aliases: ['pace', 'rhythm', 'tempo', 'dead air'],
    body: [
      { t: 'p', c: 'Pacing is how fast or slow a story feels. It is shaped by how long shots are held, how often you cut, and how tightly dialogue overlaps. Good pacing matches the emotion of the scene; bad pacing makes viewers check their phones.' },
      { t: 'p', c: 'Several cohort films ran long in places: a wrench turn held too long, repeated beats, pauses that dragged. In the bonus session, Steffin and the mentors added a dialogue rule: avoid dead air unless it is intentional. Cut away mid-sentence, stay on the listener, and write a new line into a gap if the edit leaves one (see [[off-screen-dialogue]]).' },
      { t: 'note', c: 'Cutting to each speaker, letting them talk, then pausing before the next line gets tedious fast. Overlap the conversation.' }
    ],
    related: ['cut', 'off-screen-dialogue', 'assembly-edit', 'hook']
  },
  {
    slug: 'timecode',
    title: 'Timecode',
    abbr: 'TC',
    category: 'traditional',
    group: 'Editing',
    short: 'The exact time position in a clip, in hours, minutes, seconds and frames, used to mark and sync moments.',
    aliases: ['time code', 'tc', 'timestamps', 'smpte'],
    body: [
      { t: 'p', c: 'Timecode labels every frame of footage with its exact position (for example 01:02:03:12, meaning one hour, two minutes, three seconds and twelve frames). Editors, sound designers and VFX artists use it to find, sync and hand off precise moments.' },
      { t: 'p', c: 'In AI work it powers the [[timecoded-prompt]]. In Week 3, Renee scrubbed her live-action footage frame by frame in DaVinci Resolve, wrote down when each motion started and stopped ("02:29, hand on head; 03:02, points"), and had Claude build a prompt around those times so the VFX hit on the beat.' }
    ],
    related: ['timecoded-prompt', 'base-plate', 'sound-design', 'edit-video']
  },
  {
    slug: 'sound-design',
    title: 'Sound Design',
    abbr: null,
    category: 'traditional',
    group: 'Sound',
    short: 'Creating and layering the sound effects, ambience and textures that make a film\'s world feel real.',
    aliases: ['sound effects', 'sfx', 'ambience', 'soundscape', 'audio'],
    body: [
      { t: 'p', c: 'Sound design is everything you hear besides the score: footsteps, doors, wind, room tone, a distant siren. Audiences forgive weak images far more than weak sound, and good sound can tell a story with no picture at all.' },
      { t: 'p', c: 'It is also an AI filmmaker\'s best repair tool. In Week 3, a floor that caved in on screen read as a glitch; a loud creak on the footstep would have told the whole story. Prompt "no music" (or "no music or score") on every clip, because baked-in music makes clips impossible to cut, then build the soundtrack in post with ElevenLabs, Suno or Artlist and match it to the beat in DaVinci Resolve. Pick the sound for the surface and the room.' }
    ],
    related: ['foley', 'insert', 're-voicing', 'off-screen-dialogue']
  },
  {
    slug: 'foley',
    title: 'Foley',
    abbr: null,
    category: 'traditional',
    group: 'Sound',
    short: 'Everyday sound effects like footsteps and cloth rustle, performed and recorded in sync with the picture.',
    aliases: ['foley artist', 'foley sound', 'footsteps'],
    body: [
      { t: 'p', c: 'Foley is the craft of re-creating everyday sounds in a studio while watching the film: footsteps on gravel, a coat rustling, keys jangling, a punch landing. It is named after Jack Foley, who pioneered it in early Hollywood. Foley makes a scene feel physical and close.' },
      { t: 'p', c: 'AI clips usually arrive with muddy or wrong incidental sound, so strip the model\'s footsteps and add your own. You can record real Foley with a phone and a few props, or generate it with tools like ElevenLabs and Suno, then line it up frame by frame in your editor.' }
    ],
    related: ['sound-design', 'timecode', 'lip-sync', 're-voicing']
  },
  {
    slug: 'off-screen-dialogue',
    title: 'Off-Screen Dialogue',
    abbr: 'O.S.',
    category: 'traditional',
    group: 'Sound',
    short: 'Lines spoken by a character the audience can\'t see in the shot, often while the camera stays on the listener.',
    aliases: ['off screen', 'os', 'o.s.', 'staying on the listener', 'reaction shot', 'voice off'],
    body: [
      { t: 'p', c: 'Off-screen dialogue is speech from a character who is in the scene but not in the frame. Screenplays mark it "(O.S.)." Holding the camera on the listener while someone else talks shows their reaction, which is often more interesting than the speaker\'s face.' },
      { t: 'p', c: 'Steffin Flickinger uses it constantly. In Easy Money the camera holds on the sheriff while the hitman answers off-screen, and stays on Matt while Doug talks to Nana in the next room. For AI films it has a bonus: every off-screen line is one less lip-sync generation to pay for and fix. You can also write new off-screen lines in the edit to fill an awkward gap.' }
    ],
    related: ['shot-reverse-shot', 'j-and-l-cuts', 'lip-sync', 'pacing']
  },
  {
    slug: 'storyboard',
    title: 'Storyboard',
    abbr: null,
    category: 'traditional',
    group: 'Story & Script',
    short: 'A sequence of drawings or images, one per shot, that previews how a scene will be filmed.',
    aliases: ['storyboards', 'boards', 'shot deck', 'storyboarding'],
    body: [
      { t: 'p', c: 'A storyboard lays out a film shot by shot as images, like a comic, so the director and crew can agree on framing, angles and flow before anything is shot. It turns the [[shot-list]] into pictures.' },
      { t: 'p', c: 'For AI filmmakers the storyboard step should stay, but the sketches can go: a photoreal frame renders as fast as a drawing. Generate your stills, get a mentor thumbs-up in WhatsApp, then go to video. Reginald Cineus and Erica arranged every shot on a Figma board to catch [[identity-drift]] before generating. Renee\'s tip runs the other way: for an idea nobody has filmed, sketch it first, because a drawing gives the model a direction words can\'t.' }
    ],
    related: ['shot-list', 'animatic', 'keyframe', 'blocking']
  },
  {
    slug: 'animatic',
    title: 'Animatic',
    abbr: null,
    category: 'traditional',
    group: 'Story & Script',
    short: 'Storyboard frames or rough animation cut together to time, previewing how a scene flows.',
    aliases: ['previs animatic', 'animated storyboard', 'story reel'],
    body: [
      { t: 'p', c: 'An animatic is a timed version of the [[storyboard]]: still frames or crude animation edited together with rough sound or captions, so you can feel the pacing of a scene before committing to production. Animation studios rely on them heavily.' },
      { t: 'p', c: 'In Week 1, Darion had Claude animate rough characters inside a Blender model of the set, with the script\'s action captioned underneath like a studio animatic. Interestingly, photoreal keyframes carried the action into video better than the animatic did; the animatic\'s value was in working out [[blocking]] and timing.' }
    ],
    related: ['storyboard', 'blocking', 'gray-box', 'keyframe']
  },
  {
    slug: 'shooting-script',
    title: 'Shooting Script',
    abbr: null,
    category: 'traditional',
    group: 'Story & Script',
    short: 'The production draft of a screenplay, with scene numbers and camera directions added for the shoot.',
    aliases: ['production draft', 'screenplay', 'script', 'spec script'],
    body: [
      { t: 'p', c: 'A writer\'s screenplay deliberately leaves out camera directions; the shooting script is the later production draft where scenes are numbered and shot information is added for the crew. It bridges the story and the [[shot-list]].' },
      { t: 'p', c: 'Week 1\'s guidance: keep a real script and add camera cues later. Dictate the idea, let an LLM outline it and format the screenplay, then break it into shots. Reginald Cineus starts every project the same way, with the script in an [[llm-project]] that turns it into a shot list.' }
    ],
    related: ['shot-list', 'llm-project', 'storyboard', 'hook']
  },
  {
    slug: 'hook',
    title: 'Hook',
    abbr: null,
    category: 'traditional',
    group: 'Story & Script',
    short: 'The attention-grabbing opening of a film, trailer or commercial that makes the audience keep watching.',
    aliases: ['opening hook', 'cold open', 'the open'],
    body: [
      { t: 'p', c: 'The hook is the first few seconds: an image, a line, a question or a jolt of action that earns the audience\'s attention. Online, where viewers can swipe away instantly, a strong hook matters even more than it does in a theater.' },
      { t: 'p', c: 'Mark\'s Session 2 note was to strengthen his commercial\'s opening hook, and Kush was told to cut a prelude that delayed the story. Steffin\'s warning applies too: viewers who don\'t know you are looking for any reason to turn it off, and a stock-looking first frame gives them one.' }
    ],
    related: ['pacing', 'shooting-script', 'flatness', 'establishing-shot']
  },
  {
    slug: 'base-plate',
    title: 'Base Plate',
    abbr: null,
    category: 'traditional',
    group: 'VFX & Finishing',
    short: 'The original footage a visual-effects shot is built on top of; "lock the base plate" means don\'t change it.',
    aliases: ['plate', 'background plate', 'clean plate', 'lock the base plate'],
    body: [
      { t: 'p', c: 'In visual effects, the plate is the photographed footage that effects are added to: the actor on the street before the explosion, the empty sky before the dragon. A clean plate is the same shot with nothing in it, used for removing things.' },
      { t: 'p', c: 'Renee\'s Week 3 method for hybrid VFX starts with a lock header that protects the plate: "Preserve original footage 100%. Lock base plate pixels. Do not alter [actor], her face, her hand performance, lighting or background environment. Use as base plate. Additive VFX overlay pass only: [the change]." Put it first, add a [[negative-prompt]], and use [[edit-video]] mode rather than creating a new video.' }
    ],
    related: ['edit-video', 'hybrid-film', 'timecoded-prompt', 'negative-prompt']
  },
  {
    slug: 'hybrid-film',
    title: 'Hybrid Film',
    abbr: null,
    category: 'ai',
    group: 'VFX & Finishing',
    short: 'A film that combines real live-action performances and footage with AI-generated sets, effects or elements.',
    aliases: ['live-action / ai hybrid', 'hybrid filmmaking', 'hybrid', 'live action hybrid'],
    body: [
      { t: 'p', c: 'A hybrid film mixes live-action footage with AI-generated material, the way nearly every production already uses some visual effects, even if it\'s just wire removal. Darion\'s prediction, repeated across the sessions, is that most films become live-action/AI hybrids.' },
      { t: 'p', c: 'Examples from the cohort: Renee\'s Next Week, a hybrid film whose VFX she built with [[timecoded-prompt|timecoded prompts]] and [[edit-video]] passes; Reginald Cineus\'s hybrid pilot trailer; and the [[gray-box]] approach of shooting actors on a neutral set and generating the world around them. Tools like Beeble relight and composite live-action plates for exactly this work.' }
    ],
    related: ['gray-box', 'base-plate', 'edit-video', 'control-net']
  },
  {
    slug: 'lip-sync',
    title: 'Lip Sync',
    abbr: null,
    category: 'ai',
    group: 'Sound',
    short: 'Matching a character\'s mouth movements to spoken dialogue, either generated by the video model or driven by real audio.',
    aliases: ['lipsync', 'lip-sync', 'dialogue sync', 'talking head'],
    body: [
      { t: 'p', c: 'Lip sync is getting the mouth on screen to match the words on the soundtrack. In AI video it comes two ways: the model performs dialogue written into the prompt (Steffin Flickinger\'s Easy Money was acted entirely by Seedance 2.5 this way), or you feed the model a recorded voice and it syncs the face to it (how Mark built his digital-twin commercial in Session 2).' },
      { t: 'p', c: 'Every on-screen line costs generations, and the model doesn\'t always read it the way you want; the sheriff\'s first line took ten attempts. Give an action between lines ("he looks down, then continues"), prompt the mood rather than micro-movements, and use [[off-screen-dialogue]] where you can. A non-human mouth, like a floating robot or an intercom, hides imperfect sync.' }
    ],
    related: ['re-voicing', 'off-screen-dialogue', 'sound-design', 'control-net']
  },
  {
    slug: 're-voicing',
    title: 'Re-Voicing',
    abbr: null,
    category: 'ai',
    group: 'Sound',
    short: 'Running a character\'s dialogue through a voice tool such as ElevenLabs to give them one consistent, original voice.',
    aliases: ['revoice', 'voice changer', 'voice swap', 'elevenlabs', 'speech to speech'],
    body: [
      { t: 'p', c: 'Re-voicing swaps the voice on recorded or generated dialogue for a different one while keeping the performance and timing. Video models draw from a small set of stock voices that audiences already recognize, and a character\'s voice can also change from clip to clip, so re-voicing fixes both problems.' },
      { t: 'p', c: 'Steffin Flickinger\'s method: in the DaVinci Resolve edit, keep every character on their own audio track. Once the cut is locked, export each track, run it through ElevenLabs re-voice with one chosen voice, and drop it back in. Skip it and the stock voices slip through: one unchanged deputy line in Easy Money still sounds like Ryan Reynolds.' }
    ],
    related: ['lip-sync', 'sound-design', 'off-screen-dialogue', 'hallucination']
  },
  {
    slug: 'llm',
    title: 'Large Language Model',
    abbr: 'LLM',
    category: 'ai',
    group: 'AI Models & Tools',
    short: 'An AI model like ChatGPT, Claude or Gemini that reads and writes text, and can drive other tools.',
    aliases: ['llm', 'chatgpt', 'claude', 'gemini', 'chatbot', 'language model'],
    body: [
      { t: 'p', c: 'A large language model (LLM) is the text brain of an AI workflow: ChatGPT, Claude, Gemini. It reads your script, files and reference images, writes prompts, and increasingly operates other tools for you through [[mcp-connector|connectors]].' },
      { t: 'p', c: 'The cohort uses an LLM as the "director\'s desk." In Darion\'s workflow, ChatGPT holds the references and writes every prompt, then sends them to Seedance through Runway. Reginald Cineus runs his whole eight-phase process inside an [[llm-project]]. Different LLMs have different strengths: in Week 3, Renee found Gemini drafted well but Claude remembered details like "the UI stays transparent."' }
    ],
    related: ['llm-project', 'mcp-connector', 'agentic-ai', 'context-window']
  },
  {
    slug: 'llm-project',
    title: 'LLM Project',
    abbr: null,
    category: 'ai',
    group: 'AI Workflow',
    short: 'A dedicated workspace in ChatGPT or Claude with standing instructions, reference files and memory for one film.',
    aliases: ['chatgpt project', 'claude project', 'project folder', 'project instructions', 'sources', 'markdown', '.md files', 'project memory'],
    body: [
      { t: 'p', c: 'An LLM project (Projects in ChatGPT or Claude) is a container for one film. Every chat inside it inherits the same instructions and files, so you never re-explain your look or re-upload your script. It is the practical form of [[context-scaffolding]].' },
      { t: 'h', c: 'How the cohort sets one up' },
      { t: 'list', items: ['One project per film', 'Instructions: short, standing rules, such as Reginald\'s "Describe only what the camera sees" and "Every video prompt ends with \'no music.\'" Short instructions get followed more reliably than long ones', 'Files / Sources: the script, [[shot-list]], [[look-prompt]] Google Doc, [[character-bible]] and one cinematography file per scene. Detail goes in files, not instructions', 'Memory: start on the default; switch to project-only if older projects start bleeding in', 'Save locked character references to a characters folder, and save only final-quality images'] },
      { t: 'p', c: 'Week 1 added project memory in Markdown (.md) files, plain-text notes any LLM can read. A new session starts with "Before we start, review the project folder." Long threads wear out; files don\'t.' }
    ],
    related: ['context-scaffolding', 'skill-file', 'character-bible', 'context-window']
  },
  {
    slug: 'skill-file',
    title: 'Skill File',
    abbr: null,
    category: 'ai',
    group: 'AI Workflow',
    short: 'Saved instructions an LLM loads when needed, such as a style guide it wrote by studying good examples.',
    aliases: ['skill', 'skills', 'design skill', 'skills file'],
    body: [
      { t: 'p', c: 'A skill file is a reusable set of instructions an LLM can pull in on demand. Instead of explaining a technique every time, you teach it once and save the lesson.' },
      { t: 'p', c: 'Darion\'s Week 1 example: have the LLM study strong examples, like posters with great [[negative-space]], write what it learned into a skill file, then apply that skill to new shots, flyers and decks. In Week 3, Abdou built animated title cards by connecting Claude to a design skill from GitHub and describing the effect he wanted.' }
    ],
    related: ['llm-project', 'context-scaffolding', 'look-prompt', 'llm']
  },
  {
    slug: 'mcp-connector',
    title: 'MCP Connector',
    abbr: 'MCP',
    category: 'ai',
    group: 'AI Models & Tools',
    short: 'A link that lets an AI assistant like ChatGPT or Claude operate another tool, such as Runway, Blender or Figma.',
    aliases: ['mcp', 'model context protocol', 'connector', 'connectors', 'api', 'api vs mcp'],
    body: [
      { t: 'p', c: 'MCP (Model Context Protocol) is an open standard for connecting AI assistants to other software. A connector built on it lets ChatGPT or Claude log into a tool and use it for you: generate a video in Runway, build a set in Blender, lay out a board in Figma. An API is the older, more direct programmatic link between two systems.' },
      { t: 'p', c: 'Connectors are what make the one-window workflow possible: ChatGPT writes the prompt and sends it, with your references, to Seedance through the Runway connector. The difference matters in practice. In Week 1, Claude reached Runway through its API, which blocked shots using Darion\'s own likeness, while ChatGPT\'s MCP connector went straight through.' }
    ],
    related: ['aggregator', 'agentic-ai', 'llm', 'node-based-workflow']
  },
  {
    slug: 'aggregator',
    title: 'Aggregator',
    abbr: null,
    category: 'ai',
    group: 'AI Models & Tools',
    short: 'One platform and account that gives you access to many AI models, such as Runway, Higgsfield or Magnific.',
    aliases: ['model hub', 'platform', 'runway', 'higgsfield', 'magnific', 'openart'],
    body: [
      { t: 'p', c: 'An aggregator bundles many image and video models behind one login and one set of credits. Runway, Higgsfield, Magnific and OpenArt all run Seedance alongside other models like Kling, Nano Banana Pro and their own.' },
      { t: 'p', c: 'The model matters more than the site. As Steffin Flickinger put it, Seedance is Seedance whether you run it in Higgsfield or Magnific; pick the platform where you have credits and the features you need. Aggregators also make it easy to swap models mid-project when a better version ships, which Darion recommends: don\'t marry a version.' }
    ],
    related: ['mcp-connector', 'text-to-video', 'image-to-video', 'node-based-workflow']
  },
  {
    slug: 'agentic-ai',
    title: 'Agentic AI',
    abbr: null,
    category: 'ai',
    group: 'AI Models & Tools',
    short: 'An AI that works through multi-step tasks on its own, opening tools and generating while you give notes.',
    aliases: ['agentic', 'ai agent', 'agent', 'agentic flow'],
    body: [
      { t: 'p', c: 'Agentic AI goes beyond answering a prompt: it plans and carries out a sequence of steps itself. An agentic ChatGPT can open Runway, generate a batch of shots, check them, and stitch an [[assembly-edit]], taking new instructions from you mid-run.' },
      { t: 'p', c: 'Session 2\'s "agentic ChatGPT flow" ran script to edit in one window. The cohort\'s rule of thumb is to work like a director: hand over the script, blocking, characters and style, ask for all the shots, then give notes the way a director would ("he seems too nonchalant") rather than prompting every image yourself. And if a tool says it can\'t do something, tell it to find another way.' }
    ],
    related: ['mcp-connector', 'llm', 'assembly-edit', 'llm-project']
  },
  {
    slug: 'image-to-video',
    title: 'Image-to-Video',
    abbr: 'I2V',
    category: 'ai',
    group: 'AI Models & Tools',
    short: 'Generating a video clip that starts from, or is guided by, a still image you supply.',
    aliases: ['i2v', 'img2vid', 'image to video', 'start frame', 'animate an image'],
    body: [
      { t: 'p', c: 'Image-to-video (I2V) animates a still. You give the model a [[keyframe]] or first frame plus a prompt, and it invents the motion from there. Compared with [[text-to-video]], it gives you far more control over composition, lighting and look, because you have already approved the image.' },
      { t: 'p', c: 'It is the backbone of the cohort workflow: build the look, the location and the characters as stills, get a mentor thumbs-up, then animate. Reginald Cineus makes an empty first frame (environment, composition and light, no characters) for every shot and brings characters in as references. Steffin Flickinger reminds students to actually set the still as the start frame; skip it and you get a different angle of the scene.' }
    ],
    related: ['keyframe', 'first-frame-last-frame', 'text-to-video', 'character-reference']
  },
  {
    slug: 'extend-forwards',
    title: 'Extend Forwards',
    abbr: null,
    category: 'ai',
    group: 'AI Workflow',
    short: 'Generating new seconds that continue an existing clip, using that clip as the reference video.',
    aliases: ['extend', 'video extension', 'extend clip', 'continue clip'],
    body: [
      { t: 'p', c: 'Extending forwards continues a generated clip past its end. You upload the clip back to the model as a reference video and prompt exactly how many new seconds you want and what happens in them. The model picks up the motion, light and characters where the clip stopped.' },
      { t: 'p', c: 'Seedance 2.5 clips max out at about 30 seconds, so Darion built the one-minute Modern House fight in Week 1 by generating 0–30 seconds, uploading it as Video 1, and prompting an extension of exactly 30 new seconds. It pairs naturally with [[scene-stitching]], and like any long generation it benefits from a [[timecoded-prompt]].' }
    ],
    related: ['scene-stitching', 'timecoded-prompt', 'first-frame-last-frame', 'image-to-video']
  },
  {
    slug: 'edit-video',
    title: 'Edit Video',
    abbr: null,
    category: 'ai',
    group: 'AI Workflow',
    short: 'A mode that changes only what you name in an existing clip, instead of generating a new video from scratch.',
    aliases: ['edit video mode', 'video edit', 'video-to-video', 'v2v', 'create video vs edit video', 'inpainting'],
    body: [
      { t: 'p', c: 'Edit video (offered in Higgsfield, Kling and others) tells the model the shot already exists and to change only the part you describe: remove a stray extra, add a VFX element, fix a prop. Create video, by contrast, gives the model control, and even with references it reinvents the motion.' },
      { t: 'p', c: 'Use it to save a shot you almost love. In Week 3, a woman who wandered into Erica\'s zombie hallway could be removed with an edit-video pass while keeping the camera move and performance; Renee built her hybrid VFX this way, starting with a [[base-plate]] lock header.' },
      { t: 'note', c: 'Each edit pass costs a little quality. For continuity fixes, Steffin Flickinger prefers to add an [[asset-sheet]] and rerun the whole generation, avoiding video edits when he can. Use edit video when the performance or camera move is too good to lose.' }
    ],
    related: ['base-plate', 'degradation', 'asset-sheet', 'hybrid-film']
  },
  {
    slug: 'timecoded-prompt',
    title: 'Timecoded Prompt',
    abbr: null,
    category: 'ai',
    group: 'AI Workflow',
    short: 'A video prompt broken into time ranges (0–2 s, 2–6 s…) so the model knows exactly when each action happens.',
    aliases: ['timecode prompt', 'beat-by-beat prompt', 'timestamped prompt', 'prompt to the timecode'],
    body: [
      { t: 'p', c: 'A timecoded prompt splits a generation into timed beats: "0–2 s: he bursts through the door. 2–6 s: the camera tracks left as he crosses the room…" Seedance and similar models follow these timings closely, which turns a long, vague prompt into a directed shot.' },
      { t: 'p', c: 'In Week 1, Darion had ChatGPT write the Seedance prompt beat by beat from his script and references. In Week 3, Renee took it further for hybrid VFX: scrub the footage frame by frame, chart every motion\'s [[timecode]], have Claude rewrite it into a prompt that keeps every time, and the effects hit on the beat. Steffin Flickinger does the same for long action generations: write it out beat by beat, then ask Claude to "rewrite this for Seedance 2.5, 25 seconds."' }
    ],
    related: ['timecode', 'extend-forwards', 'one-beat-per-shot', 'base-plate']
  },
  {
    slug: 'negative-prompt',
    title: 'Negative Prompt',
    abbr: null,
    category: 'ai',
    group: 'AI Workflow',
    short: 'Telling a model what you don\'t want ("no music," "do not alter her face"), rather than what you do want.',
    aliases: ['negative prompting', 'negatives', 'exclusions', 'no music'],
    body: [
      { t: 'p', c: 'A negative prompt lists what to leave out. Some image tools have a dedicated negative-prompt field; in chat-based tools it is simply phrasing like "no music," "no text," or "do not change the lighting."' },
      { t: 'p', c: 'Use them precisely, not habitually. Some negatives are essential: "no music" on every video clip, and the "do not alter…" lines in Renee\'s [[base-plate]] lock header (one render without them added a deep-amber backlight nobody asked for). But in a long chat thread, the mentors steer away from negatives and describe what they do want instead, so the thread summarizes cleanly when it is time to start fresh (see [[context-window]]).' }
    ],
    related: ['context-window', 'base-plate', 'look-prompt', 'hallucination']
  },
  {
    slug: 'context-window',
    title: 'Context Window',
    abbr: null,
    category: 'ai',
    group: 'AI Models & Tools',
    short: 'How much of a conversation an LLM can hold in mind at once; long threads lose detail from the middle.',
    aliases: ['context', 'context length', 'long thread', 'new thread', 'token limit'],
    body: [
      { t: 'p', c: 'An LLM can only keep a certain amount of text and images "in view" at a time: its context window. In a long thread it weights the first and most recent prompts most heavily, and details from the middle get forgotten. That is one source of [[hallucination]] and of a chat that "stops listening."' },
      { t: 'p', c: 'The fix, from the bonus session: when a thread starts degrading, have it summarize itself into one prompt and start a new chat in the same [[llm-project]], so the folders, references and look stay available. Done properly, project folders mean you rarely hit the limit, because ChatGPT sends each shot to Seedance as a fresh prompt and pulls locked references from files.' },
      { t: 'note', c: 'If shots start drifting from your look, re-anchor first: reintroduce the [[look-prompt]] and the reference image. That beats opening five new threads in two hours.' }
    ],
    related: ['llm-project', 'hallucination', 'negative-prompt', 'degradation']
  },
  {
    slug: 'hallucination',
    title: 'Hallucination',
    abbr: null,
    category: 'ai',
    group: 'Consistency & Control',
    short: 'An unpredictable AI error, such as an extra leg, a made-up detail, or a real actor\'s face appearing uninvited.',
    aliases: ['hallucinate', 'hallucinations', 'ai error', 'extra limb', 'artifact'],
    body: [
      { t: 'p', c: 'A hallucination is when a model confidently produces something wrong: a person with three legs, a window that wasn\'t there, a line of dialogue it was never given. Unlike [[degradation]], which builds up predictably, a hallucination can strike on the very first generation.' },
      { t: 'p', c: 'Two bonus-session examples: a mentor\'s fashion image that came back with three legs on the first try (the next three were fine), and a client film of Steffin Flickinger\'s where a character in a suit drifted into an actor from the TV show Suits. Steffin had to remake every shot of that character. Review every generation at full size before it goes into the edit; hands are the usual tell.' }
    ],
    related: ['degradation', 'identity-drift', 'context-window', 'model-bias']
  },
  {
    slug: 'degradation',
    title: 'Degradation',
    abbr: null,
    category: 'ai',
    group: 'Consistency & Control',
    short: 'Quality that drops predictably each time an image is edited or regenerated, or when low-quality references are copied forward.',
    aliases: ['image degradation', 'fried image', 'overworked image', 'splotchiness', 'quality loss'],
    body: [
      { t: 'p', c: 'Degradation is the slow loss of quality from repeated editing and regenerating. Each pass gets a little softer: hair blurs into skin, a raised scar flattens into a discoloration, oily skin turns to plastic. "Splotchy" skin and cross-hatching are the tells. It also happens when you feed in low-quality references, because the model copies that quality into every shot.' },
      { t: 'p', c: 'Prevent it at step one: start from a clean, high-resolution, correctly colored reference. "The more you fight the model, the more it degrades." To rescue an overworked frame (Session 2), send it to Nano Banana: "turn this into a storyboard illustration, no text," then "turn this storyboard into a high-quality 8K film still, keep the color palette."' }
    ],
    related: ['hallucination', 'identity-drift', 'edit-video', 'upscaling']
  },
  {
    slug: 'model-bias',
    title: 'Model Bias',
    abbr: null,
    category: 'ai',
    group: 'AI Models & Tools',
    short: 'The defaults an AI model falls back on, such as who it draws for a vague description, that you must override on purpose.',
    aliases: ['bias', 'ai bias', 'default bias', 'representation'],
    body: [
      { t: 'p', c: 'Every model has defaults learned from its training data. Ask for a vague subject and it hands back the most common version of it. In Darion\'s Week 1 test, 995 of 1,000 Midjourney images for "attractive woman" were young white women with straight hair.' },
      { t: 'p', c: 'Direct around it: spell out age, ethnicity, hair and features, test more than one model, or write a standing rule into your [[llm-project]] instructions. Reginald Cineus\'s project rules start with "All characters are Black unless stated otherwise." The same instinct applies to looks: [[flatness]] is a model default too.' }
    ],
    related: ['hallucination', 'llm-project', 'flatness', 'character-reference']
  },
  {
    slug: 'personalization-profile',
    title: 'Personalization Profile',
    abbr: null,
    category: 'ai',
    group: 'AI Models & Tools',
    short: 'A Midjourney profile trained on images you pick, so even a one-line prompt comes out in your style.',
    aliases: ['midjourney personalization', 'personalize', 'moodboard', 'profile', '--p'],
    body: [
      { t: 'p', c: 'Midjourney\'s Personalize feature builds a profile (or board) from images you choose, then applies that taste to every prompt with personalization switched on. Steffin Flickinger showed the same basic prompt, "behind a man looking at the ocean, overcast, cinematic angle," producing a film still with his profile on and a stock photo with it off.' },
      { t: 'h', c: 'Building one' },
      { t: 'list', items: ['Personalize → create a profile or board → pick images', 'Pick for fit, not for "cool." Be more selective than feels normal', 'Plan on scrolling for a long time', 'Keep separate profiles for different moods: Steffin has one for bright, happy scenes and one for dark ones'] },
      { t: 'p', c: 'Without a profile, you have to spell out the look in a longer prompt: [[film-stock]], [[focal-length|lens]] and lighting. Either way, the point is to lock a style before you generate, the same job a [[style-reference]] does.' }
    ],
    related: ['style-reference', 'look-prompt', 'flatness', 'film-stock']
  },
  {
    slug: 'reference-mapping',
    title: 'Reference Mapping',
    abbr: null,
    category: 'ai',
    group: 'Consistency & Control',
    short: 'Numbering every reference image and listing who or what each one is in the prompt, so the model never guesses.',
    aliases: ['reference legend', 'reference map', 'image legend', 'numbered references'],
    body: [
      { t: 'p', c: 'When a video model takes many reference images at once, it needs to know which is which. Reference mapping names the files 01, 02, 03… and pastes a legend into the prompt: "IMG 01: style and cinematography reference. IMG 02: Darion (lead). IMG 05: buzz-cut man, table crew."' },
      { t: 'p', c: 'Darion\'s Week 1 version adds an identity and state lock: who is in the scene and who is already down. When ChatGPT drives Seedance through Runway, it can do much of this bookkeeping for you. Even then, a clean legend removes any doubt and is the first thing to check when a model swaps two characters.' }
    ],
    related: ['character-reference', 'context-scaffolding', 'style-reference', 'identity-drift']
  },
  {
    slug: 'character-sheet',
    title: 'Character Sheet',
    abbr: null,
    category: 'ai',
    group: 'Consistency & Control',
    short: 'One image showing a character from several angles; still handy for minor characters, replaced by separate references for leads.',
    aliases: ['character turnaround', 'model sheet', 'turnaround sheet'],
    body: [
      { t: 'p', c: 'A character sheet packs several views of one character (front, three-quarter, profile, back) into a single image. It became the standard AI consistency trick when models only accepted a handful of reference images.' },
      { t: 'p', c: 'Now that models take far more references (Seedance 2.5 up to 30, ChatGPT about 20), the cohort recommends [[character-reference|separate full-resolution references]] for leads instead: a sheet downsamples every angle, and fewer pixels per view means a weaker likeness and more [[identity-drift]]. Simple sheets are still fine for minor characters.' }
    ],
    related: ['character-reference', 'asset-sheet', 'identity-drift', 'reference-mapping']
  },
  {
    slug: 'character-reference',
    title: 'Character Reference',
    abbr: null,
    category: 'ai',
    group: 'Consistency & Control',
    short: 'A set of separate, full-resolution images of a character (one angle or expression per image) that the video model copies.',
    aliases: ['character references', 'character refs', 'cast references', 'likeness references'],
    body: [
      { t: 'p', c: 'Character references are the images a model uses to keep a character consistent. The cohort\'s rule, from Darion and Reginald Cineus: one angle, one image, at full resolution. A lead gets the most: front face, full body in costume, three-quarter, side profile, back of the head, a range of expressions, and detail shots of anything distinctive (hat, jewelry, belt buckle, gloves on and off). Supporting characters usually need two or three.' },
      { t: 'p', c: 'The model copies whatever you feed it, flaws included. A flawed hero reference made Darion\'s face read heavy in every frontal shot and cost two to three days of regeneration. Approve every reference before you generate, and when an outfit changes, reshoot the full set in the new look. Once approved, update the [[character-bible]] so text and images never drift apart.' }
    ],
    related: ['character-sheet', 'character-bible', 'reference-mapping', 'identity-drift']
  },
  {
    slug: 'character-bible',
    title: 'Character Bible',
    abbr: null,
    category: 'ai',
    group: 'Consistency & Control',
    short: 'A project file describing every character in detail, kept in sync with their approved reference images.',
    aliases: ['bible', 'story bible', 'character file', 'character descriptions'],
    body: [
      { t: 'p', c: 'A character bible is a document with the canonical description of each character: look, wardrobe, age, manner, history. TV writers\' rooms keep one; in an AI production it lives in your [[llm-project]] files so every prompt describes characters the same way.' },
      { t: 'p', c: 'Reginald Cineus points his project instructions at it ("Use the Character Bible file for every character description"), and once a character\'s reference images are approved, has the LLM rewrite that character\'s entry to match the images, so the text and the reference never drift apart.' }
    ],
    related: ['llm-project', 'character-reference', 'continuity', 'context-scaffolding']
  },
  {
    slug: 'asset-sheet',
    title: 'Asset Sheet',
    abbr: null,
    category: 'ai',
    group: 'Consistency & Control',
    short: 'A reference image of a location, prop or wardrobe item on its own, used to keep it consistent across shots.',
    aliases: ['location sheet', 'item sheet', 'prop sheet', 'environment reference', 'location reference'],
    body: [
      { t: 'p', c: 'An asset sheet does for a place or object what a [[character-reference]] does for a person. If a logo, poster, table, shirt or room keeps changing between shots, make a clean image of just that thing (an item on a plain background, or a room from several [[azimuth]] angles) and attach it to the generation.' },
      { t: 'p', c: 'Steffin Flickinger\'s examples from the bonus session: a superhero\'s chest logo that changed when the camera moved, a shirt that switched from long to short sleeves on a pull-out, a window that appeared behind a character. His fix is always the same: add the sheet and rerun the whole generation rather than patching it. "There\'s nobody else that\'s going to make you do that extra bit of work."' }
    ],
    related: ['continuity', 'character-reference', 'azimuth', 'edit-video']
  },
  {
    slug: 'annotation',
    title: 'Annotation',
    abbr: null,
    category: 'ai',
    group: 'AI Workflow',
    short: 'Pausing a generated video on a frame and typing a fix note at that exact spot for the model to act on.',
    aliases: ['annotate', 'frame notes', 'video notes'],
    body: [
      { t: 'p', c: 'Annotation, as shown in Session 2, lets you stop a generated clip in ChatGPT on the exact frame where something goes wrong and type a note right there (for example, "his hand passes through the table here"). The model then knows precisely what and where to fix.' },
      { t: 'p', c: 'It is the AI equivalent of a director\'s timestamped notes to an editor. Pair it with [[edit-video]] when only one moment is broken, so you keep the rest of the take.' }
    ],
    related: ['edit-video', 'timecode', 'agentic-ai', 'continuity']
  },
  {
    slug: 'visual-effects',
    title: 'Visual Effects',
    abbr: 'VFX',
    category: 'traditional',
    group: 'VFX & Finishing',
    short: 'Imagery created or altered after the shoot, from removing a wire to building an entire world.',
    aliases: ['vfx', 'visual effects', 'cgi', 'post effects', 'wire removal'],
    body: [
      { t: 'p', c: 'Visual effects (VFX) covers anything added to or changed in footage after it is shot: set extensions, explosions, creatures, sky replacements, and invisible fixes like removing a cable or a logo. Practical effects, by contrast, happen in front of the camera.' },
      { t: 'p', c: 'Darion frames the whole course this way: keep traditional filmmaking intact and use AI the way VFX artists already do. Nearly every production today uses some VFX, even a romantic comedy, even if it is just wire removal, and he expects most films to become [[hybrid-film|live-action/AI hybrids]] in the same way. Renee\'s Week 3 [[base-plate]] workflow is AI used as a VFX pass.' }
    ],
    related: ['hybrid-film', 'base-plate', 'green-screen', 'edit-video']
  },
  {
    slug: 'green-screen',
    title: 'Green Screen',
    abbr: null,
    category: 'traditional',
    group: 'VFX & Finishing',
    short: 'A solid green backdrop that software removes so a subject can be composited onto a different background.',
    aliases: ['chroma key', 'keying', 'compositing', 'comp', 'blue screen'],
    body: [
      { t: 'p', c: 'A green screen is a backdrop of one flat, bright color that a keyer can cleanly remove, leaving the subject on transparency. The subject is then composited ("comped") over a new background. Blue screens do the same job.' },
      { t: 'p', c: 'It works for AI elements too. In Session 2, Abdou prompted his creatures in Nano Banana already standing on a green screen, generated them moving in Kling, removed the green in DaVinci Resolve, and comped them onto footage of real people. The neutral [[gray-box]] set is a newer cousin: actors are shot on gray and AI builds the environment around them.' },
      { t: 'note', c: 'Match the light. A comped element that is lit differently from the plate gives itself away, so describe the target lighting when you generate the green-screen element.' }
    ],
    related: ['gray-box', 'visual-effects', 'hybrid-film', 'motivated-lighting']
  },
  {
    slug: 'motion-graphics',
    title: 'Motion Graphics',
    abbr: null,
    category: 'traditional',
    group: 'VFX & Finishing',
    short: 'Animated text, shapes and design elements, as used in title cards, lower thirds and commercial sizzle reels.',
    aliases: ['mograph', 'title cards', 'animated titles', 'kinetic typography', 'sizzle reel', 'lower thirds'],
    body: [
      { t: 'p', c: 'Motion graphics are animated graphic design: titles, kinetic type, logos, infographics, on-screen UI. Commercials and sizzle reels lean on them heavily to move information fast and give a piece energy.' },
      { t: 'p', c: 'Mark\'s Session 2 note was to add motion graphics to his commercial. Gheri\'s tip: treat them like any other part of the story, and study the quick 30-second sizzle reels from companies like Google for ideas. Another tip from the session: find a video with the kind of motion you want and show it to ChatGPT, rather than trying to describe it in words. In Week 3, Abdou built animated title cards with Claude and a design [[skill-file]].' }
    ],
    related: ['skill-file', 'hook', 'edit-video', 'visual-effects']
  },
  {
    slug: 'digital-twin',
    title: 'Digital Twin',
    abbr: null,
    category: 'ai',
    group: 'Consistency & Control',
    short: 'An AI replica of a real person\'s likeness (and sometimes voice), built from their photos, video and audio.',
    aliases: ['ai twin', 'digital double', 'ai avatar', 'de-aging', 'likeness model'],
    body: [
      { t: 'p', c: 'A digital twin is an AI version of a real person that can be placed in shots they never filmed. It is built from high-quality reference photos and video of the person, often with recorded voice for [[lip-sync]].' },
      { t: 'p', c: 'Mark\'s digital-twin commercial reached 500,000 views, and his capstone, ANKRBOY, uses a younger twin of himself in a de-aging proof of concept. The Session 2 lesson: lock the likeness at step one with a print-quality image, because everything downstream copies it. Only build twins of people who have given you permission (see [[copyright-and-likeness]]).' }
    ],
    related: ['character-reference', 'lip-sync', 'identity-drift', 'copyright-and-likeness']
  },
  {
    slug: 'proof-of-concept',
    title: 'Proof of Concept',
    abbr: null,
    category: 'traditional',
    group: 'Story & Script',
    short: 'A short, finished piece that demonstrates a bigger film or series can work, used to pitch, fund or test it.',
    aliases: ['poc', 'concept short', 'pilot', 'sizzle', 'excerpt'],
    body: [
      { t: 'p', c: 'A proof of concept is a short film or scene that shows the tone, world and quality of a larger project, so financiers, studios or collaborators can see it rather than imagine it. Many features started life this way.' },
      { t: 'p', c: 'It is why the cohort capstone can be an excerpt of a longer project. Mark is building a six-minute opening to his film, and the Week 3 brief made the bar clear: the target is two excellent minutes of the story, not six minutes squeezed into two. AI makes proofs of concept affordable for anyone, which raises the bar for how good they need to be.' }
    ],
    related: ['hook', 'shooting-script', 'digital-twin', 'pacing']
  },
  {
    slug: 'mood-board',
    title: 'Mood Board',
    abbr: null,
    category: 'traditional',
    group: 'Story & Script',
    short: 'A collage of reference images that sets a project\'s visual tone, colors and feel before anything is made.',
    aliases: ['moodboard', 'lookbook', 'look book', 'reference board', 'pinterest board', 'cosmos board'],
    body: [
      { t: 'p', c: 'A mood board gathers images, film stills, colors and textures into one place to communicate a look. A lookbook is the more polished version a director or cinematographer presents to the team: lighting, lenses, framing and palette, scene by scene.' },
      { t: 'p', c: 'The cohort builds them from ShotDeck, Pinterest and Cosmos, and in Figma, which can be connected to a Claude project so the board travels with your files. Reginald Cineus uses Figma boards for mood, reference organization and shot planning. A board is the raw material; the next step is to choose one [[style-reference]] per scene and turn it into a [[look-prompt]].' }
    ],
    related: ['style-reference', 'look-prompt', 'color-palette', 'personalization-profile']
  },
  {
    slug: 'haze',
    title: 'Haze',
    abbr: null,
    category: 'traditional',
    group: 'Lighting',
    short: 'A fine atmospheric mist that makes light beams visible and adds depth and softness to a shot.',
    aliases: ['atmosphere', 'cinematic haze', 'atmospherics', 'smoke', 'volumetric light', 'god rays'],
    body: [
      { t: 'p', c: 'Haze is a thin mist pumped onto a set so light has something to catch on. It reveals beams from windows and lamps, softens contrast with distance, and separates foreground from background, which is why so many cinematic interiors have it.' },
      { t: 'p', c: 'It is one of the ingredients the cohort pulls from reference stills. Reginald Cineus lists "cinematic haze" alongside color, camera behavior and time of day in his look prompts, and in Week 1 Darion noted that haze, palette and depth land closer to the reference when the model can see them in an image rather than read them as adjectives.' }
    ],
    related: ['look-prompt', 'style-reference', 'motivated-lighting', 'depth-of-field']
  },
  {
    slug: 'resolution',
    title: 'Resolution',
    abbr: null,
    category: 'traditional',
    group: 'VFX & Finishing',
    short: 'The pixel dimensions of an image or video, such as 480p, 1080p (HD) or 4K; higher means sharper and costlier.',
    aliases: ['480p', '720p', '1080p', '4k', 'hd', '8k', 'draft resolution', 'test render'],
    body: [
      { t: 'p', c: 'Resolution is how many pixels make up a frame: 480p is a small draft, 1080p (1920 × 1080) is HD, and 4K is about four times that. More pixels hold more detail but cost more to generate, store and render.' },
      { t: 'p', c: 'Spend like a producer. The cohort drafts Seedance clips at 480p to check motion and performance, and only renders finals at 1080p; in Week 1, 1080p ran about $13 per 30 seconds. Many models still top out at HD, which is why Renee locks her 4K [[base-plate]] in edit mode, and why finished AI shots are often run through [[upscaling]] (Topaz, the Weavy Enhancer).' }
    ],
    related: ['upscaling', 'aspect-ratio', 'base-plate', 'degradation']
  },
  {
    slug: 'copyright-and-likeness',
    title: 'Copyright & Likeness',
    abbr: null,
    category: 'ai',
    group: 'AI Workflow',
    short: 'The rights that protect creative work, designs and a person\'s face or voice; use only references you have rights to.',
    aliases: ['copyright', 'likeness rights', 'ip', 'intellectual property', 'fair use', 'copyright hygiene'],
    body: [
      { t: 'p', c: 'Copyright protects original creative work (films, photos, music, distinctive designs), and likeness rights protect a person\'s face, voice and identity. Both matter more in AI work, because it is easy to generate something that copies them, and firms now scan the web for unlicensed use.' },
      { t: 'h', c: 'The cohort\'s working habits' },
      { t: 'list', items: ['Only use reference images you have rights to, especially on paid or festival work', 'For a distinctive building or design, have the LLM alter it until it isn\'t a copy; it understands the request', 'Watch for a famous face creeping in (see [[hallucination]]) and replace it before you deliver', 'Only build a [[digital-twin]] of someone who has agreed to it', 'Studios like Wonder Studios review your prompts for copyrighted material, so expect your process to be checked'] },
      { t: 'note', c: 'This is general guidance from the sessions, not legal advice. For anything commercial, check the terms of each tool you use and talk to a lawyer when in doubt.' }
    ],
    related: ['digital-twin', 'hallucination', 'style-reference', 'model-bias']
  },
  {
    slug: 'motion-blur',
    title: 'Motion Blur',
    abbr: null,
    category: 'traditional',
    group: 'Camera & Lens',
    short: 'The streaking of moving objects in a frame, which tells the eye how fast something is going.',
    aliases: ['blur', 'shutter blur', 'speed blur', 'slow motion fix'],
    body: [
      { t: 'p', c: 'Motion blur is the smear a moving subject leaves across a single frame while the camera\'s shutter is open. Spinning wheels, a running figure or trees rushing past a car window all blur in the direction of travel, and the amount of blur is one of the main ways we read speed. A [[whip-pan]] is motion blur used as a transition.' },
      { t: 'p', c: 'In the bonus session, Steffin Flickinger shared a fix from when every AI car chase and run came out in slow motion: add motion blur to the still before animating it, as a Photoshop layer on the tires, the trees in the background, or whatever is moving. The model read the speed from the blur and played the action in real time. Newer models mostly don\'t need it, but the habit behind it is the lesson: when the model won\'t do what you want, find a way around it.' }
    ],
    related: ['whip-pan', 'image-to-video', 'keyframe', 'tracking-shot']
  }
];
