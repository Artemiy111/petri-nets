# Timed Petri Nets Simulator

![image](https://github.com/user-attachments/assets/d1874892-d7ca-4daf-92e8-8d30b20c1e68)

### Run program

```sh
bun install
bun run dev
```

Go to http://localhost:3000

### Run with Docker

```sh
docker compose up --build
```

Go to http://localhost:3000. To publish a different port, set `APP_PORT`:

```sh
APP_PORT=8080 docker compose up --build
```

The production image is built with `docker build -t timed-petri-nets .` and served on port 3000.

Every push to `main` publishes the image to GHCR:

```sh
docker pull ghcr.io/artemiy111/timed-petri-nets:latest
docker run --rm -p 3000:3000 ghcr.io/artemiy111/timed-petri-nets:latest
```

The image can be pulled anonymously. If pulls start requiring authentication, set
the package visibility to Public: profile → **Packages** → `timed-petri-nets` →
**Package settings** → **Danger Zone** → **Change visibility**.

### Observability

Runtime errors go to a GlitchTip instance, Web Vitals go to stdout and
OpenTelemetry metrics, and the app exports OpenTelemetry traces from both the
Next.js server and the browser. The Sentry variables use the standard names, so
pointing at Sentry instead of GlitchTip is a matter of swapping the DSN.

Copy `.env.example` to `.env` and fill in the DSN from your GlitchTip project
(**Project settings → Client Keys (DSN)**):

```sh
cp .env.example .env
docker compose up -d
```

| Variable | Default | Purpose |
| --- | --- | --- |
| `SENTRY_DSN` | empty | Sentry-compatible DSN. Empty disables reporting entirely. |
| `SENTRY_ENVIRONMENT` | `production` | Environment tag for events. |
| `SENTRY_RELEASE` | empty | Release tag, e.g. the image tag or git sha. |
| `SENTRY_TRACES_SAMPLE_RATE` | `0` | `0`..`1`. Above `0` sends pageload transactions, which also carry Web Vitals to GlitchTip. |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | empty | OTLP/HTTP base URL, e.g. `http://otel-collector.monitoring.svc.cluster.local:4318`. Empty disables tracing and metrics. |
| `OTEL_SERVICE_NAME` | `petri-nets` | `service.name` resource attribute. |
| `OTEL_ENVIRONMENT` | `NODE_ENV` | `deployment.environment.name` resource attribute. |
| `OTEL_SERVICE_VERSION` | `SENTRY_RELEASE` | `service.version` resource attribute. |
| `OTEL_TRACES_SAMPLE_RATE` | `1` | `0`..`1` trace sample rate. |
| `OTEL_BROWSER_SAMPLE_RATE` | `OTEL_TRACES_SAMPLE_RATE` | `0`..`1` browser trace sample rate. `0` keeps the browser SDK out of the bundle. |

Config is read at request time, so the same image works in every environment and
the published GHCR image needs no rebuild to enable reporting. Without a DSN the
Sentry SDK is never downloaded — it is a lazy chunk, not part of the initial bundle.

`instrumentation.ts` registers an OpenTelemetry SDK before the server starts, and
Next.js then emits its own spans for HTTP requests and rendering. There is no
auto-instrumentation, so the SDK works under the Bun runtime that serves the app.
Spans leave through a batch processor; a killed process can lose the last few
seconds of traces.

The browser SDK is loaded lazily and only when the browser sample rate is above
`0` (it falls back to `OTEL_TRACES_SAMPLE_RATE`). It traces page load and long
tasks and sends spans to `/api/telemetry/v1/traces`, which relays them to the
collector — the collector is a ClusterIP service and is not reachable from the
browser directly.

Web Vitals are recorded as `web.vitals.*` histograms with `web.vital.name` and
`web.vital.rating` labels. The collector re-exports them in Prometheus format, so
they land in VictoriaMetrics in the homelab and in the bundled Prometheus locally.

`docker compose` also starts Grafana, Tempo and an OTLP collector
(`grafana/otel-lgtm`), and points the app at it. Traces show up in
http://localhost:3001 under **Explore → Tempo**, filtered by
`service.name = petri-nets`. In Compose an empty endpoint falls back to that
local collector; set `OTEL_EXPORTER_OTLP_ENDPOINT` to any OTLP/HTTP URL to
override it, or use `APP_PORT` and `OTEL_UI_PORT` when the default ports are
taken.

Web Vitals are always collected and posted to `/api/vitals`, which logs one JSON
line per metric:

```sh
docker compose logs -f app | grep web-vital
```

Errors are reported from the React error boundaries (`app/error.tsx`,
`app/global-error.tsx`) and from model import/export failures.

The image ships browser source maps and `SENTRY_RELEASE` set to the commit SHA,
so every event carries a release. The maps themselves are uploaded by the
deployment: a job in the homelab cluster runs `sentry-cli sourcemaps upload`
against that release, because the GlitchTip instance is not reachable from
GitHub runners. Without that upload GlitchTip still shows minified frames — the
maps in the image are only the input for it.

## License

Licensed under the [Apache License, Version 2.0](LICENSE). See [NOTICE](NOTICE) for attribution.
