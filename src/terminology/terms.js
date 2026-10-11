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
    aliases: ['controlnet', 'control net', 'pose control', 'conditioning'],
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
  }
];
