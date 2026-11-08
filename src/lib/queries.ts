import { queryOptions } from '@tanstack/react-query';
import { readCatalog, readAccount, readAdmin } from './store.functions';
export const catalogOptions = queryOptions({ queryKey: ['catalog'], queryFn: () => readCatalog() });
export const accountOptions = queryOptions({ queryKey: ['account'], queryFn: () => readAccount() });
export const adminOptions = queryOptions({ queryKey: ['admin'], queryFn: () => readAdmin() });
export const pageMeta = (title: string, description: string) => ({ meta: [
  { title: `${title} | Axiom Worksheets` }, { name: 'description', content: description },
  { property: 'og:title', content: `${title} | Axiom Worksheets` }, { property: 'og:description', content: description },
  { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' },
] });
