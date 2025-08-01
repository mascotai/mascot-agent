import 'dotenv/config';
import { TwitterApi } from 'twitter-api-v2';

// Load environment variables from the .env file in the parent directory
import * as dotenv from 'dotenv';
dotenv.config({ path: '../../.env.prod' });

const client = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET_KEY,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function deleteTweetWithRateLimitHandling(tweetId, tweetText) {
  let success = false;
  while (!success) {
    try {
      console.log(`Attempting to delete tweet: ${tweetText}`);
      await client.v2.deleteTweet(tweetId);
      console.log(`Successfully deleted tweet with ID: ${tweetId}`);
      success = true;
    } catch (error) {
      if (error.code === 429 && error.rateLimit) {
        const resetTime = error.rateLimit.reset * 1000;
        const waitTime = resetTime - Date.now() + 1000; // Add a 1-second buffer
        console.warn(`Rate limit hit. Waiting for ${Math.ceil(waitTime / 1000)} seconds...`);
        await sleep(waitTime > 0 ? waitTime : 0);
      } else {
        // For other errors, log and stop trying for this tweet
        console.error(`Failed to delete tweet ${tweetId} due to non-rate-limit error:`, error);
        return; // Exit the loop for this tweet
      }
    }
  }
}


async function deleteTweets() {
  try {
    // Get the authenticated user's ID
    const meUser = await client.v2.me();
    const userId = meUser.data.id;

    // Calculate the start time (24 hours ago)
    const startTime = new Date(Date.now() - 100 * 60 * 60 * 1000).toISOString();

    // Fetch the user's timeline from the last 24 hours
    console.log(`Fetching tweets from the last 24 hours (since ${startTime})...`);
    const timeline = await client.v2.userTimeline(userId, {
      max_results: 100,
      start_time: startTime,
    });

    if (!timeline.data.data || timeline.data.data.length === 0) {
      console.log("No tweets found in the last 24 hours.");
      return;
    }

    const tweetsToDelete = timeline.data.data.filter(tweet => tweet.text.startsWith('"') || tweet.text.startsWith('“') || tweet.text.startsWith('”'));

    if (tweetsToDelete.length === 0) {
        console.log("No tweets starting with a quote found in the last 24 hours.");
        return;
    }

    console.log(`Found ${tweetsToDelete.length} tweet(s) to delete.`);

    for (const tweet of tweetsToDelete) {
      await deleteTweetWithRateLimitHandling(tweet.id, tweet.text);
      // Add a small delay between successful deletions to be a good API citizen
      await sleep(1000);
    }
    console.log("Finished processing timeline.");
  } catch (error) {
    // This will catch errors from client.v2.me() or client.v2.userTimeline()
    console.error('An unexpected error occurred during the process:', error);
  }
}

deleteTweets();
