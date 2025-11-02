import { getFullPrompt } from './lib/agent/renderer';
import { SessionState } from './types';

(async () => {  
  try {
    const sessionState: SessionState = {
      startTime: Date.now(),
      invocationCount: 1,
    };

    const prompt = await getFullPrompt(sessionState);
    console.log(prompt);

  } catch (error) {
    console.error('Error composing prompt:', error);
  }
  process.exit(0);
})();
