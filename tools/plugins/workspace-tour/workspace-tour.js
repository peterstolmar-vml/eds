/* eslint-disable import/no-unresolved */
import DA_SDK from 'https://da.live/nx/utils/sdk.js';

// ── Storage helpers ──────────────────────────────────────────────────────────
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

function isTourVisited(tourId) {
  return !!loadStore()[tourId]?.visited;
}

function resetAllTours() {
  localStorage.removeItem(STORE_KEY);
}

// ── Tour definitions ──────────────────────────────────────────────────────────
function buildPageEditorTour(hasBlocks, hasTemplates) {
  const steps = [];

  steps.push({
    emoji: '👋',
    heading: 'Welcome to the Page Editor',
    html: `
      <div class="step-body">
        <p>This is your <strong>Document Authoring (DA) workspace</strong> — a collaborative, 
        real-time page editor built on top of Edge Delivery Services (EDS).</p>
        <p>This tour covers the core editing concepts so you can author pages confidently.
        Use <strong>Next / Back</strong> to move through the steps, or click any dot above.</p>
        <div class="tip-box">&#128161; Press <strong>Escape</strong> to close the tour at any time — 
        you can reopen it from this panel.</div>
      </div>`,
  });

  steps.push({
    emoji: '📐',
    heading: 'Two Ways to Author',
    html: `
      <div class="step-body">
        <p>DA gives you two authoring modes — you can switch freely:</p>
        <ul>
          <li><strong>WYSIWYG (default):</strong> Rich text, drag-and-drop blocks, visual editing. 
          What you see closely reflects your live page.</li>
          <li><strong>Block Mode / Outline:</strong> Structural view — see and reorder Sections, 
          Blocks, and Metadata as a tree. Best for advanced restructuring.</li>
        </ul>
        <div class="tip-box">&#128204; The toggle is in the toolbar. Try switching to 
        <strong>Outline</strong> to see how your page sections are structured.</div>
        <details class="advanced-toggle">
          <summary>&#x2605; Power Author</summary>
          <div class="adv-body">
            <p>In <strong>Outline view</strong> you can drag entire Sections above and below each other —
            much faster than selecting all content in WYSIWYG. This is the recommended approach for 
            reordering large sections of a page.</p>
            <p>Outline also exposes the raw block table structure, letting you see every row and 
            column of a block at a glance before committing to a visual edit.</p>
          </div>
        </details>
      </div>`,
  });

  steps.push({
    emoji: '📦',
    heading: 'Sections — The Building Blocks of Pages',
    html: `
      <div class="step-body">
        <p>Every page is divided into <strong>Sections</strong>, separated by horizontal rules 
        (<code>---</code>) in the document.</p>
        <p>Each section renders independently on your live page and can have its own 
        styling, background, or layout via <strong>section-metadata</strong>.</p>
        <div class="warn-box">&#9888; A common WYSIWYG quirk: you can&#39;t always drag content 
        across section boundaries visually. Use <strong>Outline view</strong> to reorder sections 
        or move blocks between them.</div>
        <details class="advanced-toggle">
          <summary>&#x2605; Power Author</summary>
          <div class="adv-body">
            <p>Add a <code>section-metadata</code> block at the bottom of any section to control 
            its style (e.g. <code>style: dark</code>, <code>background: #f0f</code>). 
            This is the correct EDS pattern — never use inline styles on content.</p>
            <p>Sections with <code>style: disclosures</code> or 
            <code>style: numbered</code> are used for legal disclosure regions and 
            render with different visual treatment.</p>
          </div>
        </details>
      </div>`,
  });

  if (hasBlocks) {
    steps.push({
      emoji: '🧱',
      heading: 'Block Library',
      html: `
        <div class="step-body">
          <p>Your site has a <strong>Block Library</strong> — pre-built, reusable content 
          components (Hero, Cards, Columns, Diagrams, and more).</p>
          <p>To insert a block: click the <strong>Blocks</strong> icon in the left sidebar, 
          browse by category, hover for a live preview, then click to insert at your cursor.</p>
          <div class="tag-row">
            <span class="tag">Hero</span>
            <span class="tag">Cards</span>
            <span class="tag">Columns</span>
            <span class="tag">Diagram Editor</span>
            <span class="tag green">+ more</span>
          </div>
          <div class="tip-box">&#128161; Blocks are just <strong>tables</strong> under the hood —
          each row is a content row, each column is a column in the layout. 
          EDS transforms them into components on your live page.</div>
          <details class="advanced-toggle">
            <summary>&#x2605; Power Author</summary>
            <div class="adv-body">
              <p>Block variants are specified as additional class names in the block header cell —
              e.g. <code>cards full-width</code> or <code>hero dark</code>. In Outline view 
              you can directly edit the block name cell to change or add variants without 
              re-inserting the block from the library.</p>
              <p>The block library is managed at 
              <code>/tools/sidekick/library/blocks.json</code>. Ask an admin to add new 
              block variants there.</p>
            </div>
          </details>
        </div>`,
    });
  }

  if (hasTemplates) {
    steps.push({
      emoji: '📋',
      heading: 'Page Templates',
      html: `
        <div class="step-body">
          <p>Start a new page faster with <strong>Templates</strong> — pre-structured pages 
          with placeholder content ready to fill in.</p>
          <p>When creating a new page, choose <strong>New from Template</strong> from the 
          browse view. Your available templates include landing pages, campaign pages, 
          and the advanced authoring layout.</p>
          <div class="tag-row">
            <span class="tag">Landing Page</span>
            <span class="tag">Advanced Landing Page</span>
          </div>
          <details class="advanced-toggle">
            <summary>&#x2605; Power Author</summary>
            <div class="adv-body">
              <p>Templates live at <code>/tools/sidekick/templates/</code>. 
              You can create your own template by authoring a page with your desired structure, 
              then registering its path in 
              <code>/tools/sidekick/library/templates.json</code>.</p>
              <p>Template pages support placeholder text like 
              <code>[Headline here]</code> — authors see these as hints and replace them 
              with real content. There is no formal placeholder syntax, so use 
              bracketed hints as a convention.</p>
            </div>
          </details>
        </div>`,
    });
  }

  steps.push({
    emoji: '🏷',
    heading: 'Metadata — SEO & Social',
    html: `
      <div class="step-body">
        <p>Every page should have a <strong>Metadata block</strong> — a special table at the 
        very end of your document that controls SEO and social sharing.</p>
        <p>Key metadata fields:</p>
        <ul>
          <li><strong>title</strong> — browser tab &amp; search result title</li>
          <li><strong>description</strong> — search result snippet (155 chars max)</li>
          <li><strong>og:image</strong> — social share image URL</li>
          <li><strong>og:title / og:description</strong> — social share overrides</li>
        </ul>
        <div class="warn-box">&#9888; Without a metadata block, EDS will infer the page title 
        from your H1 — but description and OG image will be missing, which hurts SEO and 
        social sharing.</div>
        <details class="advanced-toggle">
          <summary>&#x2605; Power Author</summary>
          <div class="adv-body">
            <p>You can also set <code>robots</code> (e.g. <code>noindex</code>), 
            <code>canonical</code> URL overrides, and custom <code>json-ld</code> 
            for structured data — all as rows in the same metadata block.</p>
            <p>The metadata block must be in the <strong>last section</strong> of the page 
            to guarantee EDS picks it up correctly.</p>
          </div>
        </details>
      </div>`,
  });

  steps.push({
    emoji: '📎',
    heading: 'Section Metadata',
    html: `
      <div class="step-body">
        <p><strong>Section Metadata</strong> is a block you place at the bottom of a section 
        to configure that section&#39;s appearance and behavior.</p>
        <p>Common uses:</p>
        <ul>
          <li><code>style</code> — CSS class names applied to the section element</li>
          <li><code>background</code> — background color or image URL</li>
          <li><code>layout</code> — layout hint for the section</li>
        </ul>
        <div class="tip-box">&#128204; This is different from the page-level Metadata block — 
        section-metadata only affects the one section it&#39;s in, and can appear multiple 
        times on a page.</div>
        <details class="advanced-toggle">
          <summary>&#x2605; Power Author</summary>
          <div class="adv-body">
            <p>The <code>disclosures</code> and <code>numbered</code> style values 
            are project-specific conventions defined in your site CSS. Inspect 
            <code>styles/styles.css</code> on GitHub to see what custom section styles 
            your team has defined.</p>
            <p>Section metadata values are passed directly as <code>data-*</code> 
            attributes on the section element, making them available to block JS 
            if needed.</p>
          </div>
        </details>
      </div>`,
  });

  steps.push({
    emoji: '⌨️',
    heading: 'WYSIWYG Quirks to Know',
    html: `
      <div class="step-body">
        <p>A few things that behave differently in the editor vs on your live page:</p>
        <ul>
          <li><strong>Anchor IDs:</strong> EDS auto-generates <code>id</code> attributes on 
          headings from their text — any authored id is overwritten on publish.</li>
          <li><strong>Icon spans:</strong> <code>&lt;span class="icon icon-name"&gt;</code> 
          renders as the SVG icon on live, but shows as text in the editor.</li>
          <li><strong>Fragments:</strong> Fragment blocks show the content path in the editor 
          but render the full fragment HTML on live — preview to see the real output.</li>
          <li><strong>Section dividers:</strong> Horizontal rules create new sections on live 
          but are subtle in WYSIWYG.</li>
        </ul>
        <div class="tip-box">&#128161; <strong>Always Preview</strong> before publishing — 
        the preview URL shows the true rendered output with all blocks and fragments resolved.</div>
      </div>`,
  });

  steps.push({
    emoji: '🗂',
    heading: 'Outline View & Reordering',
    html: `
      <div class="step-body">
        <p><strong>Outline view</strong> shows your page as a structured tree of Sections, 
        Blocks, and content nodes — perfect for restructuring.</p>
        <p>Things you can do in Outline view that are awkward in WYSIWYG:</p>
        <ul>
          <li>Drag entire sections up or down</li>
          <li>See block names and variant classes at a glance</li>
          <li>Edit the block header cell to rename a block or add/remove variants</li>
          <li>Spot orphaned content outside blocks</li>
        </ul>
        <div class="warn-box">&#9888; Dragging in Outline moves entire subtrees. 
        Be careful not to accidentally drag a section inside another section&#39;s block.</div>
        <details class="advanced-toggle">
          <summary>&#x2605; Power Author</summary>
          <div class="adv-body">
            <p>The keyboard shortcut <strong>Ctrl/Cmd + Shift + O</strong> (if available 
            in your DA version) toggles Outline view. In Outline, 
            <strong>Alt+Up/Down</strong> moves nodes without drag-and-drop.</p>
            <p>Use Outline to add a <code>section-metadata</code> block to a section 
            that already has complex content — insert it at the correct position 
            (always last in section) without disturbing the visual layout.</p>
          </div>
        </details>
      </div>`,
  });

  steps.push({
    emoji: '✨',
    heading: 'AI-Assisted Authoring — The + Button',
    html: `
      <div class="step-body">
        <p>The <strong>+ button</strong> in the editor toolbar opens the AI prompt panel, 
        letting you generate or edit content with natural language.</p>
        <p>You can:</p>
        <ul>
          <li>Ask it to <em>"Write a hero section for a product launch"</em></li>
          <li>Select text and ask it to <em>"Rewrite this in a more professional tone"</em></li>
          <li>Ask it to <em>"Convert this paragraph into a bullet list"</em></li>
          <li>Generate metadata descriptions from your page content</li>
        </ul>
        <div class="tip-box">&#128161; The AI operates in context — it sees your current 
        document. Be specific about block types, section position, and tone for best results.</div>
      </div>`,
  });

  steps.push({
    emoji: '🧠',
    heading: 'Skills — Reusable AI Workflows',
    html: `
      <div class="step-body">
        <p><strong>Skills</strong> are saved, named AI workflows stored in your site config. 
        They capture specific, repeatable tasks — like an SEO audit, safe-edit with versioning, 
        or wiring a block into the library.</p>
        <p>Skills appear in the AI assistant panel. Select a skill and it runs its full 
        step-by-step workflow, using site context automatically.</p>
        <div class="tag-row">
          <span class="tag">SEO Audit</span>
          <span class="tag">Safe Edit + Version</span>
          <span class="tag">New Page from Template</span>
          <span class="tag orange">+ custom skills</span>
        </div>
        <details class="advanced-toggle">
          <summary>&#x2605; Power Author</summary>
          <div class="adv-body">
            <p>Skills are stored in your <code>/.da/config</code> sheet under the 
            <code>skills</code> table. Each skill has an ID and a full Markdown body 
            describing the workflow steps, which the AI follows literally.</p>
            <p>You can author a skill by describing a workflow in natural language to the 
            AI assistant and asking it to <em>"save this as a skill"</em> — it will 
            write it to config for you.</p>
          </div>
        </details>
      </div>`,
  });

  steps.push({
    emoji: '🔌',
    heading: 'MCP Servers — AI Superpowers',
    html: `
      <div class="step-body">
        <p><strong>MCP (Model Context Protocol) servers</strong> extend the AI assistant 
        with live, tool-based capabilities beyond text generation.</p>
        <p>Connected MCP servers can:</p>
        <ul>
          <li>Publish, preview, and schedule pages programmatically</li>
          <li>Manage permissions and access control</li>
          <li>Look up governance/brand guidelines in real time</li>
          <li>Validate content against schemas</li>
          <li>Check SEO, compliance, and brand voice automatically</li>
        </ul>
        <div class="tip-box">&#128204; MCP servers are configured in your DA workspace 
        settings. Ask your admin which servers are available on this site.</div>
        <details class="advanced-toggle">
          <summary>&#x2605; Power Author</summary>
          <div class="adv-body">
            <p>MCP servers expose named <strong>tools</strong> the AI calls on your behalf. 
            When a skill references an MCP tool (e.g. <code>content_publish</code>), 
            the AI calls the real tool — not a simulation. This means 
            <strong>real publishes happen</strong> when you run a publishing skill.</p>
            <p>You can see available MCP tools by asking the AI 
            <em>"What MCP tools are available?"</em> in the assistant panel.</p>
          </div>
        </details>
      </div>`,
  });

  steps.push({
    emoji: '💾',
    heading: 'Storing Prompts for Reuse',
    html: `
      <div class="step-body">
        <p>Frequently used AI prompts can be saved and reused across sessions.</p>
        <p>Two ways to persist prompts:</p>
        <ul>
          <li><strong>As a Skill:</strong> Save a detailed workflow prompt as a named skill 
          in your site config — best for multi-step tasks.</li>
          <li><strong>Prompt library:</strong> The AI assistant can store short prompts 
          as named shortcuts you can invoke by name.</li>
        </ul>
        <div class="tip-box">&#128161; When you find yourself typing the same prompt 
        repeatedly, ask the AI to <em>"save this as a skill called [name]"</em> and it 
        will persist it to your config automatically.</div>
      </div>`,
  });

  steps.push({
    emoji: '🛠',
    heading: 'Apps & Plugins',
    html: `
      <div class="step-body">
        <p>The <strong>Apps</strong> button (grid icon in the sidebar) opens the Sidekick 
        Library — your panel of installed tools and plugins.</p>
        <p>Available panels on this site:</p>
        <ul>
          <li><strong>Blocks</strong> — insert pre-built blocks</li>
          <li><strong>Templates</strong> — start from a page template</li>
          <li><strong>Icons</strong> — insert icon spans</li>
          <li><strong>Disclosure Manager</strong> — manage legal disclosure ordering</li>
          <li><strong>Workspace Tour</strong> — this panel</li>
        </ul>
        <details class="advanced-toggle">
          <summary>&#x2605; Power Author</summary>
          <div class="adv-body">
            <p>Plugins are registered in your <code>/.da/config</code> sheet under the 
            <code>plugins</code> key. Each plugin is a separate MFE (Micro Frontend) 
            HTML page served from your site. The plugin HTML and JS 
            <strong>must be committed to GitHub</strong> — they can&#39;t be loaded 
            from the DA content API alone.</p>
            <p>Plugins use the DA SDK (<code>import DA_SDK from 
            &#39;https://da.live/nx/utils/sdk.js&#39;</code>) to communicate with the 
            editor — inserting HTML at cursor, reading page context, or making 
            authenticated fetch calls.</p>
          </div>
        </details>
      </div>`,
  });

  steps.push({
    emoji: '🚀',
    heading: 'Preview & Publish',
    html: `
      <div class="step-body">
        <p>Content in the editor is a <strong>draft</strong> — it&#39;s not live until you 
        Preview and Publish it.</p>
        <ul>
          <li><strong>Preview:</strong> Builds your page at the <code>.aem.page</code> URL — 
          shows the true rendered output with all blocks resolved. Share this URL for review.</li>
          <li><strong>Publish:</strong> Promotes the previewed version to 
          <code>.aem.live</code> — your production URL.</li>
        </ul>
        <div class="warn-box">&#9888; Publishing takes the <em>last previewed version</em> — 
        always Preview after every edit, even small ones, before Publishing.</div>
        <details class="advanced-toggle">
          <summary>&#x2605; Power Author</summary>
          <div class="adv-body">
            <p>You can schedule publishes for a future time using the AI assistant: 
            <em>"Schedule this page to publish tomorrow at 9 AM PST"</em> — the AI 
            will use the MCP scheduling tool to queue it.</p>
            <p>The <strong>Sidekick browser extension</strong> adds a preview/publish 
            button directly to your live page, so you can publish without returning 
            to the DA editor.</p>
          </div>
        </details>
      </div>`,
  });

  return steps;
}

