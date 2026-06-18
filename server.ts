import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;

interface Campaign {
  id: string;
  name: string;
  captains: {id: string, name: string}[];
  viceCaptains: {id: string, name: string}[];
}

interface BallotState {
  id: string; // 6 char token
  socketId: string;
  authorized: boolean;
  locked: boolean;
  hasVoted: boolean;
  category: string;
  campaign?: Campaign;
  cuId?: string;
  ended?: boolean;
}

interface Block {
  index: number;
  timestamp: number;
  previousHash: string;
  hash: string;
  data: {
    token: string;
    category: string;
    campaignId: string;
    captain: string;
    viceCaptain: string;
  };
}

const ballots = new Map<string, BallotState>();
let blockchain: Block[] = [];
let campaigns = new Map<string, Campaign>();
const activeControlUnits = new Set<string>();

const DB_FILE = path.join(__dirname, 'database.json');

function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      if (data.blockchain && data.blockchain.length > 0) {
        blockchain = data.blockchain;
      } else {
        createGenesisBlock();
      }
      if (data.campaigns) {
        data.campaigns.forEach((c: any) => campaigns.set(c[0], c[1]));
      }
    } else {
      createGenesisBlock();
    }
  } catch (e) {
    console.error("Failed to load db file", e);
    createGenesisBlock();
  }
}

function createGenesisBlock() {
  if (blockchain.length === 0) {
    blockchain.push({
      index: 0,
      timestamp: Date.now(),
      previousHash: "0",
      hash: crypto.createHash('sha256').update("0" + "0" + "genesis").digest('hex'),
      data: { token: 'genesis', category: '', campaignId: '', captain: '', viceCaptain: '' }
    });
  }
}

function saveDatabase() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify({
      blockchain,
      campaigns: Array.from(campaigns.entries())
    }, null, 2));
  } catch (e) {
    console.error("Failed to save db file", e);
  }
}

loadDatabase();

