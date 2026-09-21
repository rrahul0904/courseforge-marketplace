export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  return <main className="page"><div className="eyebrow">Authentication required</div><h1>Sign in to continue</h1><div className="panel"><p>CourseForge now fails closed on learner, instructor and admin actions. The production identity provider will plug into the signed server-session boundary already in the repository.</p><p className="muted">Requested destination: {params.next ?? "/"}</p><p className="muted">Local development can enable the explicitly gated dev-session endpoint with COURSEFORGE_ALLOW_DEV_LOGIN=true. It is unavailable by default and always disabled when NODE_ENV=production.</p></div></main>;
}
