# Vault Marketplace Technical Roadmap

## Vision
Enable users to purchase slabs from the vault using a split payment model: part SOL + part SVF token (which gets burned). This transforms the site from a static marketing site to a full Web3 e-commerce platform.

## Architecture Overview

### Core Components
1. **Smart Contracts** - Handle token burning and slab ownership transfer
2. **Backend API** - Transaction processing and inventory management
3. **Database** - Track inventory, transactions, and user data
4. **Frontend** - Marketplace UI, wallet integration, checkout flow
5. **Admin Dashboard** - Manage listings, pricing, and transactions

---

## Phase 0: Automated Data Integration (Week 1)

### 0.1 External API Integration
**Goal**: Eliminate manual JSON updates by pulling data directly from credible sources

**Data Sources**:
- **Vaulted.id**: https://vaulted.id/u/SlabVaultFi
  - Slab inventory, images, grades, estimated values
  - Provenance photos and serials
  - Real-time vault updates

- **Collector Crypt**:
  - Treasury account: https://collectorcrypt.com/account/2oRZe7z9Jx3rpoUWuidjGhpX9mxxhtps2JqQtdxLfHwg
  - Deployer wallet: https://collectorcrypt.com/account/CWqc6DQhHxdnDSwrjG3LGnyWPQ3dRNfCY5umvTj8NBE3
  - Gacha pull history, costs, outcomes
  - Live pull data during streams

- **Solana Wallet Queries** (backup):
  - Deployer wallet: CWqc6DQhHxdnDSwrjG3LGnyWPQ3dRNfCY5umvTj8NBE3
  - Multi-sig treasury: 2oRZe7z9Jx3rpoUWuidjGhpX9mxxhtps2JqQtdxLfHwg
  - On-chain token holdings, transaction history

### 0.2 Implementation Approach

**Option A: API Integration** (Preferred)
- Contact Vaulted.id and Collector Crypt for API access
- Build webhook listeners for real-time updates
- Cache data to reduce API calls
- Fallback to manual JSON if APIs unavailable

**Option B: Web Scraping** (Fallback)
- Build scrapers for public profile pages
- Respect rate limits and robots.txt
- Schedule regular data syncs
- Handle page structure changes gracefully

**Option C: Hybrid Approach** (Recommended)
- Use APIs where available
- Web scraping for sources without APIs
- Wallet queries for on-chain verification
- Manual JSON as emergency fallback

### 0.3 Data Sync Architecture
```
External Sources → Data Sync Service → Database → Frontend
                    ↓ (cached)
                 Redis Cache
```

**Sync Service Features**:
- Scheduled syncs (every 15-30 minutes)
- Webhook support for real-time updates
- Data validation and conflict resolution
- Error handling and retry logic
- Monitoring and alerting

### 0.4 Data Mapping
**Vaulted.id → slabs.json**:
- Slab name, grade, image URL
- Estimated value, acquisition date
- Vaulted URL, Collectr URL (if available)

**Collector Crypt → pulls.json**:
- Pull date, source (gacha partner)
- Cost (USD), outcome (USD)
- Clip URL, summary

**Wallet Queries → site.json**:
- Contract addresses (from treasury)
- Token holdings and balances
- Recent transactions

### 0.5 Benefits
- **Zero manual updates** - data stays in sync automatically
- **Real-time accuracy** - reflects actual vault state
- **Reduced errors** - no typos or outdated information
- **Scalability** - handles growing inventory effortlessly
- **Transparency** - data matches on-chain reality

---

## Phase 1: Foundation & Infrastructure (Weeks 2-3)

### 1.1 Database Setup
**Technology**: PostgreSQL (via Supabase or self-hosted)

