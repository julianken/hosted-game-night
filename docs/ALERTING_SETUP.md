# Alerting Setup Guide

Configuration steps for Sentry error alerts and Grafana uptime monitoring.

## Sentry Alert Rules

Each Sentry project needs an alert rule to catch recurring errors.

### Configuration

| Setting | Value |
|---------|-------|
| **Rule name** | `Recurring errors` |
| **Trigger** | New issue, first seen in last 1 hour |
| **Threshold** | Count > 3 in 1 hour |
| **Action** | Email notification |
| **Projects** | `jb-bingo`, `jb-trivia`, `jb-platform-hub` |

### Steps (Sentry UI)

For each project (`jb-bingo`, `jb-trivia`, `jb-platform-hub`):

1. Go to **Settings > Projects > [project] > Alerts**
2. Click **Create Alert Rule**
3. Select **Issue Alert**
4. Configure conditions:
   - **When:** A new issue is created
   - **If:** The issue has happened more than **3** times in **1 hour**
   - **Then:** Send a notification to **Member** (yourself)
5. Name the rule `Recurring errors`
6. Save

### Sentry Dashboard Links

- Organization: https://detached-node.sentry.io/
- Bingo alerts: https://detached-node.sentry.io/alerts/rules/?project=jb-bingo
- Trivia alerts: https://detached-node.sentry.io/alerts/rules/?project=jb-trivia
- Platform Hub alerts: https://detached-node.sentry.io/alerts/rules/?project=jb-platform-hub

### API Token Note

The current CI token (`joolie-boolie-ci`, scope `org:ci`) cannot manage alerts.
To automate alert configuration, create a new token at https://sentry.io/settings/auth-tokens/ with scope `alerts:write`.

## Grafana Synthetic Monitoring

HTTP health checks for all 3 apps with downtime alerting.

### Check Configuration

| Check | URL | Frequency |
|-------|-----|-----------|
| `jb-bingo-health` | `https://bingo.joolie-boolie.com/api/health` | 60s |
| `jb-trivia-health` | `https://trivia.joolie-boolie.com/api/health` | 60s |
| `jb-hub-health` | `https://joolie-boolie.com/api/health` | 60s |

### Steps (Grafana UI)

1. Go to https://julianken.grafana.net/a/grafana-synthetic-monitoring-app
2. Click **Add new check** > **HTTP**
3. For each app:
   - **Job name:** `jb-bingo-health` (or `jb-trivia-health`, `jb-hub-health`)
   - **Target URL:** the health endpoint URL from the table above
   - **Frequency:** 60 seconds
   - **Timeout:** 10 seconds
   - **Probes:** At least 2 (e.g., `Atlanta`, `London`)
   - **Validation:** HTTP status 200, response body contains `"status":"ok"`
4. Save each check

### Alert Configuration

1. In Grafana, go to **Alerting > Alert rules**
2. Create a new alert rule:
   - **Name:** `App down - 2 consecutive failures`
   - **Query:** Use the synthetic monitoring probe success metric
   - **Condition:** `probe_success == 0` for 2 consecutive evaluations (2 minutes with 60s frequency)
   - **Labels:** `severity: critical`
3. Create a **Contact point** for email:
   - Go to **Alerting > Contact points**
   - Click **Add contact point**
   - **Name:** `Email`
   - **Type:** Email
   - Add your email address
4. Create a **Notification policy** routing `severity: critical` to the Email contact point

### Grafana Dashboard Links

- Home: https://julianken.grafana.net
- Synthetic Monitoring: https://julianken.grafana.net/a/grafana-synthetic-monitoring-app
- Alerting Rules: https://julianken.grafana.net/alerting/list
- Contact Points: https://julianken.grafana.net/alerting/notifications

## Monthly Review

A recurring monthly task to review observability data. See Linear issue BEA-564.

### Review Checklist

1. **Sentry:** Check error trends, resolve stale issues, review alert thresholds
2. **Grafana Tempo:** Review trace latency patterns, check for slow endpoints
3. **Grafana Synthetic Monitoring:** Verify all health checks are green, review uptime history
4. **Axiom (Vercel Log Drain):** Spot-check structured logs, verify volume is within free tier
5. **Vercel Analytics:** Review Core Web Vitals, identify performance regressions

### Creating Next Month's Review

After completing a monthly review, create the next one in Linear:
- Copy BEA-564's description
- Set due date to 1 month from now
- Assign to the team

## Credentials Reference

Credentials are in `.secrets/observability-accounts.json` (gitignored). See that file for:
- Sentry org, project slugs, DSNs, and auth token
- Grafana Cloud instance URL, OTLP endpoint, and API token
- Axiom org and dataset names
