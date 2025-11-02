import { getFullPrompt } from './lib/agent/renderer';
import { SessionState } from './types';

(async () => {  
  try {
    const sessionState: SessionState = {
      startTime: Date.now(),
      invocationCount: 1,
    };

    console.log('Composing prompt...');
    const prompt = await getFullPrompt(sessionState);

    console.log('\n=== SYSTEM PROMPT ===');
    console.log(prompt.system);
    
    console.log('\n=== USER PROMPT ===');
    console.log(prompt.user);
    
    console.log('\n=== ASSISTANT PROMPT ===');
    console.log(prompt.assistant);

    console.log('\nPrompt composition complete.');

  } catch (error) {
    console.error('Error composing prompt:', error);
  }
  process.exit(0);
})();
