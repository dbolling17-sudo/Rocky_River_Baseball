import { readdir, readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import type { Loader, LoaderContext } from 'astro/loaders';

// Astro's built-in file() loader logs a YAML typo and carries on with an empty
// collection, which would publish a blank calendar. These loaders stop the build
// with the file name and line instead, so a mistake can never reach the live site.

function parseYaml(text: string, label: string): unknown {
  try {
    // CORE_SCHEMA keeps dates like 2026-10-15 and times like 15:30 as plain text,
    // so nothing gets shifted by time zones.
    return yaml.load(text, { filename: label, schema: yaml.CORE_SCHEMA });
  } catch (error) {
    throw new Error(`Could not read ${label}: ${(error as Error).message}`);
  }
}

async function storeItems(
  ctx: LoaderContext,
  label: string,
  data: unknown,
  idPrefix: string,
  extra: Record<string, unknown> = {},
) {
  if (data == null) return;
  const items = Array.isArray(data) ? data : [data];
  for (const [index, raw] of items.entries()) {
    if (typeof raw !== 'object' || raw === null) {
      throw new Error(`${label}, item ${index + 1}: expected a set of "name: value" lines.`);
    }
    const id = `${idPrefix}${index + 1}`;
    const parsed = await ctx.parseData({ id, data: { ...extra, ...(raw as Record<string, unknown>) } });
    ctx.store.set({ id, data: parsed });
  }
}

/** One YAML file. A list becomes one entry per item; a single block becomes one entry. */
export function yamlFile(path: string): Loader {
  return {
    name: 'yaml-file',
    async load(ctx) {
      const filePath = fileURLToPath(new URL(path, ctx.config.root));
      const sync = async () => {
        ctx.store.clear();
        await storeItems(ctx, path, parseYaml(await readFile(filePath, 'utf-8'), path), '');
      };
      await sync();
      ctx.watcher?.add(filePath);
      ctx.watcher?.on('change', (changed) => changed === filePath && sync());
    },
  };
}

/**
 * Every .yaml file in a folder, one file per season (e.g. 2026-27.yaml).
 * Each item gets a `season` field taken from its file name.
 */
export function yamlFolder(dir: string): Loader {
  return {
    name: 'yaml-folder',
    async load(ctx) {
      const dirPath = fileURLToPath(new URL(dir, ctx.config.root));
      const sync = async () => {
        ctx.store.clear();
        const files = (await readdir(dirPath)).filter((f) => /\.ya?ml$/.test(f)).sort();
        for (const file of files) {
          const season = basename(file).replace(/\.ya?ml$/, '');
          const label = `${dir}/${file}`;
          const data = parseYaml(await readFile(join(dirPath, file), 'utf-8'), label);
          await storeItems(ctx, label, data, `${season}-`, { season });
        }
      };
      await sync();
      ctx.watcher?.add(dirPath);
      ctx.watcher?.on('all', (_event, changed) => changed.startsWith(dirPath) && sync());
    },
  };
}
