# fly-log-shipper

Forwards logs from the Fly.io backend app to Grafana Cloud Loki.

Architecture:
```
Fly.io NATS → Vector (fly-log-shipper) → Grafana Cloud Loki → Dashboards / Alerts
```

## Setup from scratch

### 1. Grafana Cloud — create account and token

1. Sign up at **grafana.com** (free tier: 50 GB logs/month).
2. After login, go to **Connections → Data sources → Loki** and note:
   - **URL**: `https://logs-prod-XXX.grafana.net`
   - **Username**: numeric, e.g. `123456`
3. Generate a password (API token):
   - **Administration → Users and access → Cloud access policies**
   - **New access policy** → name it e.g. `fly-log-shipper`, scope: `logs:write`
   - **Add token** → copy immediately (shown only once)

### 2. Fly.io — create the shipper app

```bash
cd infrastructure/fly-log-shipper
fly launch --no-deploy --image ghcr.io/superfly/fly-log-shipper:latest
```

Pick a sensible name (e.g. `<your-app>-log-shipper`). The provided `fly.toml` is already configured — do not overwrite it. Adjust `SUBJECT` in `fly.toml` to match the name of the backend app you want to ship logs from.

### 3. Set secrets

```bash
fly secrets set ORG=<slug-from-fly-orgs-list>
fly secrets set ACCESS_TOKEN="<token-from-fly-tokens-create-readonly>"
fly secrets set GRAFANA_LOKI_URL=https://logs-prod-XXX.grafana.net
fly secrets set GRAFANA_LOKI_USERNAME=123456
fly secrets set GRAFANA_LOKI_PASSWORD=<token-from-step-1>
```

Notes:
- `ACCESS_TOKEN` is generated via `fly tokens create readonly personal` — the token contains a space (`FlyV1 fm2_...`), wrap it in quotes.
- We use `GRAFANA_LOKI_*` (not `LOKI_*`) — the fly-log-shipper image auto-generates its own sink when it sees `LOKI_URL`, which causes a conflict.

### 4. Deploy

```bash
fly deploy --file-local /etc/vector/vector.toml=./vector.toml
```

The `--file-local` flag overrides the default Vector config in the container with our `vector.toml`. Pass it on every deploy.

## Changing the filtered app

In `fly.toml` change `SUBJECT`:

```toml
[env]
  SUBJECT = "logs.your-app-name.>"
```

## Grafana — example LogQL queries

```logql
# All backend logs
{app="underlined-backend"}

# Errors only
{app="underlined-backend", level="error"}

# Pretty print
{app="underlined-backend"} | json | line_format "[{{.level}}] {{.url}} — {{.message}}"

# Error rate over time
sum(rate({app="underlined-backend", level="error"}[5m]))
```

## Alert on errors

In Grafana Cloud → **Alerting → Alert rules → New rule**:
- Query: `sum(rate({app="underlined-backend", level="error"}[5m])) > 0`
- Condition: IS ABOVE `0` for 2 minutes
- Contact point: configure in **Alerting → Contact points** (email, Slack, webhook)
