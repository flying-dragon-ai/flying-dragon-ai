import { hero, introBlock, statsBlock, langBlock, heatBlock, featuredBlock, clustersBlock, dynamicBlock, footerBlock } from './blocks.mjs';

export default function render(p, v) {
  return `${hero(p, v)}

${dynamicBlock(p, v, { heading: '## 实时' })}

${introBlock(v)}

${statsBlock()}

${heatBlock()}

${langBlock()}

${featuredBlock(p, { limit: 6 })}

${clustersBlock(p)}

${footerBlock(p, v)}
`;
}
