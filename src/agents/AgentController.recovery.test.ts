/**
 * AgentController Conversation Recovery Tests
 * Tests for conversation state restoration and system restart scenarios
 * Validates Requirement 9.7: State persistence and recovery
 */

import { AgentController } from './AgentController';
import { StateMachine } from './StateMachine';
import { PersonaManager } from './PersonaManager';
import { NLPExtractor } from '../nlp/NLPExtractor';
import { ScamSignalDetector } from '../nlp/ScamSignalDetector';
import { ScamClassifier } from '../scoring/ScamClassifier';
import { RiskScorer } from '../scoring/RiskScorer';
import { InMemoryConversationRepository } from '../persistence/InMemoryConversationRepository';
import { ConversationState } from '../types';

describe('AgentController - Conversation Recovery', () => {
  let controller: AgentController;
  let repository: InMemoryConversationRepository;
  let stateMachine: StateMachine;
  let personaManager: PersonaManager;
  let nlpExtractor: NLPExtractor;
  let signalDetector: ScamSignalDetector;
  let scamClassifier: ScamClassifier;
  let riskScorer: RiskScorer;

  beforeEach(() => {
    // Initialize dependencies
    stateMachine = new StateMachine();
    personaManager = new PersonaManager();
    nlpExtractor = new NLPExtractor();
    signalDetector = new ScamSignalDetector();
    scamClassifier = new ScamClassifier();
    riskScorer = new RiskScorer();
    repository = new InMemoryConversationRepository();

    // Create controller with repository
    controller = new AgentController(
      stateMachine,
      personaManager,
      nlpExtractor,
      signalDetector,
      scamClassifier,
      riskScorer,
      repository
    );
  });

  afterEach(async () => {
    await controller.shutdown();
  });

  describe('recoverConversations', () => {
    it('should recover all active conversations from storage', async () => {
      // Create and persist some conversations
      const conv1 = await controller.createConversation('Hello, this is urgent!');
      const conv2 = await controller.createConversation('You won a prize!');

      // Simulate system restart by creating new controller
      const newController = new AgentController(
        new StateMachine(),
        personaManager,
        nlpExtractor,
        signalDetector,
        scamClassifier,
        riskScorer,
        repository
      );

      // Recover conversations
      const recoveredCount = await newController.recoverConversations();

      // Verify recovery
      expect(recoveredCount).toBe(2);
      expect(newController.getAgentPoolSize()).toBe(2);
      expect(newController.getActiveAgentCount()).toBe(2);

      // Verify conversations are accessible
      const recovered1 = await newController.getConversation(conv1.id);
      const recovered2 = await newController.getConversation(conv2.id);

      expect(recovered1.id).toBe(conv1.id);
      expect(recovered2.id).toBe(conv2.id);

      await newController.shutdown();
    });

    it('should restore conversation state correctly', async () => {
      // Create a conversation and process some messages
      const conv = await controller.createConversation('Hello!');
      await controller.processMessage(conv.id, 'I need your bank details');
      await controller.processMessage(conv.id, 'Send money to account 12345');

      const originalConv = await controller.getConversation(conv.id);

      // Simulate system restart
      const newController = new AgentController(
        new StateMachine(),
        personaManager,
        nlpExtractor,
        signalDetector,
        scamClassifier,
        riskScorer,
        repository
      );

      await newController.recoverConversations();

      // Verify state is restored
      const recovered = await newController.getConversation(conv.id);

      expect(recovered.id).toBe(originalConv.id);
      expect(recovered.state).toBe(originalConv.state);
      expect(recovered.persona.id).toBe(originalConv.persona.id);
      expect(recovered.messages.length).toBe(originalConv.messages.length);
      expect(recovered.extractedEntities.length).toBe(originalConv.extractedEntities.length);
      expect(recovered.scamSignals.length).toBe(originalConv.scamSignals.length);
      expect(recovered.riskScore).toBe(originalConv.riskScore);

      await newController.shutdown();
    });

    it('should restore state history correctly', async () => {
      // Create a conversation and let it progress through states
      const conv = await controller.createConversation('Hello!');
      await controller.processMessage(conv.id, 'This is urgent!');
      await controller.processMessage(conv.id, 'Send payment now!');

      const originalConv = await controller.getConversation(conv.id);
      const originalHistory = originalConv.metadata.stateHistory;

      // Simulate system restart
      const newController = new AgentController(
        new StateMachine(),
        personaManager,
        nlpExtractor,
        signalDetector,
        scamClassifier,
        riskScorer,
        repository
      );

      await newController.recoverConversations();

      // Verify state history is restored
      const recovered = await newController.getConversation(conv.id);
      const recoveredHistory = recovered.metadata.stateHistory;

      expect(recoveredHistory.length).toBe(originalHistory.length);
      
      for (let i = 0; i < originalHistory.length; i++) {
        expect(recoveredHistory[i].fromState).toBe(originalHistory[i].fromState);
        expect(recoveredHistory[i].toState).toBe(originalHistory[i].toState);
        expect(recoveredHistory[i].reason).toBe(originalHistory[i].reason);
      }

      await newController.shutdown();
    });

    it('should restore messages with correct timestamps', async () => {
      // Create a conversation with messages
      const conv = await controller.createConversation('Hello!');
      await controller.processMessage(conv.id, 'Test message');

      const originalConv = await controller.getConversation(conv.id);

      // Simulate system restart
      const newController = new AgentController(
        new StateMachine(),
        personaManager,
        nlpExtractor,
        signalDetector,
        scamClassifier,
        riskScorer,
        repository
      );

      await newController.recoverConversations();

      // Verify messages are restored with Date objects
      const recovered = await newController.getConversation(conv.id);

      expect(recovered.messages.length).toBe(originalConv.messages.length);
      
      for (let i = 0; i < recovered.messages.length; i++) {
        expect(recovered.messages[i].timestamp).toBeInstanceOf(Date);
        expect(recovered.messages[i].content).toBe(originalConv.messages[i].content);
        expect(recovered.messages[i].sender).toBe(originalConv.messages[i].sender);
      }

      await newController.shutdown();
    });

    it('should restore extracted entities with metadata', async () => {
      // Create a conversation with entity extraction
      const conv = await controller.createConversation('Call me at 555-1234');
      await controller.processMessage(conv.id, 'My email is scammer@example.com');

      const originalConv = await controller.getConversation(conv.id);

      // Simulate system restart
      const newController = new AgentController(
        new StateMachine(),
        personaManager,
        nlpExtractor,
        signalDetector,
        scamClassifier,
        riskScorer,
        repository
      );

      await newController.recoverConversations();

      // Verify entities are restored
      const recovered = await newController.getConversation(conv.id);

      expect(recovered.extractedEntities.length).toBe(originalConv.extractedEntities.length);
      
      for (let i = 0; i < recovered.extractedEntities.length; i++) {
        expect(recovered.extractedEntities[i].type).toBe(originalConv.extractedEntities[i].type);
        expect(recovered.extractedEntities[i].value).toBe(originalConv.extractedEntities[i].value);
        expect(recovered.extractedEntities[i].confidence).toBe(originalConv.extractedEntities[i].confidence);
        expect(recovered.extractedEntities[i].timestamp).toBeInstanceOf(Date);
      }

      await newController.shutdown();
    });

    it('should restore scam signals', async () => {
      // Create a conversation with scam signals
      const conv = await controller.createConversation('URGENT! Act now!');
      await controller.processMessage(conv.id, 'Send money immediately!');

      const originalConv = await controller.getConversation(conv.id);

      // Simulate system restart
      const newController = new AgentController(
        new StateMachine(),
        personaManager,
        nlpExtractor,
        signalDetector,
        scamClassifier,
        riskScorer,
        repository
      );

      await newController.recoverConversations();

      // Verify signals are restored
      const recovered = await newController.getConversation(conv.id);

      expect(recovered.scamSignals.length).toBe(originalConv.scamSignals.length);
      
      for (let i = 0; i < recovered.scamSignals.length; i++) {
        expect(recovered.scamSignals[i].type).toBe(originalConv.scamSignals[i].type);
        expect(recovered.scamSignals[i].confidence).toBe(originalConv.scamSignals[i].confidence);
        expect(recovered.scamSignals[i].timestamp).toBeInstanceOf(Date);
      }

      await newController.shutdown();
    });

    it('should not recover terminated conversations', async () => {
      // Create and terminate a conversation
      const conv = await controller.createConversation('Hello!');
      await controller.terminateConversation(conv.id);

      // Simulate system restart
      const newController = new AgentController(
        new StateMachine(),
        personaManager,
        nlpExtractor,
        signalDetector,
        scamClassifier,
        riskScorer,
        repository
      );

      // Recover conversations
      const recoveredCount = await newController.recoverConversations();

      // Terminated conversations should not be recovered
      expect(recoveredCount).toBe(0);
      expect(newController.getAgentPoolSize()).toBe(0);

      await newController.shutdown();
    });

    it('should handle empty storage gracefully', async () => {
      // Create controller with empty repository
      const newController = new AgentController(
        new StateMachine(),
        personaManager,
        nlpExtractor,
        signalDetector,
        scamClassifier,
        riskScorer,
        new InMemoryConversationRepository()
      );

      // Recover conversations
      const recoveredCount = await newController.recoverConversations();

      expect(recoveredCount).toBe(0);
      expect(newController.getAgentPoolSize()).toBe(0);

      await newController.shutdown();
    });

    it('should throw error when no repository configured', async () => {
      // Create controller without repository
      const controllerNoRepo = new AgentController(
        stateMachine,
        personaManager,
        nlpExtractor,
        signalDetector,
        scamClassifier,
        riskScorer
      );

      // Attempt to recover should throw
      await expect(controllerNoRepo.recoverConversations()).rejects.toThrow(
        'Cannot recover conversations: no repository configured'
      );

      await controllerNoRepo.shutdown();
    });

    it('should continue recovery even if one conversation fails', async () => {
      // Create conversations
      const conv1 = await controller.createConversation('Hello!');
      await controller.createConversation('Test!');

      // Corrupt one conversation in storage
      const corruptedConv = await repository.findById(conv1.id);
      if (corruptedConv) {
        // @ts-ignore - Intentionally corrupt the data
        corruptedConv.state = 'INVALID_STATE';
        await repository.update(corruptedConv);
      }

      // Simulate system restart
      const newController = new AgentController(
        new StateMachine(),
        personaManager,
        nlpExtractor,
        signalDetector,
        scamClassifier,
        riskScorer,
        repository
      );

      // Recover conversations - should recover at least one
      const recoveredCount = await newController.recoverConversations();

      // At least one conversation should be recovered
      expect(recoveredCount).toBeGreaterThanOrEqual(1);

      await newController.shutdown();
    });
  });

  describe('recoverConversation', () => {
    it('should recover a specific conversation by ID', async () => {
      // Create a conversation
      const conv = await controller.createConversation('Hello!');
      await controller.processMessage(conv.id, 'Test message');

      // Simulate system restart
      const newController = new AgentController(
        new StateMachine(),
        personaManager,
        nlpExtractor,
        signalDetector,
        scamClassifier,
        riskScorer,
        repository
      );

      // Recover specific conversation
      const recovered = await newController.recoverConversation(conv.id);

      expect(recovered).not.toBeNull();
      expect(recovered!.id).toBe(conv.id);
      expect(newController.getAgentPoolSize()).toBe(1);

      await newController.shutdown();
    });

    it('should return null for non-existent conversation', async () => {
      const recovered = await controller.recoverConversation('non-existent-id');

      expect(recovered).toBeNull();
    });

    it('should return existing conversation if already in memory', async () => {
      // Create a conversation
      const conv = await controller.createConversation('Hello!');

      // Recover same conversation (already in memory)
      const recovered = await controller.recoverConversation(conv.id);

      expect(recovered).not.toBeNull();
      expect(recovered!.id).toBe(conv.id);
      expect(controller.getAgentPoolSize()).toBe(1); // Should not duplicate
    });

    it('should throw error when no repository configured', async () => {
      // Create controller without repository
      const controllerNoRepo = new AgentController(
        stateMachine,
        personaManager,
        nlpExtractor,
        signalDetector,
        scamClassifier,
        riskScorer
      );

      await expect(controllerNoRepo.recoverConversation('test-id')).rejects.toThrow(
        'Cannot recover conversation: no repository configured'
      );

      await controllerNoRepo.shutdown();
    });
  });

  describe('restoreAgent', () => {
    it('should restore agent from conversation state', async () => {
      // Create a conversation
      const conv = await controller.createConversation('Hello!');
      await controller.processMessage(conv.id, 'Test message');

      const originalConv = await controller.getConversation(conv.id);

      // Create new controller
      const newController = new AgentController(
        new StateMachine(),
        personaManager,
        nlpExtractor,
        signalDetector,
        scamClassifier,
        riskScorer,
        repository
      );

      // Restore agent directly
      await newController.restoreAgent(originalConv);

      // Verify agent is restored
      const restored = await newController.getConversation(conv.id);
      expect(restored.id).toBe(originalConv.id);
      expect(restored.state).toBe(originalConv.state);

      await newController.shutdown();
    });

    it('should throw error if agent already exists', async () => {
      // Create a conversation
      const conv = await controller.createConversation('Hello!');
      const originalConv = await controller.getConversation(conv.id);

      // Attempt to restore same agent again
      await expect(controller.restoreAgent(originalConv)).rejects.toThrow(
        `Agent already exists for conversation ${conv.id}`
      );
    });

    it('should restore agent with all metadata intact', async () => {
      // Create a conversation with rich metadata
      const conv = await controller.createConversation('Hello!');
      await controller.processMessage(conv.id, 'Call 555-1234');
      await controller.processMessage(conv.id, 'URGENT!');

      const originalConv = await controller.getConversation(conv.id);

      // Create new controller and restore
      const newController = new AgentController(
        new StateMachine(),
        personaManager,
        nlpExtractor,
        signalDetector,
        scamClassifier,
        riskScorer,
        repository
      );

      await newController.restoreAgent(originalConv);

      const restored = await newController.getConversation(conv.id);

      // Verify metadata
      expect(restored.metadata.initialMessage).toBe(originalConv.metadata.initialMessage);
      expect(restored.metadata.messageCount).toBe(originalConv.metadata.messageCount);
      expect(restored.metadata.duration).toBe(originalConv.metadata.duration);
      expect(restored.metadata.stateHistory.length).toBe(originalConv.metadata.stateHistory.length);

      await newController.shutdown();
    });
  });

  describe('conversation persistence during operations', () => {
    it('should persist conversation on creation', async () => {
      const conv = await controller.createConversation('Hello!');

      // Verify conversation is in repository
      const stored = await repository.findById(conv.id);
      expect(stored).not.toBeNull();
      expect(stored!.id).toBe(conv.id);
    });

    it('should update conversation in repository after processing message', async () => {
      const conv = await controller.createConversation('Hello!');
      
      // Get initial message count
      const initial = await repository.findById(conv.id);
      const initialMessageCount = initial!.messages.length;

      // Process a message
      await controller.processMessage(conv.id, 'Test message');

      // Verify repository is updated
      const updated = await repository.findById(conv.id);
      expect(updated!.messages.length).toBeGreaterThan(initialMessageCount);
    });

    it('should persist final state on termination', async () => {
      const conv = await controller.createConversation('Hello!');
      await controller.terminateConversation(conv.id);

      // Verify terminated state is persisted
      const stored = await repository.findById(conv.id);
      expect(stored).not.toBeNull();
      expect(stored!.state).toBe(ConversationState.TERMINATION);
    });
  });

  describe('integration: full recovery workflow', () => {
    it('should support full conversation lifecycle across restarts', async () => {
      // Phase 1: Create and interact with conversation
      const conv = await controller.createConversation('Hello!');
      await controller.processMessage(conv.id, 'I need help');
      await controller.processMessage(conv.id, 'Call me at 555-1234');

      const phase1Conv = await controller.getConversation(conv.id);
      const phase1MessageCount = phase1Conv.messages.length;

      // Phase 2: Simulate restart and recover
      const controller2 = new AgentController(
        new StateMachine(),
        personaManager,
        nlpExtractor,
        signalDetector,
        scamClassifier,
        riskScorer,
        repository
      );

      await controller2.recoverConversations();

      // Continue conversation
      await controller2.processMessage(conv.id, 'Send money now!');

      const phase2Conv = await controller2.getConversation(conv.id);
      expect(phase2Conv.messages.length).toBeGreaterThan(phase1MessageCount);

      // Phase 3: Another restart and final recovery
      const controller3 = new AgentController(
        new StateMachine(),
        personaManager,
        nlpExtractor,
        signalDetector,
        scamClassifier,
        riskScorer,
        repository
      );

      await controller3.recoverConversations();

      // Verify full conversation is intact
      const finalConv = await controller3.getConversation(conv.id);
      expect(finalConv.id).toBe(conv.id);
      expect(finalConv.messages.length).toBe(phase2Conv.messages.length);

      // Cleanup
      await controller2.shutdown();
      await controller3.shutdown();
    });
  });
});