function buildBrowseTour() {
  return [
    {
      emoji: '📁',
      heading: 'Browse View — Your Site at a Glance',
      html: `
        <div class="step-body">
          <p>The <strong>Browse view</strong> is your site file system — every HTML page, 
          sheet, media file, and folder is visible here.</p>
          <p>Click any file to open it in the editor. Click a folder to navigate into it. 
          Right-click (or use the &#8942; menu) for rename, move, copy, and delete.</p>
          <div class="tip-box">&#128161; Use the <strong>search bar</strong> at the top to 
          find any page by name across your entire site instantly.</div>
        </div>`,
    },
    {
      emoji: '✨',
      heading: 'Creating a New Page',
      html: `
        <div class="step-body">
          <p>Click the <strong>+ New</strong> button to create a page. You can:</p>
          <ul>
            <li>Start <strong>blank</strong> — an empty editor canvas</li>
            <li>Start <strong>from a Template</strong> — choose a pre-built layout</li>
            <li>Ask the <strong>AI assistant</strong> to create the page with content 
            (<em>"Create a campaign landing page for summer sale"</em>)</li>
          </ul>
          <div class="tip-box">&#128204; Use Templates when you have a defined structure. 
          Use the AI for rapid first drafts when starting from scratch.</div>
        </div>`,
    },
    {
      emoji: '📊',
      heading: 'Sheets — Structured Data',
      html: `
        <div class="step-body">
          <p><strong>Sheets</strong> (<code>.json</code> files) are spreadsheet-style data 
          files used by EDS to power dynamic content — navigation, redirects, placeholders, 
          and query indexes.</p>
          <p>Key sheets on this site:</p>
          <ul>
            <li><code>/query-index.json</code> — auto-generated index of all pages</li>
            <li><code>/nav.html</code> — main navigation (authored as a page)</li>
            <li><code>/.da/config</code> — site configuration (skills, plugins, library)</li>
          </ul>
          <details class="advanced-toggle">
            <summary>&#x2605; Power Author</summary>
            <div class="adv-body">
              <p>Sheets support multi-sheet workbooks. Each sheet tab becomes a named 
              key in the JSON response, accessible as <code>/your-sheet.json?sheet=name</code>. 
              This is how the DA config sheet works — it has separate tables for 
              library, plugins, and skills.</p>
            </div>
          </details>
        </div>`,
    },
    {
      emoji: '🖼',
      heading: 'Managing Media',
      html: `
        <div class="step-body">
          <p>Upload images and media via the <strong>Media</strong> folder or by 
          dragging files directly into the editor while authoring.</p>
          <p>Best practices:</p>
          <ul>
            <li>Store page-specific images in a dot-folder named after the page: 
            <code>/.my-page/hero.jpg</code></li>
            <li>Store shared media in <code>/media/</code></li>
            <li>Always add descriptive <code>alt</code> text for accessibility</li>
          </ul>
          <div class="warn-box">&#9888; EDS serves images through its own CDN — 
          always use relative paths or the <code>content.da.live</code> URL, 
          never an external image URL for production content.</div>
        </div>`,
    },
    {
      emoji: '🔒',
      heading: 'Permissions & Access Control',
      html: `
        <div class="step-body">
          <p>Access is controlled at the <strong>org</strong>, <strong>site</strong>, 
          and <strong>folder</strong> level.</p>
          <ul>
            <li><strong>Read:</strong> Can view and open files</li>
            <li><strong>Write:</strong> Can create, edit, and delete</li>
            <li><strong>None:</strong> Explicitly blocked (overrides inherited access)</li>
          </ul>
          <p>Ask an admin to grant access at the folder level for contributors who 
          should only edit specific sections of the site.</p>
          <details class="advanced-toggle">
            <summary>&#x2605; Power Author</summary>
            <div class="adv-body">
              <p>The AI assistant can manage permissions: ask it 
              <em>"Grant write access to user@example.com for the /blog folder"</em> 
              and it will use the permissions MCP tool directly — no admin UI needed.</p>
            </div>
          </details>
        </div>`,
    },
    {
      emoji: '📅',
      heading: 'Scheduled Publishing',
      html: `
        <div class="step-body">
          <p>Pages can be scheduled to publish at a future date and time — perfect for 
          campaign launches, news embargoes, and time-sensitive content.</p>
          <p>Ask the AI assistant in Browse or Editor view:</p>
          <p><em>"Schedule /demo/summer-campaign to publish on June 25 at 9 AM PST"</em></p>
          <div class="tip-box">&#128204; The AI resolves your local timezone automatically. 
          You&#39;ll see a confirmation before any schedule is set.</div>
          <details class="advanced-toggle">
            <summary>&#x2605; Power Author</summary>
            <div class="adv-body">
              <p>View all scheduled pages: ask the AI 
              <em>"Show me everything scheduled to publish this week"</em>. 
              Cancel a scheduled publish: <em>"Cancel the scheduled publish for 
              /demo/summer-campaign"</em>.</p>
            </div>
          </details>
        </div>`,
    },
    {
      emoji: '🗺',
      heading: 'More Tours Available',
      html: `
        <div class="step-body">
          <p>This was the <strong>Browse View</strong> tour. Other tours available:</p>
          <ul>
            <li>&#128196; <strong>Page Editor</strong> — blocks, sections, metadata, AI authoring</li>
            <li>&#128202; <strong>Sheets &amp; Data</strong> — deep dive on structured data</li>
            <li>&#128444; <strong>Media Management</strong> — uploading, optimizing, and organizing assets</li>
          </ul>
          <p>Click <strong>All tours</strong> below to return to the tour launcher and 
          explore them.</p>
          <div class="tip-box">&#128161; Tours track which ones you&#39;ve completed — 
          completed tours show a &#10003; badge in the launcher.</div>
        </div>`,
    },
  ];
}

