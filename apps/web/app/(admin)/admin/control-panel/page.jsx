const fallbackApiUrl = "http://localhost:5000/api";

function getAdminJsUrl() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || fallbackApiUrl;
  return `${apiUrl.replace(/\/api\/?$/, "")}/adminjs`;
}

export default function AdminControlPanelPage() {
  const adminJsUrl = getAdminJsUrl();

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
          Database Control
        </p>
        <h1 className="mt-2 text-3xl font-black text-gray-950">
          AdminJS control panel
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
          Use your existing admin email and password to sign in. This panel
          connects through the same API server, which means it will manage
          whatever MongoDB database your `MONGODB_URI` points to on the VPS.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={adminJsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            Open AdminJS
          </a>
          <a
            href={adminJsUrl}
            className="inline-flex items-center rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Open here
          </a>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900">Connection target</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            AdminJS does not connect to MongoDB directly from your browser. It
            goes through `apps/api`, so your API server must be able to reach
            the MongoDB instance on the VPS.
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900">Login</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Sign in with an active user whose role is `admin`. The same admin
            accounts you already use in BariManager are accepted here.
          </p>
        </div>
      </div>
    </section>
  );
}
