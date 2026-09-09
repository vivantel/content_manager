import { createHmac } from 'crypto';
import { readFileSync, existsSync, readdirSync } from 'fs';

const VIVASCRIBE_API_URL = process.env.VIVASCRIBE_API_URL;
const VIVASCRIBE_API_KEY = process.env.VIVASCRIBE_API_KEY;
const VIVASCRIBE_WEBHOOK_SECRET = process.env.VIVASCRIBE_WEBHOOK_SECRET;

if (!VIVASCRIBE_API_URL || !VIVASCRIBE_API_KEY) {
  console.error('Missing VIVASCRIBE_API_URL or VIVASCRIBE_API_KEY');
  process.exit(1);
}

async function dispatchEvents(eventsFile: string, provider: 'github' | 'gitlab') {
  if (!existsSync(eventsFile)) {
    console.log(`No ${provider} events file found, skipping`);
    return 0;
  }

  const events = JSON.parse(readFileSync(eventsFile, 'utf-8'));
  if (!events.length) {
    console.log(`No ${provider} events to dispatch`);
    return 0;
  }

  console.log(`Dispatching ${events.length} ${provider} events...`);

  let dispatched = 0;
  for (const event of events) {
    try {
      const payload = {
        repositoryIds: [event.repositoryId],
        since: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      };

      // Create webhook signature
      const signature = createHmac('sha256', VIVASCRIBE_WEBHOOK_SECRET || '')
        .update(JSON.stringify(payload))
        .digest('hex');

      const response = await fetch(`${VIVASCRIBE_API_URL}/api/v1/ingest/poll`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${VIVASCRIBE_API_KEY}`,
          'Content-Type': 'application/json',
          'X-Hub-Signature-256': `sha256=${signature}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        dispatched++;
      } else {
        console.error(`Failed to dispatch event: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Error dispatching event:`, error);
    }
  }

  console.log(`Dispatched ${dispatched}/${events.length} ${provider} events`);
  return dispatched;
}

async function main() {
  let totalDispatched = 0;
  
  totalDispatched += await dispatchEvents('.github-events.json', 'github');
  totalDispatched += await dispatchEvents('.gitlab-events.json', 'gitlab');

  console.log(`Total events dispatched: ${totalDispatched}`);
}

main().catch(console.error);