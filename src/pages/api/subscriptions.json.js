import fs from 'node:fs/promises';
import path from 'node:path';

const dataFile = path.join(process.cwd(), 'src/data/subscriptions.json');

export async function GET() {
  try {
    const data = await fs.readFile(dataFile, 'utf-8');
    const subscriptions = JSON.parse(data).subscriptions;
    return new Response(JSON.stringify(subscriptions), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