function createHash(index: number, timestamp: number, previousHash: string, data: any) {
  return crypto.createHash('sha256').update(index + timestamp + previousHash + JSON.stringify(data)).digest('hex');
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// API routes FIRST
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Vite middleware for development
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

io.on('connection', (socket) => {
  let userRole: 'ballot' | 'control_unit' | null = null;
  let myToken: string | null = null;

  // BALLOT EVENTS
  socket.on('register_ballot', (data: { category: string, token?: string }) => {
    userRole = 'ballot';
    
    if (data.token && ballots.has(data.token)) {
      myToken = data.token;
      const ballot = ballots.get(myToken)!;
      ballot.socketId = socket.id;
      ballots.set(myToken, ballot);
      socket.emit('ballot_registered', { token: myToken, state: ballot });
      io.emit('ballot_list_updated', Array.from(ballots.values()));
      return;
    }
    
    myToken = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 chars
    
    ballots.set(myToken, {
      id: myToken,
      socketId: socket.id,
      authorized: false,
      locked: true,
      hasVoted: false,
      category: data.category || 'Unknown',
    });
    
    socket.emit('ballot_registered', { token: myToken, state: ballots.get(myToken) });
    io.emit('ballot_list_updated', Array.from(ballots.values()));
  });

  socket.on('cast_vote', ({ token, captain, viceCaptain }) => {
    const ballot = ballots.get(token);
    if (!ballot || ballot.socketId !== socket.id) return;
    if (!ballot.authorized || ballot.locked || ballot.hasVoted) return;

    // Create block
    const previousBlock = blockchain[blockchain.length - 1];
    const data = { 
      token, 
      category: ballot.category,
      campaignId: ballot.campaign?.id || '',
      captain, 
      viceCaptain 
    };
    const hash = createHash(blockchain.length, Date.now(), previousBlock.hash, data);
    
    const newBlock: Block = {
      index: blockchain.length,
      timestamp: Date.now(),
      previousHash: previousBlock.hash,
      hash,
      data
    };
    
    blockchain.push(newBlock);
    saveDatabase();

    // Lock ballot
    ballot.locked = true;
    ballot.hasVoted = true;
    ballot.authorized = false;
    // ballot.campaign = undefined; // Might be useful to clear it? No, keep it so it shows.
    ballots.set(token, ballot);

    socket.emit('vote_success', { hash });
    
    // Notify control units
    io.emit('ballot_updated', ballot);
    io.emit('new_vote_recorded', newBlock);
    io.emit('ballot_list_updated', Array.from(ballots.values()));
  });

  // CONTROL UNIT EVENTS
  socket.on('register_control_unit', (cuId?: string) => {
    userRole = 'control_unit';
    activeControlUnits.add(socket.id);
    io.emit('active_cu_count', activeControlUnits.size);
    
    socket.emit('control_unit_registered', { 
      ballots: Array.from(ballots.values()),
      blockchain: blockchain,
      campaigns: Array.from(campaigns.values())
    });
  });

  socket.on('create_campaign', (campaign: Campaign) => {
    if (userRole !== 'control_unit') return;
    campaigns.set(campaign.id, campaign);
    saveDatabase();
    io.emit('campaigns_updated', Array.from(campaigns.values()));
  });

  socket.on('authorize_ballot', ({ token, campaignId, cuId }: { token: string, campaignId: string, cuId: string }) => {
    if (userRole !== 'control_unit') return;
    const ballot = ballots.get(token);
    const campaign = campaigns.get(campaignId);
    if (!ballot) {
      socket.emit('error_message', 'Invalid token. Ballot not found.');
      return;
    }
    if (!campaign) {
      socket.emit('error_message', 'Please select a valid campaign.');
      return;
    }
    if (campaign.finished) {
      socket.emit('error_message', 'Cannot assign ballot to a finished campaign.');
      return;
    }
    
    ballot.authorized = true;
    ballot.locked = false;
    ballot.hasVoted = false;
    ballot.campaign = campaign;
    ballot.cuId = cuId;
    ballots.set(token, ballot);
    
    io.to(ballot.socketId).emit('ballot_authorized', ballot);
    io.emit('ballot_list_updated', Array.from(ballots.values()));
  });

  socket.on('unlock_ballot', (token: string) => {
    if (userRole !== 'control_unit') return;
    const ballot = ballots.get(token);
    if (!ballot) return;
    if (!ballot.campaign) {
      socket.emit('error_message', 'Cannot unlock ballot without assigned campaign.');
      return;
    }
    if (ballot.campaign.finished) {
      socket.emit('error_message', 'Cannot unlock ballot for a finished campaign.');
      return;
    }

    ballot.authorized = true;
    ballot.locked = false;
    ballot.hasVoted = false;
    ballots.set(token, ballot);

    io.to(ballot.socketId).emit('ballot_unlocked', ballot);
    io.emit('ballot_list_updated', Array.from(ballots.values()));
  });

  socket.on('finish_campaign', async ({ campaignId, accessToken }: { campaignId: string, accessToken: string }) => {
    if (userRole !== 'control_unit') return;
    const campaign = campaigns.get(campaignId);
    if (!campaign) return;

    // Calculate results
    const votes = blockchain.filter(b => b.data.campaignId === campaignId);
    const captainCounts: Record<string, number> = {};
    const viceCaptainCounts: Record<string, number> = {};
    const categoryVotes: Record<string, { captainVotes: Record<string, number>; viceCaptainVotes: Record<string, number> }> = {};
    
    votes.forEach(vote => {
      const cName = campaign.captains.find(c => c.id === vote.data.captain)?.name || vote.data.captain;
      const vcName = campaign.viceCaptains.find(c => c.id === vote.data.viceCaptain)?.name || vote.data.viceCaptain;
      captainCounts[cName] = (captainCounts[cName] || 0) + 1;
      viceCaptainCounts[vcName] = (viceCaptainCounts[vcName] || 0) + 1;
      
      const category = vote.data.category || 'Unknown';
      if (!categoryVotes[category]) {
        categoryVotes[category] = { captainVotes: {}, viceCaptainVotes: {} };
      }
      categoryVotes[category].captainVotes[cName] = (categoryVotes[category].captainVotes[cName] || 0) + 1;
      categoryVotes[category].viceCaptainVotes[vcName] = (categoryVotes[category].viceCaptainVotes[vcName] || 0) + 1;
    });

    campaign.finished = true;
    campaign.results = {
      totalVotes: votes.length,
      captainVotes: captainCounts,
      viceCaptainVotes: viceCaptainCounts,
      categoryVotes
    };

    campaigns.set(campaignId, campaign);
    saveDatabase();
    io.emit('campaigns_updated', Array.from(campaigns.values()));

    console.log('\n\n=== ELECTION RESULTS ===');
    console.log(`Campaign: ${campaign.name} (${campaignId})`);
    console.log('Captain Votes:', captainCounts);
    console.log('Vice Captain Votes:', viceCaptainCounts);
    console.log('========================\n');

    // Lock all active ballots for this campaign
    for (const [token, ballot] of ballots.entries()) {
      if (ballot.campaign?.id === campaignId) {
        ballot.locked = true;
        ballot.authorized = false;
        ballots.set(token, ballot);
        io.to(ballot.socketId).emit('ballot_updated', ballot);
      }
    }
    
    io.emit('ballot_list_updated', Array.from(ballots.values()));

    if (accessToken) {
       try {
         const emailLines = [];
         emailLines.push('To: bhandaridhruvin7@gmail.com');
         emailLines.push('Content-type: text/plain;charset=utf-8');
         emailLines.push('MIME-Version: 1.0');
         emailLines.push(`Subject: Election Results: ${campaign.name}`);
         emailLines.push('');
         emailLines.push(`Voting has concluded for the campaign: ${campaign.name}`);
         emailLines.push(`Total votes recorded: ${votes.length}`);
         emailLines.push(``);
         emailLines.push(`Captain Results:`);
         for (const [name, count] of Object.entries(captainCounts)) {
            emailLines.push(`- ${name}: ${count} vote(s)`);
         }
         emailLines.push(``);
         emailLines.push(`Vice-Captain Results:`);
         for (const [name, count] of Object.entries(viceCaptainCounts)) {
            emailLines.push(`- ${name}: ${count} vote(s)`);
         }
         
         const emailText = emailLines.join('\r\n');
         const raw = Buffer.from(emailText).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
         
         const result = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
           method: 'POST',
           headers: {
             'Authorization': `Bearer ${accessToken}`,
             'Content-Type': 'application/json'
           },
           body: JSON.stringify({ raw })
         });
         if (!result.ok) {
           console.error('Failed to send email:', await result.text());
         } else {
           console.log('Email sent successfully via Gmail API!');
         }
       } catch (e) {
         console.error('Error sending email via Gmail API:', e);
       }
    }
  });

  socket.on('end_ballot', (token: string) => {
    if (userRole !== 'control_unit') return;
    const ballot = ballots.get(token);
    if (!ballot) return;

    ballot.ended = true;
    ballot.locked = true;
    ballot.authorized = false;
    ballots.set(token, ballot);
    
    io.to(ballot.socketId).emit('ballot_updated', ballot);
    io.emit('ballot_list_updated', Array.from(ballots.values()));
  });

  socket.on('delete_campaign', (campaignId: string) => {
    if (userRole !== 'control_unit') return;
    if (campaigns.has(campaignId)) {
      campaigns.delete(campaignId);
      saveDatabase();
      io.emit('campaigns_updated', Array.from(campaigns.values()));
    }
  });

  socket.on('disconnect', () => {
    if (userRole === 'control_unit') {
      activeControlUnits.delete(socket.id);
      io.emit('active_cu_count', activeControlUnits.size);
    }

    if (userRole === 'ballot' && myToken) {
      // Keep ballot in memory so it can re-connect
      // but maybe mark it as offline? For now we just don't delete it
      // io.emit('ballot_list_updated', Array.from(ballots.values()));
    }
  });
});

setupVite().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
});
