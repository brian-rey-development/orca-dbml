# DBML for Orca

This plugin turns every `.dbml` file in [Orca](https://github.com/stablyai/orca) into a live entity relationship diagram that sits beside the code, so a schema an agent just wrote can be read at a glance instead of line by line. It parses DBML with the official `@dbml/parse` compiler, so the errors it reports and the tables, columns and relationships it draws are the ones dbdiagram.io and the DBML command line tools see in the same file.

![The diagram view of an online store schema](images/cover.png)

## What you get

Opening a `.dbml` file shows the **Diagram** editor, split into the DBML source on the left and the diagram on the right. Typing in the code pane redraws the diagram about 150 ms later, and a change written to the file by an agent or another tab appears in both panes without losing your cursor. When the text stops compiling, the diagram keeps showing the last valid version with a banner that counts the problems, because a schema that disappears on every typo is useless while you are fixing it.

The code pane highlights DBML, underlines errors and warnings from the compiler, and completes keywords, column types, settings, table names and the columns of `table.` references. Orca's own **Source** view stays one click away in the editor toggle, and it is highlighted too, since the plugin also ships a TextMate grammar for Monaco.

The diagram draws tables with their header colors, primary and foreign keys, types and notes, relationships in crow's foot notation (a bar for one, a fork for many, a ring when optional), table groups as tinted frames and sticky notes as cards. Hovering a table or a relationship highlights everything connected to it, hovering a column shows its constraints, default, note and, for an enum type, the allowed values, and the toolbar can reduce every table to its key columns or to its name when a large schema gets crowded. Table partials (`~name`) are expanded the way the official exporters expand them, including the inline references their columns carry.

Tables are laid out automatically, parents to the left of their children and unrelated clusters packed into rows, and you can drag any of them. The positions are remembered per diagram, and adding a table never moves the ones you placed, because new tables are laid out beside the existing arrangement instead of reshuffling it. **Auto-arrange** starts over when you want a clean layout.

The diagram exports to PNG or SVG through Orca's save dialog, and **New DBML schema** in the + menu creates a file from a small online store example.

## Working in the diagram

| Action                  | How                                                       |
| ----------------------- | --------------------------------------------------------- |
| Pan                     | Drag the background, or scroll                            |
| Zoom                    | Pinch, Ctrl or Cmd + scroll, the toolbar, or `+` and `-`  |
| Fit the diagram to view | The toolbar, or `0`                                       |
| Highlight a table       | Hover it, or click it to keep it highlighted              |
| Jump to a table's DBML  | Double-click it, or select it and press Enter             |
| Move between tables     | Focus the diagram and use the arrow keys                  |
| Find a table            | Type in **Find table** and press Enter                    |
| Jump to a problem       | Open the problems list from the toolbar and click an item |
| Resize the split        | Drag the divider, or focus it and use the arrow keys      |
| Clear the highlight     | Click the background, or press Escape                     |

## Limits

The export buttons appear only where Orca offers a save dialog, which its browser clients do not. The editor sees one file at a time, because Orca gives a custom editor the document but never its path or the file system. DBML's multi-file `use` imports therefore report the imported names as missing. SQL export is not included either, since the official exporter can only be loaded together with every SQL import grammar, about 16 MB of code. For SQL, the official [`@dbml/cli`](https://dbml.dbdiagram.io/cli) converts a file with `dbml2sql schema.dbml --postgres`, which an agent in an Orca terminal can run directly.

## Development

The plugin needs Node.js 22 or newer and pnpm. The editor is a Preact app bundled by esbuild into the single file `editor/index.html`, inlined because Orca's browser clients load a custom editor as one sandboxed document. That file is committed, because Orca installs plugins straight from Git without a build step.

| Command          | What it does                                                                              |
| ---------------- | ----------------------------------------------------------------------------------------- |
| `pnpm build`     | Builds `editor/index.html` and regenerates `THIRD_PARTY_NOTICES.md`                       |
| `pnpm preview`   | Builds a browser preview with a stand-in for Orca, at `.preview/index.html`               |
| `pnpm test`      | Runs the unit tests, including the TextMate grammar through Oniguruma                     |
| `pnpm typecheck` | Type-checks the sources and tests                                                         |
| `pnpm check`     | Runs all of the above and fails if the committed build is out of date                     |
| `pnpm validate`  | Runs `orca plugin validate .` (needs the Orca CLI)                                        |
| `pnpm test:orca` | Adds the sync tests in `test/orca`, run on Orca's own editor session (needs the Orca CLI) |

To try a change inside Orca, run `orca plugin dev watch .` from this folder. Orca reloads the editor every time `pnpm build` rewrites it.

The source is split by responsibility, and only `src/host` knows that Orca exists.

| Folder        | Responsibility                                                                    |
| ------------- | --------------------------------------------------------------------------------- |
| `src/text`    | Line and column locations, text diffs and the merge of concurrent edits           |
| `src/schema`  | Compiles DBML and maps the result to a small, typed schema model with diagnostics |
| `src/layout`  | Lays nodes out with dagre, keeps them in place and remembers where they were put  |
| `src/diagram` | Measures cards, turns a schema and positions into a scene, and draws it as SVG    |
| `src/code`    | The CodeMirror pane, its DBML tokenizer, completion and linting                   |
| `src/export`  | PNG and SVG export                                                                |
| `src/app`     | The Preact app that wires the pieces together                                     |
| `src/host`    | The bridge to Orca's frame API, and safe local storage                            |
| `syntaxes`    | The TextMate grammar and language configuration for Orca's Source view            |

## Releasing

Bump `version` in `orca-plugin.json` and `package.json`, run `pnpm check`, commit, then push a matching tag such as `v1.1.0`. The Orca plugin directory lists the newest `vX.Y.Z` tag of any public repository with the `orca-plugin` topic.

## License

MIT. The bundled third-party packages keep their own licenses, which are reproduced in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