function buildSheetsTour() {
  return [
    {
      emoji: '📊',
      heading: 'Sheets — EDS Data Files',
      html: `
        <div class="step-body">
          <p><strong>Sheets</strong> are the data layer of Edge Delivery Services. 
          They&#39;re spreadsheet-like files that power navigation, placeholder text, 
          redirects, configuration, and dynamic content queries.</p>
          <p>Any <code>.json</code> or multi-sheet document in your site is a Sheet. 
          Edit them in DA just like a page — the spreadsheet editor opens automatically.</p>
        </div>`,
    },
    {
      emoji: '📋',
      heading: 'Key System Sheets',
      html: `
        <div class="step-body">
          <p>EDS looks for specific sheets by convention:</p>
          <ul>
            <li><code>/placeholders.json</code> — localizable strings used by block JS</li>
            <li><code>/redirects.json</code> — URL redirect rules</li>
            <li><code>/paths.json</code> — path-based configuration</li>
            <li><code>/query-index.json</code> — auto-built page index (do not edit manually)</li>
          </ul>
          <div class="warn-box">&#9888; Never manually edit <code>query-index.json</code> — 
          it is auto-generated by EDS on publish and will overwrite your changes.</div>
        </div>`,
    },
    {
      emoji: '🗂',
      heading: 'Multi-Sheet Workbooks',
      html: `
        <div class="step-body">
          <p>A single sheet file can have <strong>multiple named tabs</strong>, like a 
          spreadsheet with worksheets. Each tab is accessible via 
          <code>?sheet=tabname</code> in the JSON URL.</p>
          <p>The site config at <code>/.da/config</code> uses this pattern — it has 
          separate tables for library settings, plugins, and AI skills, all in one file.</p>
          <details class="advanced-toggle">
            <summary>&#x2605; Power Author</summary>
            <div class="adv-body">
              <p>When querying a multi-sheet workbook from JavaScript, omit the 
              <code>?sheet=</code> param to get all sheets at once as a JSON object 
              with tab names as keys. Use <code>?sheet=data</code> for the default 
              main data table.</p>
            </div>
          </details>
        </div>`,
    },
    {
      emoji: '🧠',
      heading: 'AI-Assisted Sheet Editing',
      html: `
        <div class="step-body">
          <p>The AI assistant can read and update sheets on your behalf:</p>
          <ul>
            <li><em>"Add a redirect from /old-page to /new-page"</em></li>
            <li><em>"Update the placeholder for &#39;cta-label&#39; to &#39;Get Started&#39;"</em></li>
            <li><em>"Show me all the skills registered in the config"</em></li>
          </ul>
          <div class="tip-box">&#128161; The AI reads the sheet first, makes the minimal 
          change, and confirms with you before writing — you&#39;re always in control.</div>
        </div>`,
    },
    {
      emoji: '🚀',
      heading: 'Publishing Sheets',
      html: `
        <div class="step-body">
          <p>Sheets must be <strong>previewed and published</strong> just like pages — 
          the JSON endpoint only updates after a publish.</p>
          <p>This catches contributors off guard: editing a sheet in DA does not 
          immediately update <code>/redirects.json</code> on the live site.</p>
          <div class="warn-box">&#9888; After every sheet edit, click 
          <strong>Preview → Publish</strong> in the Sidekick, or ask the AI to 
          <em>"Publish /redirects.json"</em>.</div>
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
      description: 'Sections, blocks, metadata, WYSIWYG vs Outline, and AI authoring.',
      steps: buildPageEditorTour(hasBlocks, hasTemplates),
    },
    {
      id: 'browse',
      icon: '📁',
      title: 'Browse & Site Management',
      description: 'Creating pages, managing media, permissions, and scheduled publishing.',
      steps: buildBrowseTour(),
    },
    {
      id: 'sheets',
      icon: '📊',
      title: 'Sheets & Structured Data',
      description: 'Placeholders, redirects, config, and multi-sheet workbooks.',
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
      card.innerHTML = `
        <span class="tour-card-icon" aria-hidden="true">${tour.icon}</span>
        <span class="tour-card-body">
          <span class="tour-card-title">${tour.title}</span>
          <span class="tour-card-desc">${tour.description}</span>
        </span>
        <span class="tour-badge ${done ? 'done' : 'new'}">${done ? '✓ Done' : 'New'}</span>
      `;
      if (dismissed && !done) {
        card.querySelector('.tour-badge').textContent = 'Skipped';
        card.querySelector('.tour-badge').className = 'tour-badge done';
      }
      card.addEventListener('click', () => startTour(tour)); // eslint-disable-line no-use-before-define
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          startTour(tour); // eslint-disable-line no-use-before-define
        }
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
    renderStep(); // eslint-disable-line no-use-before-define
    tpContent.focus();
  }

  function closeTour() {
    tourPanel.classList.remove('visible');
    launcher.style.display = 'flex';
    activeTour = null;
    renderLauncher();
    document.getElementById('btn-reset-all').focus();
  }

  function renderStep() {
    if (!activeTour) return;
    const step = activeTour.steps[currentStep];
    const total = activeTour.steps.length;

    tpTourIcon.textContent = activeTour.icon;
    tpTitleText.textContent = activeTour.title;
    tpStepCount.textContent = `${currentStep + 1} / ${total}`;

    // Dots
    tpDots.innerHTML = '';
    activeTour.steps.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = `tp-dot${i === currentStep ? ' active' : ''}${visitedSteps.has(i) && i !== currentStep ? ' visited' : ''}`;
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

    // Content
    tpContent.innerHTML = `
      <span class="step-emoji" aria-hidden="true">${step.emoji}</span>
      <h2 class="step-heading">${step.heading}</h2>
      ${step.html}
    `;

    // Nav buttons
    btnPrev.disabled = currentStep === 0;
    if (currentStep === total - 1) {
      btnNext.textContent = 'Finish ✓';
      btnNext.setAttribute('aria-label', 'Finish tour');
    } else {
      btnNext.textContent = 'Next →';
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

  // Event listeners
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

  // Keyboard navigation
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
    const blocksRes = await fetch(
      `https://content.da.live/${org}/${repo}/tools/sidekick/library/blocks.json`,
    );
    hasBlocks = blocksRes.ok;
  } catch { /* silent */ }

  try {
    const tmplRes = await fetch(
      `https://content.da.live/${org}/${repo}/tools/sidekick/library/templates.json`,
    );
    hasTemplates = tmplRes.ok;
  } catch { /* silent */ }

  const tours = getTourRegistry(hasBlocks, hasTemplates);
  const ctrl = createController(tours);
  ctrl.renderLauncher();

  // Auto-start: if the page-editor tour hasn't been dismissed or visited, start it
  const view = context.view || '';
  if (view === 'edit' && !isTourDismissed('page-editor') && !isTourVisited('page-editor')) {
    const editorTour = tours.find((t) => t.id === 'page-editor');
    if (editorTour) ctrl.startTour(editorTour);
  }
})();