**Schema Design**:
```sql
-- Slabs table (extend existing JSON structure)
CREATE TABLE slabs (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  grade TEXT NOT NULL,
  estimated_value_usd DECIMAL,
  acquired_at DATE,
  image_url TEXT,
  vaulted_url TEXT,
  collectr_url TEXT,
  status ENUM('available', 'reserved', 'sold', 'not_for_sale') DEFAULT 'available',
  sol_price DECIMAL NOT NULL,
  svf_price DECIMAL NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Transactions table
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  slab_id UUID REFERENCES slabs(id),
  buyer_wallet TEXT NOT NULL,
  sol_amount DECIMAL NOT NULL,
  svf_amount DECIMAL NOT NULL,
  total_usd_value DECIMAL,
  status ENUM('pending', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
  transaction_signature TEXT,
  burn_signature TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Users table (optional, for tracking)
CREATE TABLE users (
  wallet_address TEXT PRIMARY KEY,
  first_purchase_at TIMESTAMP,
  total_purchases INT DEFAULT 0,
  total_spent_usd DECIMAL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Pricing history
CREATE TABLE pricing_history (
  id UUID PRIMARY KEY,
  slab_id UUID REFERENCES slabs(id),
  sol_price DECIMAL NOT NULL,
  svf_price DECIMAL NOT NULL,
  changed_at TIMESTAMP DEFAULT NOW()
);
```

### 1.2 Backend API Setup
**Technology**: Next.js API Routes or separate Node.js/Express server

**Required Endpoints**:
```
GET  /api/marketplace/slabs          - List purchasable slabs
GET  /api/marketplace/slabs/:id      - Get slab details
POST /api/marketplace/reserve        - Reserve slab for purchase
POST /api/marketplace/checkout       - Initiate purchase
GET  /api/marketplace/transactions   - Get user transactions
GET  /api/marketplace/status/:id     - Get transaction status
POST /api/admin/slabs                - Admin: Create/update slab listing
POST /api/admin/pricing              - Admin: Update pricing
GET  /api/admin/transactions         - Admin: View all transactions
```

### 1.3 Infrastructure Setup
- PostgreSQL database
- Redis for caching (optional)
- Blockchain RPC provider (Helius, QuickNode, or similar)
- Monitoring (Sentry for errors, Vercel Analytics)
- Environment variables configuration

---

## Phase 2: Smart Contract Development (Weeks 3-4)

### 2.1 Token Burn Contract
**Purpose**: Burn SVF tokens as part of purchase

**Key Functions**:
```solidity
// Pseudo-code for Solana program
function burnTokens(
    amount: u64,
    authority: Pubkey
) -> Result<()>

function getBurnAuthority(
    wallet: Pubkey
) -> Result<Pubkey>
```

### 2.2 Escrow/Purchase Contract
**Purpose**: Handle split payments and ownership transfer

**Key Functions**:
```solidity
// Pseudo-code
function initiatePurchase(
    slabId: string,
    buyer: Pubkey,
    solAmount: u64,
    svfAmount: u64
) -> Result<()>

function completePurchase(
    purchaseId: string,
    transferSignature: string,
    burnSignature: string
) -> Result<()>

function cancelPurchase(
    purchaseId: string
) -> Result<()>

function getPurchaseStatus(
    purchaseId: string
) -> Result<PurchaseStatus>
```

### 2.3 Contract Security
- Audit by professional firm (CertiK, Halborn, etc.)
- Implement rate limiting
- Add emergency pause mechanism
- Testnet deployment and thorough testing
- Mainnet deployment with verification

---

## Phase 3: Wallet Integration (Week 5)

### 3.1 Wallet Connection
**Technology**: @solana/wallet-adapter-react

**Features**:
- Connect wallet button in header
- Auto-reconnect on page load
- Wallet switch detection
- Balance display (SOL and SVF)
- Network detection (ensure Solana mainnet)

### 3.2 Authentication
- Wallet signature for user verification
- Session management (JWT or similar)
- Protected API routes
- Rate limiting per wallet address

---

## Phase 4: Frontend Marketplace (Weeks 6-7)

### 4.1 Marketplace Page
**Route**: `/marketplace`

**Features**:
- Grid of purchasable slabs
- Filter by grade, price range
- Sort by price, date added
- Search functionality
- Slab detail modal/page

### 4.2 Slab Detail Page
**Route**: `/marketplace/slab/:id`

