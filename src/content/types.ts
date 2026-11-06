/**
 * Content schema for the TouchDesigner course.
 *
 * Every lesson is a typed object. Graphs (operator networks) are described declaratively so
 * they can be rendered by the NetworkView, validated against the official operator/parameter
 * database (data/opdata.json), and exported as a TouchDesigner Python build script.
 *
 * See AUTHORING.md for the writing guide.
 */

export type Family = 'POP' | 'TOP' | 'CHOP' | 'SOP' | 'DAT' | 'COMP' | 'MAT';

export type Level = 'foundations' | 'intermediate' | 'advanced';

/**
 * A parameter value as it should be entered in TouchDesigner's parameter dialog.
 *
 * - number / string / boolean: a constant (string for menus = the menu *label* as shown in TD,
 *   e.g. 'Simplex 3D (GPU)'; string for text/OP fields = the literal text).
 * - array: a multi-component parameter (Translate, Size, Color...). Order = TD's order.
 *   Components may individually be expressions: [0, { expr: 'absTime.seconds * 10' }, 0].
 * - { expr }: a Python expression (parameter in expression mode, shown in blue in TD).
 * - { ref }: an operator reference typed into an OP parameter (e.g. Camera → 'cam1').
 *   The viewer draws a dashed reference line when the target is in the same network.
 */
export type ParamValue =
  | number
  | string
  | boolean
  | TupleValue
  | { expr: string }
  | { ref: string };

export type TupleValue = (number | { expr: string })[];

export interface NodeFlags {
  display?: boolean;
  render?: boolean;
  bypass?: boolean;
  /** Turn on the node viewer (purely cosmetic in this site) */
  viewer?: boolean;
}

export interface GraphNode {
  /** TouchDesigner node name, e.g. 'noise1'. Must be unique within the whole lesson graph. */
  id: string;
  /** TouchDesigner OP type as used by Python's create(), e.g. 'noisePOP', 'geometryCOMP'. */
  type: string;
  /** Grid position: x = columns (left→right data flow), y = rows (downwards). Fractions allowed. */
  x?: number;
  y?: number;
  /** Node ids wired into input connectors 0..n (must be in the same network & same family). */
  inputs?: (string | null)[];
  /**
   * Parameters the learner must change from their defaults.
   * Key = parameter label exactly as shown in TD (e.g. 'Amplitude'). If a label exists on
   * more than one page, prefix the page: 'Output:Combine Operation'.
   */
  params?: Record<string, ParamValue>;
  /** Markdown: why this node exists / what to watch for. Shown in the inspector. */
  note?: string;
  flags?: NodeFlags;
  /** For COMPs: the network inside the component. */
  children?: GraphNode[];
  /** Optional annotations inside the child network. */
  childComments?: Comment[];
  /** Text content for DATs (Text DAT, GLSL shader DAT, Python callbacks...). */
  code?: { lang: CodeLang; text: string };
  /** Cell content for Table DATs (first row is usually the header). */
  table?: string[][];
  /** Thumbnail override (see components/graph/thumbnails.tsx); usually inferred. */
  thumb?: string;
}

export type CodeLang = 'python' | 'glsl' | 'text' | 'json' | 'csv';

export interface Comment {
  x: number;
  y: number;
  /** width in grid columns (default 2) */
  w?: number;
  text: string;
}

export interface NetBox {
  title: string;
  /** node ids enclosed by the box (same network) */
  nodes: string[];
  tone?: 'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'gray';
}

export interface ExtraLink {
  from: string;
  to: string;
  label?: string;
}

export interface Step {
  title: string;
  /** Markdown instructions for this step. */
  body: string;
  /** Nodes introduced in this step (they appear and get highlighted). */
  nodes?: string[];
  /** Existing nodes to highlight (e.g. when revisiting parameters). */
  focus?: string[];
}

export interface Graph {
  id: string;
  title: string;
  /** Markdown caption shown under the graph */
  caption?: string;
  /** Network path label for the root network, default '/project1' */
  root?: string;
  nodes: GraphNode[];
  comments?: Comment[];
  boxes?: NetBox[];
  links?: ExtraLink[];
  /** Build-along steps. Nodes not listed in any step are visible from the start. */
  steps?: Step[];
  /** Pixel height of the viewer (default 520) */
  height?: number;
}

export type CalloutTone = 'tip' | 'note' | 'warning' | 'perf' | 'concept' | 'art';

export interface QuizQuestion {
  q: string;
  options: string[];
  /** index of the correct option */
  answer: number;
  explain: string;
}

export type Block =
  | { kind: 'md'; md: string }
  | { kind: 'graph'; graph: Graph }
  | { kind: 'callout'; tone: CalloutTone; title?: string; md: string }
  | { kind: 'code'; lang: CodeLang; title?: string; code: string }
  | { kind: 'challenge'; title: string; md: string; hints?: string[]; solution?: string }
  | { kind: 'quiz'; questions: QuizQuestion[] }
  | { kind: 'compare'; left: { title: string; md: string }; right: { title: string; md: string } };

export interface Lesson {
  slug: string;
  title: string;
  /** One-line hook */
  subtitle: string;
  minutes: number;
  /** Short markdown summary for cards */
  summary: string;
  objectives: string[];
  /** Slugs of lessons that should come first (informational) */
  requires?: string[];
  tags?: string[];
  blocks: Block[];
}

export interface Module {
  id: string;
  number: number;
  title: string;
  level: Level;
  blurb: string;
  lessons: Lesson[];
}

/** Short, original descriptions of operators for the Atlas + inspector. */
export interface OpBlurb {
  /** One or two sentences: what it does, in this course's voice. */
  what: string;
  /** Optional practical tip. */
  tip?: string;
}
