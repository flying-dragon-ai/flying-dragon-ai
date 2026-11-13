import { hero, introBlock, statsBlock, langBlock, featuredBlock, footerBlock, trim } from './blocks.mjs';

export default function render(p, v) {
  return `${hero(p, v)}

${introBlock(v)}

${p.featured.slice(0, 3).map((r) => `- **[${r.name}](${r.url})** — ${trim(r.description, 100)}`).join('\n')}

${statsBlock()}

${langBlock()}

${featuredBlock(p, { limit: 6 })}

${footerBlock(p, v)}
`;
}