**Features**:
- Large image display
- Grade and details
- Pricing breakdown (SOL + SVF)
- Purchase button
- Transaction history for this slab
- Related slabs

### 4.3 Checkout Flow
**Route**: `/marketplace/checkout/:id`

**Features**:
- Review purchase details
- Wallet balance check
- Approve transactions (SOL transfer + SVF burn)
- Transaction progress tracking
- Success/failure states
- Receipt generation

### 4.4 Transaction History
**Route**: `/account/transactions`

**Features**:
- List of user's purchases
- Filter by status
- View transaction details
- Links to blockchain explorer

---

## Phase 5: Admin Dashboard (Week 8)

### 5.1 Dashboard Overview
**Route**: `/admin`

**Features**:
- Total sales metrics
- Active transactions
- Inventory status
- Recent activity

### 5.2 Slab Management
**Route**: `/admin/slabs`

**Features**:
- Add new slab to marketplace
- Edit existing listings
- Set pricing (SOL + SVF split)
- Mark as available/reserved/sold
- Bulk actions

### 5.3 Transaction Management
**Route**: `/admin/transactions`

**Features**:
- View all transactions
- Filter by status/date
- Manual intervention for failed transactions
- Export data

### 5.4 Pricing Management
**Route**: `/admin/pricing`

**Features**:
- Update pricing rules
- Set default split ratios
- View pricing history
- Bulk price updates

---

## Phase 6: Security & Testing (Week 9)

### 6.1 Security Measures
- Smart contract audit
- API rate limiting
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF protection
- Secure headers (CSP, HSTS, etc.)
- Environment variable management
- Secrets management

### 6.2 Testing
- Unit tests for smart contracts
- Integration tests for API
- E2E tests with Playwright
- Load testing for high traffic
- Security penetration testing
- Testnet deployment verification

---

## Phase 7: Deployment & Launch (Week 10)

### 7.1 Pre-Launch Checklist
- All tests passing
- Smart contracts audited and deployed
- Database migrations run
- API endpoints tested
- Frontend features tested
- Monitoring configured
- Error tracking configured
- Backup systems in place
- Documentation complete

### 7.2 Launch Strategy
- Soft launch with limited inventory
- Monitor transactions closely
- Gather user feedback
- Fix any issues
- Full launch

---

## Technical Stack Summary

### Frontend
- Next.js 16.2.6 (App Router)
- React 19
- Tailwind CSS v4
- @solana/wallet-adapter-react
- @solana/web3.js

### Backend
- Next.js API Routes (or separate Node.js server)
- PostgreSQL
- Prisma ORM (recommended)
- Redis (optional, for caching)

### Blockchain
- Solana
- Anchor Framework (for smart contracts)
- Helius/QuickNode RPC

### Infrastructure
- Vercel (frontend)
- Supabase or Railway (database)
- Sentry (error tracking)
- Vercel Analytics (monitoring)

---

## Key Considerations

### Pricing Model
- Determine SOL:SVF split ratio per slab
- Consider dynamic pricing based on market conditions
- Implement minimum/maximum price limits
- Allow admin override for special cases

### Token Economics
- Burn mechanism reduces SVF supply
- Consider burn rate impact on token price
- May need to adjust pricing over time
- Track burn metrics publicly

### User Experience
- Clear communication of split payment model
- Real-time transaction status updates
- Helpful error messages
- Smooth wallet connection flow
- Mobile-responsive design

### Legal & Compliance
- Terms of service for marketplace
- Disclaimer about token burn
- KYC/AML considerations (if needed)
- Tax implications for users
- Jurisdiction-specific requirements

---

## Success Metrics

- Transaction success rate > 95%
- Average transaction time < 2 minutes
- User completion rate > 80%
- Zero critical security vulnerabilities
- Positive user feedback
- Increased SVF token burn rate
- Growth in vault value

---

## Next Steps

1. Review and approve this roadmap
2. Set up development environment
3. Begin Phase 1: Database & API setup
4. Weekly progress reviews
5. Adjust timeline as needed
