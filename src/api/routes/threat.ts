/**
 * Threat Intelligence API Routes
 * Provides threat intelligence data for security analysis
 */

import { Router } from 'express';

export function createThreatRoutes(): Router {
  const router = Router();

  // Mock threat intelligence database
  const threatDB = {
    phones: {
      '+918005550192': {
        phone: '+918005550192',
        risk_score: 93,
        linked_accounts: 4,
        scam_type: 'IRS Fraud',
        first_seen: '2026-02-15',
        last_seen: '2026-03-06',
        total_scams: 12,
        linked_entities: ['irs-scam-ring-01', 'payment-id-7734521890'],
        countries: ['US', 'IN'],
        status: 'active'
      },
      '+918885550847': {
        phone: '+918885550847',
        risk_score: 89,
        linked_accounts: 3,
        scam_type: 'Tech Support',
        first_seen: '2026-01-20',
        last_seen: '2026-03-05',
        total_scams: 8,
        linked_entities: ['microsoft-scam-network', 'support-microsoft-help.net'],
        countries: ['US', 'PK'],
        status: 'active'
      }
    },
    entities: [
      {
        id: 'ent-001',
        type: 'phone_number',
        value: '+918005550192',
        risk_score: 93,
        linked_to: ['ent-002', 'ent-003'],
        scam_count: 12
      },
      {
        id: 'ent-002',
        type: 'payment_id',
        value: '7734521890',
        risk_score: 87,
        linked_to: ['ent-001', 'ent-004'],
        scam_count: 15
      },
      {
        id: 'ent-003',
        type: 'url',
        value: 'secure-bankofamerica-verify.com',
        risk_score: 95,
        linked_to: ['ent-001', 'ent-005'],
        scam_count: 23
      },
      {
        id: 'ent-004',
        type: 'email',
        value: 'lottery-claims@prize-notification.com',
        risk_score: 91,
        linked_to: ['ent-002'],
        scam_count: 18
      },
      {
        id: 'ent-005',
        type: 'organization',
        value: 'Bank of America (fake)',
        risk_score: 88,
        linked_to: ['ent-003'],
        scam_count: 31
      }
    ],
    networks: [
      {
        id: 'network-001',
        name: 'IRS Scam Ring',
        entities: 8,
        total_scams: 47,
        risk_score: 94,
        active_since: '2025-11-12',
        countries: ['US', 'IN', 'PK'],
        estimated_victims: 230,
        estimated_loss: 1247000
      },
      {
        id: 'network-002',
        name: 'Tech Support Fraud Network',
        entities: 12,
        total_scams: 63,
        risk_score: 89,
        active_since: '2025-09-03',
        countries: ['US', 'IN'],
        estimated_victims: 340,
        estimated_loss: 892000
      },
      {
        id: 'network-003',
        name: 'Romance Scam Syndicate',
        entities: 15,
        total_scams: 89,
        risk_score: 92,
        active_since: '2025-07-21',
        countries: ['NG', 'GH', 'US'],
        estimated_victims: 156,
        estimated_loss: 2340000
      }
    ]
  };

  /**
   * GET /api/v1/threat/phone/:number
   * Get threat intelligence for a phone number
   */
  router.get('/phone/:number', (req, res): void => {
    const { number } = req.params;
    const threat = threatDB.phones[number as keyof typeof threatDB.phones];

    if (!threat) {
      res.status(404).json({
        error: 'Phone number not found in threat database',
        searched: number,
        suggestion: 'This number may be clean or not yet analyzed'
      });
      return;
    }

    res.json({
      success: true,
      data: threat,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * GET /api/v1/threat/entities
   * Get all known threat entities and their relationships
   */
  router.get('/entities', (_req, res): void => {
    res.json({
      success: true,
      total: threatDB.entities.length,
      entities: threatDB.entities,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * GET /api/v1/threat/networks
   * Get known scam networks
   */
  router.get('/networks', (_req, res): void => {
    res.json({
      success: true,
      total: threatDB.networks.length,
      networks: threatDB.networks,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * GET /api/v1/threat/risk-score/:entity
   * Get risk score for any entity
   */
  router.get('/risk-score/:entity', (req, res): void => {
    const { entity } = req.params;
    
    // Search across all entity types
    const found = threatDB.entities.find(e => 
      e.value.toLowerCase().includes(entity.toLowerCase())
    );

    if (!found) {
      res.json({
        success: true,
        entity,
        risk_score: 0,
        status: 'unknown',
        message: 'Entity not found in threat database'
      });
      return;
    }

    res.json({
      success: true,
      entity: found.value,
      type: found.type,
      risk_score: found.risk_score,
      linked_entities: found.linked_to.length,
      scam_count: found.scam_count,
      status: found.risk_score > 80 ? 'high_risk' : found.risk_score > 50 ? 'medium_risk' : 'low_risk',
      timestamp: new Date().toISOString()
    });
  });

  /**
   * GET /api/v1/threat/stats
   * Get overall threat intelligence statistics
   */
  router.get('/stats', (_req, res): void => {
    const totalEntities = threatDB.entities.length;
    const totalNetworks = threatDB.networks.length;
    const totalScams = threatDB.networks.reduce((sum, n) => sum + n.total_scams, 0);
    const totalVictims = threatDB.networks.reduce((sum, n) => sum + n.estimated_victims, 0);
    const totalLoss = threatDB.networks.reduce((sum, n) => sum + n.estimated_loss, 0);

    res.json({
      success: true,
      statistics: {
        total_entities: totalEntities,
        total_networks: totalNetworks,
        total_scams: totalScams,
        total_victims: totalVictims,
        total_loss_usd: totalLoss,
        avg_risk_score: Math.round(
          threatDB.entities.reduce((sum, e) => sum + e.risk_score, 0) / totalEntities
        ),
        high_risk_entities: threatDB.entities.filter(e => e.risk_score > 80).length,
        active_networks: threatDB.networks.filter(n => n.risk_score > 85).length
      },
      timestamp: new Date().toISOString()
    });
  });

  return router;
}
