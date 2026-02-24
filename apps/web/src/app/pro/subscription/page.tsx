import { redirect } from 'next/navigation';

type SearchParams = Record<string, string | string[] | undefined>;

interface LegacyProSubscriptionRedirectPageProps {
  searchParams?: SearchParams;
}

export default function LegacyProSubscriptionRedirectPage({ searchParams }: LegacyProSubscriptionRedirectPageProps) {
  const oid = searchParams?.oid;
  const safeOid = Array.isArray(oid) ? oid[0] : oid;

  if (safeOid && safeOid.trim().length > 0) {
    redirect(`/dashboard/subscription/success?oid=${encodeURIComponent(safeOid)}`);
  }

  redirect('/dashboard/subscription');
}
