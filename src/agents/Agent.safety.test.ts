/**
 * Agent Safety Property Tests
 * Tests safety controls and termination properties
 * 
 * Feature: scam-intelligence-system
 * Properties 40-44: Safety and Termination Controls
 */

import * as fc from 'fast-check';
import { Agent } from './Agent';
import { StateMachine } from './StateMachine';
import { PersonaManager } from './PersonaManager';
import { NLPExtractor } from '../nlp/NLPExtractor';
import { ScamSignalDetector } from '../nlp/ScamSignalDetector';
import { ScamClassifier } from '../scoring/ScamClassifier';
import { RiskScorer } from '../scoring/RiskScorer';

describe('Agent Safety Properties', () => {
  let stateMachine: StateMachine;
  let personaManager: PersonaManager;
  let nlpExtractor: NLPExtractor;
  let signalDetector: ScamSignalDetector;
  let scamClassifier: ScamClassifier;
  let riskScorer: RiskScorer;

  beforeEach(() => {
    stateMachine = new StateMachine();
    personaManager = new PersonaManager();
    nlpExtractor = new NLPExtractor();
    signalDetector = new ScamSignalDetector();
    scamClassifier = new ScamClassifier();
    riskScorer = new RiskScorer();
  });

  /**
   * Property 40: Duration Timeout Termination
   * For any conversation that exceeds the maximum duration (24 hours),
   * the system should automatically terminate the conversation
   * 
   * Validates: Requirements 10.1
   */
  describe('Property 40: Duration Timeout Termination', () => {
    it('should terminate conversations that exceed maximum duration', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 10, maxLength: 100 }), { minLength: 2, maxLength: 5 }),
          async (messages) => {
            const conversationId = `test-conv-${Date.now()}-${Math.random()}`;
            const initialMessage = 'Hello, this is a test scam message.';

            const agent = new Agent(
              conversationId,
              initialMessage,
              stateMachine,
              personaManager,
              nlpExtractor,
              signalDetector,
              scamClassifier,
              riskScorer
            );

            // Process first message to move out of IDLE state
            await agent.processMessage(messages[0]);
            
            // Get the conversation and manually set creation time to 25 hours ago
            const conversation = agent.getConversation();
            const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);
            const now = new Date();
            
            // Create a modified conversation with old timestamp
            const oldConversation = {
              ...conversation,
              createdAt: twentyFiveHoursAgo,
              updatedAt: now,
              metadata: {
                ...conversation.metadata,
                duration: now.getTime() - twentyFiveHoursAgo.getTime(),
              },
            };

            // Restore the old state
            agent.restoreState(oldConversation);

            // Verify duration is now over the limit before processing message
            const durationBeforeMessage = agent.getDuration();
            expect(durationBeforeMessage).toBeGreaterThan(agent.getMaxDuration());

            // Process another message - should trigger timeout termination
            await agent.processMessage(messages[1]);

            // Verify conversation is terminated
            expect(agent.isTerminated()).toBe(true);
            expect(agent.isPermanentlyTerminated()).toBe(true);
            
            // Verify intelligence is preserved
            expect(agent.isIntelligencePreserved()).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not terminate conversations within maximum duration', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 10, maxLength: 100 }), { minLength: 1, maxLength: 3 }),
          async (messages) => {
            const conversationId = `test-conv-${Date.now()}-${Math.random()}`;
            const initialMessage = 'Hello, this is a test scam message.';

            const agent = new Agent(
              conversationId,
              initialMessage,
              stateMachine,
              personaManager,
              nlpExtractor,
              signalDetector,
              scamClassifier,
              riskScorer
            );

            // Process messages normally (within duration limit)
            for (const message of messages) {
              if (!agent.isTerminated()) {
                await agent.processMessage(message);
              }
            }

            // If not terminated for other reasons, duration should be within limit
            if (!agent.isTerminated()) {
              expect(agent.getDuration()).toBeLessThanOrEqual(agent.getMaxDuration());
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
