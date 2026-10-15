/* eslint-disable import/no-unresolved */
import DA_SDK from 'https://da.live/nx/utils/sdk.js';

// ── Storage ───────────────────────────────────────────────────────────────────
const STORE_KEY = 'da-workspace-tour';

function loadStore() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveStore(store) {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

function isTourDismissed(tourId) {
  return !!loadStore()[tourId]?.dismissed;
}

function isTourVisited(tourId) {
  return !!loadStore()[tourId]?.visited;
}

function markTourDismissed(tourId) {
  const store = loadStore();
  if (!store[tourId]) store[tourId] = {};
  store[tourId].dismissed = true;
  saveStore(store);
}

function markTourVisited(tourId) {
  const store = loadStore();
  if (!store[tourId]) store[tourId] = {};
  store[tourId].visited = true;
  saveStore(store);
}

function resetAllTours() {
  localStorage.removeItem(STORE_KEY);
}

// ── UI diagram helper ─────────────────────────────────────────────────────────
// Returns a styled <div> showing a simplified UI chrome diagram as a reference visual.
function uiDiagram(rows) {
  return `<div style="
    font-family: monospace; font-size: 10.5px; line-height: 1.6;
    background: #1a1a2e; color: #c8d3f5; border-radius: 6px;
    padding: 8px 10px; margin: 10px 0; overflow-x: auto;
    border: 1px solid #333;">${rows.map((r) => `<div>${r}</div>`).join('')}</div>`;
}

// ── Page Editor Tour ──────────────────────────────────────────────────────────
function buildPageEditorTour(hasBlocks, hasTemplates) {
  const steps = [];

  // 1 — Welcome
  steps.push({
    emoji: '👋',
    heading: 'Welcome to the Page Editor',
    html: `<div class="step-body">
      <p>This is the DA page editor. Pages are stored as HTML source, edited here
      collaboratively in real time, and delivered via Edge Delivery Services (EDS).</p>
      <p>Use <strong>Next / Back</strong> to move through the steps, or click any dot
      above. Press <strong>Escape</strong> to close — reopen from this panel any time.</p>
      <div class="tip-box">This tour follows the order things actually appear in the UI,
      left to right, top to bottom.</div>
    </div>`,
  });

  // 2 — Left sidebar / AI chat
  steps.push({
    emoji: '💬',
    heading: 'Opening the AI Chat',
    html: `<div class="step-body">
      <p>The AI chat pane is on the <strong>left side of the screen</strong>.
      Look for the chat bubble icon at the top left of the editor chrome — click it
      to open the chat panel.</p>
      ${uiDiagram([
        '┌─────────────────────────────────────────┐',
        '│ [💬] DA Logo  │  Page title  │  ···     │  ← top bar',
        '├──┬──────────────────────────────────────┤',
        '│  │                                       │',
        '│  │   ← Chat icon (top left of sidebar)  │',
        '│  │                                       │',
        '│  │      page canvas here                 │',
        '│  │                                       │',
        '└──┴──────────────────────────────────────┘',
      ])}
      <p>Once open, the chat pane slides in from the left. You type prompts at the bottom
      of that pane. The AI can read your page, make edits, run skills, call MCP tools,
      and more.</p>
      <div class="tip-box">The AI chat is separate from the page canvas. Edits the AI
      makes happen through tool calls in the background, not by typing in the editor.</div>
    </div>`,
  });

  // 3 — The + button inside chat
  steps.push({
    emoji: '➕',
    heading: 'The + Button (inside the chat pane)',
    html: `<div class="step-body">
      <p>Inside the open chat pane, look for a <strong>+ button at the bottom left</strong>
      of the input area. This opens a submenu with three things:</p>
      ${uiDiagram([
        '┌──────────────────────────────────────┐',
        '│  Chat pane                           │',
        '│                                      │',
        '│  [message history...]                │',
        '│                                      │',
        '│  ┌──────────────────────────────┐    │',
        '│  │ type a message...            │    │',
        '│  └──────────────────────────────┘    │',
        '│  [+]  ← tap this                     │',
        '│   ├─ 📎 Upload file                  │',
        '│   ├─ 📋 Stored prompts               │',
        '│   └─ 🧠 Skills                       │',
        '└──────────────────────────────────────┘',
      ])}
      <ul>
        <li><strong>Upload file</strong> — attach a file to your message. Supports images,
        PDFs, and a small set of document types. <em>Not</em> for uploading DA pages or
        HTML files — only reference/context files you want the AI to read.</li>
        <li><strong>Stored prompts</strong> — prompts you have saved previously for reuse.
        Select one to paste it into the input box.</li>
        <li><strong>Skills</strong> — named, saved AI workflows. Select one and the AI
        runs the full multi-step workflow automatically.</li>
      </ul>
      <div class="warn-box">File upload is intentionally limited in type and size. You
      cannot upload a DA page, an HTML file, or a JSON file via this menu — use the
      content API or drag-drop in Browse view for those.</div>
    </div>`,
  });

  // 4 — Skills
  steps.push({
    emoji: '🧠',
    heading: 'Skills',
    html: `<div class="step-body">
      <p><strong>Skills</strong> are saved, named AI workflows stored in your site config.
      Each skill is a Markdown document that describes a repeatable multi-step task.
      The AI reads and follows the skill instructions literally.</p>
      <p>Access them via the <strong>+ button</strong> in the chat pane (previous step),
      or just describe what you want and the AI will suggest the right skill.</p>
      <div class="tag-row">
        <span class="tag">SEO Audit</span>
        <span class="tag">Safe Edit + Version</span>
        <span class="tag">New Page from Template</span>
        <span class="tag">Disclosure Audit</span>
        <span class="tag orange">+ your custom skills</span>
      </div>
      <details class="advanced-toggle">
        <summary>&#9733; Power Author</summary>
        <div class="adv-body">
          <p>Skills live in <code>/.da/config</code> under the <code>skills</code> sheet
          table. Each row has a <code>key</code> (the skill ID) and a <code>value</code>
          (full Markdown body). Ask the AI to <em>"save this as a skill called X"</em>
          and it writes directly to config.</p>
          <p>Skills can reference MCP tool names directly in their instructions, e.g.
          <em>"call content_publish on this path"</em>. The AI resolves tool calls against
          whichever MCP servers are connected in the current session.</p>
        </div>
      </details>
    </div>`,
  });

  // 5 — MCP
  steps.push({
    emoji: '🔌',
    heading: 'MCP Servers',
    html: `<div class="step-body">
      <p><strong>MCP (Model Context Protocol) servers</strong> give the AI real tools it can
      call — not just text generation. When a skill or prompt triggers an MCP tool, a real
      action happens.</p>
      <p>What MCP tools can do:</p>
      <ul>
        <li>Preview and publish pages programmatically</li>
        <li>Schedule a publish for a future time</li>
        <li>Read and write content files</li>
        <li>Manage permissions</li>
        <li>Run governance and brand voice checks</li>
        <li>Validate structured content against schemas</li>
      </ul>
      <div class="warn-box">MCP actions are real. If you ask the AI to publish a page and
      it uses the <code>content_publish</code> tool, that page goes live. The AI always
      confirms before taking irreversible actions.</div>
      <details class="advanced-toggle">
        <summary>&#9733; Power Author</summary>
        <div class="adv-body">
          <p>Ask the AI <em>"What MCP tools are available?"</em> to see the full list
          for your current session. MCP servers are configured per workspace session, not
          per page. Your admin adds servers to the DA workspace configuration.</p>
        </div>
      </details>
    </div>`,
  });

  // 6 — Stored Prompts
  steps.push({
    emoji: '💾',
    heading: 'Storing Prompts',
    html: `<div class="step-body">
      <p>If you type the same prompt repeatedly, save it. Two ways:</p>
      <ul>
        <li><strong>Prompt library (via + button):</strong> Short, reusable prompts stored
        in the chat session. Select from the <em>Stored prompts</em> submenu to paste
        instantly.</li>
        <li><strong>As a Skill:</strong> For multi-step workflows, ask the AI to
        <em>"save this as a skill called [name]"</em> and it persists to your
        <code>/.da/config</code> skills table. Skills survive across sessions and are
        shared with your whole team.</li>
      </ul>
      <div class="tip-box">Use stored prompts for short, personal, session-level shortcuts.
      Use Skills for anything your team runs more than once or that involves more than
      one step.</div>
    </div>`,
  });

  // 7 — Two authoring modes
  steps.push({
    emoji: '📐',
    heading: 'Two Ways to Author',
    html: `<div class="step-body">
      <p>The page canvas has two modes. Switch using the <strong>right-side dropdown</strong>
      at the top right of the editor (it defaults to <strong>Outline</strong>):</p>
      ${uiDiagram([
        '┌──────────────────────────────────────────────┐',
        '│  Page title                    [Outline ▼]   │  ← dropdown top right',
        '├──────────────────────────────────────────────┤',
        '│                                               │',
        '│   page canvas                                 │',
        '│                                               │',
        '└──────────────────────────────────────────────┘',
        '  Dropdown options:',
        '  • Outline   ← structural tree view (default)',
        '  • WYSIWYG   ← visual rich-text editing',
        '  • + any Extensions your team has added',
      ])}
      <ul>
        <li><strong>WYSIWYG:</strong> Visual rich-text editing. Drag content, format text,
        insert images. What you see roughly matches the live page.</li>
        <li><strong>Outline:</strong> Structural tree. See sections, blocks, rows and
        columns as a hierarchy. Best for reordering and restructuring.</li>
      </ul>
      <div class="warn-box">The dropdown is also where custom Extensions appear. If your
      team has added diagram editors, form builders, or other tools, they show here.</div>
      <details class="advanced-toggle">
        <summary>&#9733; Power Author</summary>
        <div class="adv-body">
          <p>Extensions in this dropdown are registered in your site's GitHub repo and
          loaded as iframes inside the editor. They have full access to the page content
          via the DA SDK. Examples on this site: diagram editors, disclosure pickers.</p>
          <p>Developers add extensions by creating a plugin HTML+JS file, committing it
          to GitHub, and registering it in <code>/.da/config</code>.</p>
        </div>
      </details>
    </div>`,
  });

  // 8 — Sections
  steps.push({
    emoji: '📦',
    heading: 'Sections',
    html: `<div class="step-body">
      <p>Every page is divided into <strong>sections</strong>, separated by horizontal rules
      in the source. Each section is an independent layout region on the live page.</p>
      <p>In <strong>Outline view</strong> sections appear as top-level nodes. You can drag
      them to reorder.</p>
      <p>In <strong>WYSIWYG</strong>, section boundaries are a thin line. Content
      cannot be dragged across section boundaries visually — switch to Outline to move
      blocks between sections.</p>
      <div class="tip-box">Add a <code>section-metadata</code> block at the end of any
      section to control its style, background, or layout class.</div>
      <details class="advanced-toggle">
        <summary>&#9733; Power Author</summary>
        <div class="adv-body">
          <p><code>section-metadata</code> values become <code>data-*</code> attributes
          on the section element in the live DOM. Your site CSS and block JS can read
          these. For example: <code>style: dark</code> applies a <code>.dark</code>
          class the stylesheet can target. <code>style: disclosures numbered</code>
          applies two classes at once.</p>
        </div>
      </details>
    </div>`,
  });

  // 9 — Blocks (conditional)
  if (hasBlocks) {
    steps.push({
      emoji: '🧱',
      heading: 'Block Library',
      html: `<div class="step-body">
        <p>Your site has a <strong>Block Library</strong> in the left sidebar. Click the
        blocks icon to browse available components, hover for a live preview, then click
        to insert at your cursor.</p>
        <p>Under the hood, blocks are just tables: the first cell is the block name
        (and optional variant classes), subsequent rows and columns are content. EDS
        transforms them into components on the live page.</p>
        <div class="tag-row">
          <span class="tag">Hero</span>
          <span class="tag">Cards</span>
          <span class="tag">Columns</span>
          <span class="tag">Diagram Editor</span>
          <span class="tag green">+ more</span>
        </div>
        <div class="tip-box">Block names are case-insensitive and hyphen-separated.
        Variant classes go in the same first cell, space-separated:
        <code>cards full-width</code></div>
        <details class="advanced-toggle">
          <summary>&#9733; Power Author</summary>
          <div class="adv-body">
            <p>In Outline view you can edit the block header cell directly to rename a
            block or add/remove variants without re-inserting from the library. This is
            the fastest way to switch a <code>hero</code> to <code>hero dark</code>.</p>
            <p>The block library is configured at
            <code>/tools/sidekick/library/blocks.json</code>. Each entry points to a
            reference HTML page that shows the block with sample content.</p>
          </div>
        </details>
      </div>`,
    });
  }

  // 10 — Templates (conditional)
  if (hasTemplates) {
    steps.push({
      emoji: '📋',
      heading: 'Page Templates',
      html: `<div class="step-body">
        <p>When creating a new page from Browse view, choose
        <strong>New from Template</strong> to start from a pre-structured layout with
        placeholder content.</p>
        <p>Templates on this site include a basic landing page and an advanced layout
        with legal sections and a hero already wired up.</p>
        <details class="advanced-toggle">
          <summary>&#9733; Power Author</summary>
          <div class="adv-body">
            <p>Templates live at <code>/tools/sidekick/templates/</code>. To add one:
            author a page with the structure you want, then add its path to
            <code>/tools/sidekick/library/templates.json</code>. Use bracketed hints
            like <code>[Headline here]</code> as placeholder conventions — there is no
            formal placeholder system.</p>
          </div>
        </details>
      </div>`,
    });
  }

  // 11 — Metadata
  steps.push({
    emoji: '🏷',
    heading: 'Metadata Block',
    html: `<div class="step-body">
      <p>The <strong>Metadata block</strong> goes at the very end of your page (last section).
      It controls SEO title, description, and social sharing. It is a two-column table:
      field name on the left, value on the right.</p>
      <p>Key fields:</p>
      <ul>
        <li><code>title</code> — browser tab and search result title</li>
        <li><code>description</code> — search snippet, 155 chars max</li>
        <li><code>og:image</code> — social share image (full URL)</li>
        <li><code>og:title</code> / <code>og:description</code> — social overrides</li>
        <li><code>robots</code> — e.g. <code>noindex</code></li>
      </ul>
      <div class="warn-box">Without a metadata block, EDS infers the title from your H1.
      Description and og:image are missing entirely, which hurts SEO and social
      previews.</div>
      <details class="advanced-toggle">
        <summary>&#9733; Power Author</summary>
        <div class="adv-body">
          <p>You can also add <code>canonical</code> for URL canonicalization,
          <code>json-ld</code> for structured data markup, and any custom
          <code>meta name</code> your site theme reads. All rows in the same table.</p>
          <p>The metadata block MUST be the last block on the page. EDS stops
          processing metadata rows if it encounters other content after them.</p>
        </div>
      </details>
    </div>`,
  });

  // 12 — Section Metadata
  steps.push({
    emoji: '📎',
    heading: 'Section Metadata',
    html: `<div class="step-body">
      <p><strong>Section Metadata</strong> is a block you place at the bottom of a
      section — not the bottom of the page — to configure that section's appearance.</p>
      <p>It is a two-column table like the page Metadata block, but only affects the
      section it sits in:</p>
      <ul>
        <li><code>style</code> — CSS class(es) added to the section wrapper element</li>
        <li><code>background</code> — background color or image URL for the section</li>
      </ul>
      <div class="tip-box">You can have multiple section-metadata blocks on one page —
      one per section that needs custom styling. The page-level Metadata block is
      different: one per page, always last.</div>
      <details class="advanced-toggle">
        <summary>&#9733; Power Author</summary>
        <div class="adv-body">
          <p>Multiple style values are space-separated in one cell:
          <code>disclosures numbered</code>. These become classes on the section
          element. Your site CSS defines what each class does — check
          <code>styles/styles.css</code> in the repo for the full list of
          project-specific section styles.</p>
        </div>
      </details>
    </div>`,
  });

  // 13 — Fragments
  steps.push({
    emoji: '🔗',
    heading: 'Reusable Fragments',
    html: `<div class="step-body">
      <p>A <strong>Fragment</strong> is a reusable chunk of content stored as its own DA
      page, embedded into other pages by reference. When the page renders, the fragment
      content is fetched and injected in place.</p>
      <p>To embed a fragment, add a <strong>Fragment block</strong> containing the path
      to the fragment page (no domain, no .html extension):</p>
      ${uiDiagram([
        '┌──────────────────────────────────┐',
        '│ Fragment                         │  ← block name cell',
        '├──────────────────────────────────┤',
        '│ /demo/disclosures/disclosure-1   │  ← path to the fragment page',
        '└──────────────────────────────────┘',
      ])}
      <p>In the editor the block just shows the path. On preview and live, the full
      fragment content renders in its place.</p>
      <div class="warn-box">Fragment pages must be published independently before they
      render on live. If a fragment shows as a bare path on your live page, it has not
      been published yet.</div>
      <details class="advanced-toggle">
        <summary>&#9733; Power Author</summary>
        <div class="adv-body">
          <p>Fragments are full DA pages — they can contain any blocks, headings,
          or text. Changes to a fragment page propagate to every page that embeds it
          after the next publish of the fragment.</p>
          <p>This site uses fragments for legal disclosures: each disclosure is its own
          page at <code>/demo/disclosures/disclosure-N</code> and embedded via fragment
          blocks in the footer section of content pages.</p>
        </div>
      </details>
    </div>`,
  });

  // 14 — Structured Content
  steps.push({
    emoji: '🗃',
    heading: 'Structured Content',
    html: `<div class="step-body">
      <p><strong>Structured Content</strong> is DA's schema-driven form authoring system.
      Instead of a freeform page, a structured content document has defined fields
      with types, constraints, and validation.</p>
      <p>How it works:</p>
      <ul>
        <li>A <strong>JSON Schema</strong> defines the fields (name, type, required, etc.)
        and is stored at <code>/.da/forms/schemas/{name}.html</code></li>
        <li>Authors open documents via the <strong>form editor</strong>:
        <code>da.live/form#/org/repo/path</code> — a form UI generated from the schema</li>
        <li>On publish, the document is delivered as an <strong>edge JSON endpoint</strong>
        at <code>/path.json</code> — ready for any front-end to consume</li>
      </ul>
      ${uiDiagram([
        '  Schema (.da/forms/schemas/product.html)',
        '       |',
        '       v',
        '  Form editor (da.live/form#/org/repo/products/p1)',
        '       |',
        '       v',
        '  Published JSON (main--site--org.aem.live/products/p1.json)',
      ])}
      <details class="advanced-toggle">
        <summary>&#9733; Power Author</summary>
        <div class="adv-body">
          <p>The schema is authored as a JSON Schema draft-07 document. The AI can
          generate schemas from a description: <em>"Create a schema for a product
          card with title, description, price, and an optional image URL."</em></p>
          <p>Structured content documents can be validated against their schema before
          publish — the AI uses the <code>sc_validate_document</code> MCP tool to
          check all fields and report errors.</p>
          <p>The form editor URL uses the <code>/form</code> route, not <code>/edit</code>.
          Share the <code>/form</code> URL with non-technical contributors so they see
          a clean form instead of a raw HTML editor.</p>
        </div>
      </details>
    </div>`,
  });

  // 15 — Preview and Publish
  steps.push({
    emoji: '🚀',
    heading: 'Preview and Publish',
    html: `<div class="step-body">
      <p>Content in the editor is a draft. It is not visible on the live site until
      you Preview then Publish. There are two ways to do this:</p>
      <p><strong>Option A — Send button (in the editor):</strong></p>
      ${uiDiagram([
        '┌──────────────────────────────────────────┐',
        '│  Page title                   [Send ▼]   │  ← top right of editor',
        '│                                           │',
        '│  Send dropdown:                           │',
        '│    Preview                                │',
        '│    Publish                                │',
        '│    (Unpublish)                            │',
        '└──────────────────────────────────────────┘',
      ])}
      <p><strong>Option B — Sidekick browser extension:</strong> Adds Preview/Publish
      buttons when you're viewing your <code>.aem.page</code> or <code>.aem.live</code>
      URL in the browser. Required for auth-gated pages and some advanced operations.</p>
      <div class="warn-box">Publish always takes the <em>last previewed version</em>.
      Always Preview after every edit before Publishing — even small changes.</div>
      <details class="advanced-toggle">
        <summary>&#9733; Power Author</summary>
        <div class="adv-body">
          <p>The AI can also Preview and Publish via MCP: <em>"Preview and publish
          this page"</em>. For scheduling: <em>"Publish this page tomorrow at 9 AM PST"</em>
          — the AI resolves your timezone and queues a scheduled publish.</p>
          <p><strong>Auth-gated pages</strong> (pages requiring login to view) can only
          be previewed through the Sidekick extension when you are authenticated in your
          browser. The Send button in DA still works for publishing regardless.</p>
          <p>The AI assistant has full publish URLs after a successful publish and will
          share the <code>.aem.live</code> link with you directly.</p>
        </div>
      </details>
    </div>`,
  });

  return steps;
}

// ── Apps and Extensions step (standalone, used in browse tour too) ────────────
function appsAndExtensionsStep() {
  return {
    emoji: '🔧',
    heading: 'Apps and Extensions',
    html: `<div class="step-body">
      <p>DA has two distinct extensibility surfaces — they look similar but do
      different things:</p>
      <p><strong>Apps</strong> — accessed via the grid icon in the top-right of the
      editor chrome:</p>
      ${uiDiagram([
        '┌──────────────────────────────────────────┐',
        '│  [grid ⊞]  ← click this for Apps        │',
        '├──────────────────────────────────────────┤',
        '│  Apps panel:                             │',
        '│    Translation                           │',
        '│    User Admin                            │',
        '│    (+ any custom apps built for DA)      │',
        '└──────────────────────────────────────────┘',
      ])}
      <p><strong>Extensions / Plugins</strong> — accessed via the
      <strong>right-side dropdown</strong> (defaults to Outline):</p>
      ${uiDiagram([
        '┌──────────────────────────────────────────┐',
        '│                        [Outline ▼]       │  ← top right of canvas',
        '├──────────────────────────────────────────┤',
        '│  Dropdown options:                       │',
        '│    WYSIWYG                               │',
        '│    Outline   (default)                   │',
        '│    ── custom extensions ──               │',
        '│    Diagram Editor                        │',
        '│    Disclosure Picker                     │',
        '│    Workspace Tour  ← (this panel)        │',
        '│    ...anything your team registers       │',
        '└──────────────────────────────────────────┘',
      ])}
      <p>Extensions in the dropdown are project-specific. Different sites will have
      completely different lists depending on what has been built and registered.</p>
      <details class="advanced-toggle">
        <summary>&#9733; Power Author</summary>
        <div class="adv-body">
          <p>Plugins (Extensions) are registered in <code>/.da/config</code> under
          the <code>plugins</code> key. Each plugin is an HTML+JS file committed to
          GitHub. It loads as an iframe inside the dropdown panel and communicates
          with the editor via the DA SDK (<code>import DA_SDK from
          'https://da.live/nx/utils/sdk.js'</code>).</p>
          <p>The SDK gives plugins access to: page context, authenticated fetch,
          inserting HTML at cursor, setting the page URL, and more. Plugins
          <strong>cannot</strong> write back to the full page directly — inserts at
          cursor only.</p>
        </div>
      </details>
    </div>`,
  };
}

// ── WYSIWYG Quirks step ────────────────────────────────────────────────────────
function wysiwygQuirksStep() {
  return {
    emoji: '⚠️',
    heading: 'WYSIWYG Quirks to Know',
    html: `<div class="step-body">
      <p>Several things look different in the editor vs on your live page:</p>
      <ul>
        <li><strong>Anchor IDs:</strong> EDS auto-generates <code>id</code> attributes on
        headings from their text content. Any <code>id</code> you author is overwritten
        on publish. To scroll-link to a heading, compute its slug:
        <em>"How It Works"</em> becomes <code>#how-it-works</code>.</li>
        <li><strong>Icon spans:</strong> <code>&lt;span class="icon icon-name"&gt;</code>
        shows as text in the editor but renders as an SVG icon on the live page.</li>
        <li><strong>Fragments:</strong> Show as a bare path in the editor. On preview
        and live they render as their full content.</li>
        <li><strong>Block rendering:</strong> Blocks in WYSIWYG show a simplified table
        view. Use Preview to see the real component output.</li>
      </ul>
      <div class="tip-box">When in doubt, Preview. The preview URL at
      <code>.aem.page</code> shows exactly what will go live.</div>
    </div>`,
  };
}

// ── Browse Tour ───────────────────────────────────────────────────────────────
function buildBrowseTour() {
  return [
    {
      emoji: '📁',
      heading: 'Browse View',
      html: `<div class="step-body">
        <p>Browse view is the site file system. Every HTML page, sheet, image, and folder
        is listed here. Click a file to open it. Right-click or use the menu for rename,
        move, copy, and delete.</p>
        ${uiDiagram([
          '  DA Browse  /org/repo',
          '  ├── 📄 index.html',
          '  ├── 📁 demo/',
          '  │    ├── 📄 authoring.html',
          '  │    └── 📁 disclosures/',
          '  ├── 📊 nav.html',
          '  └── 📁 tools/',
        ])}
        <div class="tip-box">Use the search bar at the top to find any page by name
        across the entire site instantly.</div>
      </div>`,
    },
    {
      emoji: '✨',
      heading: 'Creating a New Page',
      html: `<div class="step-body">
        <p>Click <strong>+ New</strong> in Browse to create a page. Options:</p>
        <ul>
          <li><strong>Blank page</strong> — empty editor canvas</li>
          <li><strong>From template</strong> — choose a pre-built layout</li>
          <li><strong>Via AI:</strong> open the chat and say
          <em>"Create a campaign landing page for summer sale at /campaigns/summer"</em>
          — the AI creates, populates, and saves the file</li>
        </ul>
        <div class="tip-box">Use templates when you have a defined structure. Use the AI
        for rapid first drafts.</div>
      </div>`,
    },
    appsAndExtensionsStep(),
    {
      emoji: '📊',
      heading: 'Sheets',
      html: `<div class="step-body">
        <p>Sheets (<code>.json</code> files edited as spreadsheets) power dynamic
        EDS content: navigation, redirects, placeholders, query indexes, and config.</p>
        <ul>
          <li><code>/query-index.json</code> — auto-generated page index (do not edit)</li>
          <li><code>/redirects.json</code> — URL redirect rules</li>
          <li><code>/placeholders.json</code> — localizable strings for block JS</li>
          <li><code>/.da/config</code> — site config (library, plugins, skills)</li>
        </ul>
        <div class="warn-box">Sheets must be Previewed and Published like pages. Editing
        a sheet in DA does not immediately update the JSON endpoint on the live site.</div>
        <details class="advanced-toggle">
          <summary>&#9733; Power Author</summary>
          <div class="adv-body">
            <p>Sheets support multi-tab workbooks. Each tab is accessible via
            <code>?sheet=tabname</code> on the JSON URL. The DA config uses this pattern
            with separate tables for library, plugins, and skills.</p>
          </div>
        </details>
      </div>`,
    },
    {
      emoji: '🖼',
      heading: 'Managing Media',
      html: `<div class="step-body">
        <p>Upload images by dragging them into the editor, or by uploading directly in
        Browse view. Conventions for where to store them:</p>
        <ul>
          <li>Page-specific images: a dot-folder named after the page —
          <code>/demo/.my-page/hero.jpg</code></li>
          <li>Shared media: <code>/media/image.jpg</code></li>
        </ul>
        <p>Always add descriptive <code>alt</code> text. EDS serves images through its
        CDN and applies automatic resizing — always use relative paths or
        <code>content.da.live</code> URLs, not external image hosts.</p>
      </div>`,
    },
    {
      emoji: '🔒',
      heading: 'Permissions',
      html: `<div class="step-body">
        <p>Access is controlled at org, site, and folder level:</p>
        <ul>
          <li><strong>Read</strong> — view and open files</li>
          <li><strong>Write</strong> — create, edit, delete</li>
          <li><strong>None</strong> — explicit deny, overrides inherited access</li>
        </ul>
        <p>Folder-level permissions let you grant a contributor write access to only
        one section of the site without giving them access to everything.</p>
        <details class="advanced-toggle">
          <summary>&#9733; Power Author</summary>
          <div class="adv-body">
            <p>Ask the AI to manage permissions:
            <em>"Grant write access to user@example.com for the /blog folder."</em>
            The AI calls the permissions MCP tool directly.</p>
          </div>
        </details>
      </div>`,
    },
    {
      emoji: '📅',
      heading: 'Scheduled Publishing',
      html: `<div class="step-body">
        <p>Pages can be scheduled to publish at a future date and time.</p>
        <p>Ask the AI (in chat, from any view):</p>
        <p style="
          font-style: italic; background: #f4f4f4; padding: 6px 10px;
          border-radius: 4px; font-size: 12px;
        ">"Schedule /demo/summer-campaign to publish on June 25 at 9 AM PST"</p>
        <p>The AI resolves your timezone, confirms the exact UTC time, then queues
        the publish. You can also ask <em>"What is scheduled this week?"</em> or
        <em>"Cancel the scheduled publish for /demo/summer-campaign."</em></p>
      </div>`,
    },
  ];
}

// ── Sheets Tour ───────────────────────────────────────────────────────────────
function buildSheetsTour() {
  return [
    {
      emoji: '📊',
      heading: 'Sheets — EDS Data Layer',
      html: `<div class="step-body">
        <p>Sheets are spreadsheet-style data files that power the dynamic parts of an EDS
        site. Any <code>.json</code> document in your site is a Sheet. Edit them in DA
        just like pages — the spreadsheet editor opens automatically.</p>
        <p>Common system sheets:</p>
        <ul>
          <li><code>/query-index.json</code> — auto-built page index (read-only)</li>
          <li><code>/redirects.json</code> — URL redirect rules</li>
          <li><code>/placeholders.json</code> — localizable string tokens</li>
          <li><code>/paths.json</code> — path-based config overrides</li>
        </ul>
      </div>`,
    },
    {
      emoji: '🗂',
      heading: 'Multi-Tab Workbooks',
      html: `<div class="step-body">
        <p>A sheet file can have multiple named tabs. Each tab is accessible via
        <code>?sheet=tabname</code> on the JSON URL.</p>
        <p>Example: <code>/.da/config</code> has separate tabs for
        <code>library</code>, <code>plugins</code>, and <code>skills</code> — all
        served from one file.</p>
        <details class="advanced-toggle">
          <summary>&#9733; Power Author</summary>
          <div class="adv-body">
            <p>Omit the <code>?sheet=</code> parameter to get all tabs as a single JSON
            object with tab names as keys. Use <code>?sheet=data</code> for the default
            main data table when no tab name is specified.</p>
          </div>
        </details>
      </div>`,
    },
    {
      emoji: '🧠',
      heading: 'AI-Assisted Sheet Editing',
      html: `<div class="step-body">
        <p>The AI can read and update sheets on your behalf. Examples:</p>
        <ul>
          <li><em>"Add a redirect from /old-page to /new-page"</em></li>
          <li><em>"Update the cta-label placeholder to Get Started"</em></li>
          <li><em>"Show me all skills in the config"</em></li>
          <li><em>"Add a new skill called brand-voice-check"</em></li>
        </ul>
        <div class="tip-box">The AI reads the current sheet content first, makes the
        minimal change, and confirms before writing. You are always in control.</div>
      </div>`,
    },
    {
      emoji: '🚀',
      heading: 'Publishing Sheets',
      html: `<div class="step-body">
        <p>Sheets must be previewed and published just like pages. The JSON endpoint
        only updates after a publish.</p>
        <div class="warn-box">Editing a sheet in DA does not immediately update the live
        <code>.json</code> URL. After every sheet change: Preview then Publish — via the
        Send button in the sheet editor, the Sidekick extension, or by asking the AI.</div>
      </div>`,
    },
    {
      emoji: '🗃',
      heading: 'Structured Content (Schema-Driven)',
      html: `<div class="step-body">
        <p>Beyond freeform sheets, DA supports <strong>Structured Content</strong> — 
        schema-driven form documents with typed fields, validation, and a clean
        form editor UI.</p>
        <ul>
          <li>A JSON Schema at <code>/.da/forms/schemas/{name}.html</code> defines
          the fields</li>
          <li>Authors open documents at
          <code>da.live/form#/org/repo/path</code> — a form UI, not raw HTML</li>
          <li>On publish: delivers as an edge JSON endpoint at
          <code>/path.json</code></li>
        </ul>
        <div class="tip-box">Share the <code>/form</code> URL with non-technical
        contributors so they see a clean form instead of a raw editor.</div>
        <details class="advanced-toggle">
          <summary>&#9733; Power Author</summary>
          <div class="adv-body">
            <p>The AI can generate schemas from a description, validate documents
            before publish, and serialize form data into the correct DA HTML format.
            Ask: <em>"Create a schema for a product card with title, price, and
            optional image."</em></p>
          </div>
        </details>
      </div>`,
    },
  ];
}

// ── Tour registry ─────────────────────────────────────────────────────────────
function getTourRegistry(hasBlocks, hasTemplates) {
  return [
    {
      id: 'page-editor',
      icon: '📝',
      title: 'Page Editor',
      description: 'AI chat, Skills, blocks, sections, metadata, fragments, and publish.',
      steps: buildPageEditorTour(hasBlocks, hasTemplates),
    },
    {
      id: 'browse',
      icon: '📁',
      title: 'Browse & Site Management',
      description: 'Creating pages, media, permissions, sheets, and scheduled publishing.',
      steps: buildBrowseTour(),
    },
    {
      id: 'sheets',
      icon: '📊',
      title: 'Sheets & Structured Data',
      description: 'System sheets, multi-tab workbooks, AI editing, structured content.',
      steps: buildSheetsTour(),
    },
  ];
}

// ── Controller ────────────────────────────────────────────────────────────────
function createController(tours) {
  let activeTour = null;
  let currentStep = 0;
  const visitedSteps = new Set();

  const launcher = document.getElementById('launcher');
  const tourPanel = document.getElementById('tour-panel');
  const tourList = document.getElementById('tour-list');
  const tpTourIcon = document.getElementById('tp-tour-icon');
  const tpTitleText = document.getElementById('tp-title-text');
  const tpStepCount = document.getElementById('tp-step-count');
  const tpDots = document.getElementById('tp-dots');
  const tpContent = document.getElementById('tp-content');
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const btnClose = document.getElementById('btn-close');
  const btnDna = document.getElementById('btn-dna');
  const btnAllTours = document.getElementById('btn-all-tours');
  const btnResetAll = document.getElementById('btn-reset-all');

  function renderLauncher() {
    tourList.innerHTML = '';
    tours.forEach((tour) => {
      const done = isTourVisited(tour.id);
      const dismissed = isTourDismissed(tour.id);
      const card = document.createElement('div');
      card.className = `tour-card${done ? ' completed' : ''}`;
      card.setAttribute('role', 'listitem');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', `${tour.title} tour${done ? ', completed' : ''}`);

      const icon = document.createElement('span');
      icon.className = 'tour-card-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = tour.icon;

      const body = document.createElement('span');
      body.className = 'tour-card-body';

      const titleEl = document.createElement('span');
      titleEl.className = 'tour-card-title';
      titleEl.textContent = tour.title;

      const descEl = document.createElement('span');
      descEl.className = 'tour-card-desc';
      descEl.textContent = tour.description;

      body.appendChild(titleEl);
      body.appendChild(descEl);

      const badge = document.createElement('span');
      let badgeText = 'New';
      let badgeClass = 'tour-badge new';
      if (done) { badgeText = '✓ Done'; badgeClass = 'tour-badge done'; }
      else if (dismissed) { badgeText = 'Skipped'; badgeClass = 'tour-badge done'; }
      badge.className = badgeClass;
      badge.textContent = badgeText;

      card.appendChild(icon);
      card.appendChild(body);
      card.appendChild(badge);

      card.addEventListener('click', () => startTour(tour));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startTour(tour); }
      });
      tourList.appendChild(card);
    });
  }

  function startTour(tour) {
    activeTour = tour;
    currentStep = 0;
    visitedSteps.clear();
    visitedSteps.add(0);
    launcher.style.display = 'none';
    tourPanel.classList.add('visible');
    renderStep();
    tpContent.focus();
  }

  function closeTour() {
    tourPanel.classList.remove('visible');
    launcher.style.display = 'flex';
    activeTour = null;
    renderLauncher();
    btnResetAll.focus();
  }

  function renderDots() {
    tpDots.innerHTML = '';
    activeTour.steps.forEach((_, i) => {
      const dot = document.createElement('button');
      let cls = 'tp-dot';
      if (i === currentStep) cls += ' active';
      else if (visitedSteps.has(i)) cls += ' visited';
      dot.className = cls;
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', `Step ${i + 1}`);
      dot.setAttribute('aria-selected', i === currentStep ? 'true' : 'false');
      dot.addEventListener('click', () => {
        currentStep = i;
        visitedSteps.add(i);
        renderStep();
      });
      tpDots.appendChild(dot);
    });
  }

  function renderStep() {
    if (!activeTour) return;
    const step = activeTour.steps[currentStep];
    const total = activeTour.steps.length;
    tpTourIcon.textContent = activeTour.icon;
    tpTitleText.textContent = activeTour.title;
    tpStepCount.textContent = `${currentStep + 1} / ${total}`;
    renderDots();
    tpContent.innerHTML = `
      <span class="step-emoji" aria-hidden="true">${step.emoji}</span>
      <h2 class="step-heading">${step.heading}</h2>
      ${step.html}
    `;
    btnPrev.disabled = currentStep === 0;
    if (currentStep === total - 1) {
      btnNext.textContent = 'Finish \u2713';
      btnNext.setAttribute('aria-label', 'Finish tour');
    } else {
      btnNext.textContent = 'Next \u2192';
      btnNext.setAttribute('aria-label', 'Next step');
    }
  }

  function goNext() {
    if (!activeTour) return;
    if (currentStep < activeTour.steps.length - 1) {
      currentStep += 1;
      visitedSteps.add(currentStep);
      renderStep();
    } else {
      markTourVisited(activeTour.id);
      closeTour();
    }
  }

  function goPrev() {
    if (!activeTour || currentStep === 0) return;
    currentStep -= 1;
    renderStep();
  }

  btnNext.addEventListener('click', goNext);
  btnPrev.addEventListener('click', goPrev);
  btnClose.addEventListener('click', closeTour);
  btnAllTours.addEventListener('click', closeTour);
  btnDna.addEventListener('click', () => {
    if (!activeTour) return;
    markTourDismissed(activeTour.id);
    closeTour();
  });
  btnResetAll.addEventListener('click', () => {
    resetAllTours();
    renderLauncher();
  });

  document.addEventListener('keydown', (e) => {
    if (!activeTour) return;
    if (e.key === 'Escape') { closeTour(); return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); return; }
    if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
  });

  return { renderLauncher, startTour };
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
(async () => {
  const { context } = await DA_SDK;
  const { org, repo } = context;

  let hasBlocks = false;
  let hasTemplates = false;

  try {
    const r = await fetch(
      `https://content.da.live/${org}/${repo}/tools/sidekick/library/blocks.json`,
    );
    hasBlocks = r.ok;
  } catch { /* silent */ }

  try {
    const r = await fetch(
      `https://content.da.live/${org}/${repo}/tools/sidekick/library/templates.json`,
    );
    hasTemplates = r.ok;
  } catch { /* silent */ }

  const tours = getTourRegistry(hasBlocks, hasTemplates);
  const ctrl = createController(tours);
  ctrl.renderLauncher();

  const view = context.view || '';
  if (view === 'edit' && !isTourDismissed('page-editor') && !isTourVisited('page-editor')) {
    const editorTour = tours.find((t) => t.id === 'page-editor');
    if (editorTour) ctrl.startTour(editorTour);
  }
})();
